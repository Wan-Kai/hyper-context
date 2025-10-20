import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type Flat = {
  id: string
  name: string
  type: 'file' | 'folder'
  parentId: string | null
  sortOrder: number
}
type Node = {
  id: string
  name: string
  type: 'file' | 'folder'
  parentId: string | null
  children?: Node[]
}

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapVersion(v: any) {
    return {
      id: v.id,
      version: v.version,
      isStable: v.isStable ?? undefined,
      createdAt: (v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt)).toISOString(),
      notes: v.notes ?? undefined,
      status: v.status
    }
  }

  async list(projectId: string) {
    const versions = await this.prisma.version.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        isStable: true,
        createdAt: true,
        notes: true,
        status: true
      }
    })
    return versions.map((v) => this.mapVersion(v))
  }

  async get(projectId: string, vid: string) {
    const v = await this.prisma.version.findFirst({
      where: { id: vid, projectId },
      select: {
        id: true,
        version: true,
        isStable: true,
        createdAt: true,
        notes: true,
        status: true,
        treeSnapshot: true
      }
    })
    if (!v) throw new NotFoundException('Not Found')
    return this.mapVersion(v)
  }

  async create(
    projectId: string,
    input?: { version?: string; notes?: string }
  ) {
    // Collect existing versions for uniqueness and semver-based suggestion
    const existing = await this.prisma.version.findMany({
      where: { projectId },
      select: { version: true }
    })
    const exists = new Set(existing.map((e) => e.version))
    const parse = (v?: string | null): [number, number, number] | null => {
      if (!v) return null
      const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v)
      if (!m) return null
      return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0]
    }
    const toStr = (t: [number, number, number]) => `${t[0]}.${t[1]}.${t[2]}`

    let ver = input?.version?.trim()
    if (!ver) {
      // Auto-generate: pick the max semver and bump patch; if none, start at 0.0.1
      let max: [number, number, number] | null = null
      for (const e of existing) {
        const t = parse(e.version)
        if (!t) continue
        if (
          !max ||
          t[0] > max[0] ||
          (t[0] === max[0] && (t[1] > max[1] || (t[1] === max[1] && t[2] > max[2])))
        ) {
          max = t
        }
      }
      let cand: [number, number, number] = max ? [max[0], max[1], max[2] + 1] : [0, 0, 1]
      while (exists.has(toStr(cand))) cand = [cand[0], cand[1], cand[2] + 1]
      ver = toStr(cand)
    } else if (exists.has(ver)) {
      // Do NOT auto-bump; directly reject on duplication as requested
      throw new BadRequestException('Version already exists')
    }
    let created
    try {
      created = await this.prisma.version.create({
        data: { projectId, version: ver, status: 'draft', notes: input?.notes ?? undefined },
        select: {
          id: true,
          version: true,
          isStable: true,
          createdAt: true,
          notes: true,
          status: true
        }
      })
    } catch (e: any) {
      // Duplicate (projectId, version) — make error message clear to client
      if (e && typeof e === 'object' && e.code === 'P2002') {
        throw new BadRequestException('Version already exists')
      }
      throw e
    }

    // Default initialization: clone contents from the latest PUBLISHED version; fallback to most recent with any content
    try {
      let src = await this.prisma.version.findFirst({
        where: { projectId, status: 'published' },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      })
      let srcId: string | null = src?.id || null
      if (!srcId) {
        // Fallback: most recent version that has any content
        const candidates = await this.prisma.version.findMany({
          where: { projectId, NOT: { id: created.id } },
          orderBy: { createdAt: 'desc' },
          select: { id: true }
        })
        for (const v of candidates) {
          const hasMain = await this.prisma.versionContent.findUnique({ where: { versionId: v.id }, select: { versionId: true } })
          if (hasMain) { srcId = v.id; break }
          const hasNode = await this.prisma.nodeContent.findFirst({ where: { versionId: v.id }, select: { versionId: true } })
          if (hasNode) { srcId = v.id; break }
        }
      }
      if (srcId) {
        // Clone main
        const baseMain = await this.prisma.versionContent.findUnique({ where: { versionId: srcId }, select: { main: true } })
        if (baseMain) {
          await this.prisma.versionContent.create({ data: { projectId, versionId: created.id, main: baseMain.main ?? '' } })
        }
        // Clone node contents (filter by existing nodes to avoid FK)
        const baseNodes = await this.prisma.nodeContent.findMany({ where: { versionId: srcId }, select: { nodeId: true, content: true } })
        if (baseNodes.length) {
          const existingNodes = await this.prisma.knowledgeNode.findMany({ where: { projectId }, select: { id: true } })
          const allowed = new Set(existingNodes.map((r) => r.id))
          const filtered = baseNodes.filter((n) => allowed.has(n.nodeId))
          if (filtered.length) {
            await this.prisma.nodeContent.createMany({
              data: filtered.map((n) => ({ versionId: created.id, nodeId: n.nodeId, content: n.content ?? '' }))
            })
          }
        }
      }
    } catch (e) {
      // Do not block creation if cloning fails; proceed with empty content
      console.error('[versions.create] clone-from-latest failed:', e)
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    return this.mapVersion(created)
  }

  private buildTree(rows: Flat[]): Node[] {
    const map = new Map<string, Node>()
    const roots: Node[] = []
    for (const r of rows)
      map.set(r.id, { id: r.id, name: r.name, type: r.type, parentId: r.parentId })
    for (const r of rows) {
      const node = map.get(r.id)!
      if (r.parentId && map.has(r.parentId)) {
        const p = map.get(r.parentId)!
        if (p.type === 'folder') {
          if (!p.children) p.children = []
          p.children.push(node)
        } else {
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    }
    return roots
  }

  private collectIds(root: Node): Set<string> {
    const s = new Set<string>()
    const dfs = (n: Node) => {
      s.add(n.id)
      if (n.children) for (const c of n.children) dfs(c)
    }
    dfs(root)
    return s
  }

  private filterTreeByRoot(
    tree: Node[],
    rootId?: string | null
  ): { tree: Node[]; ids: Set<string> } {
    if (!rootId) {
      const all = new Set<string>()
      for (const n of tree) for (const id of this.collectIds(n)) all.add(id)
      return { tree, ids: all }
    }
    // find node by DFS and return its subtree as root
    const stack = [...tree]
    while (stack.length) {
      const cur = stack.pop()!
      if (cur.id === rootId) {
        const ids = this.collectIds(cur)
        return { tree: [cur], ids }
      }
      if (cur.children) stack.push(...cur.children)
    }
    // not found → empty
    return { tree: [], ids: new Set() }
  }

  async publish(projectId: string, vid: string) {
    const v = await this.prisma.version.findFirst({ where: { id: vid, projectId } })
    if (!v) throw new NotFoundException('Not Found')
    if (v.status !== 'draft') throw new BadRequestException('Only draft can be published')
    const rows = await this.prisma.knowledgeNode.findMany({
      where: { projectId },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, type: true, parentId: true, sortOrder: true }
    })
    const tree = this.buildTree(rows as Flat[])
    await this.prisma.version.update({
      where: { id: vid },
      data: { status: 'published', treeSnapshot: JSON.stringify(tree) }
    })
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    const nv = await this.prisma.version.findUnique({
      where: { id: vid },
      select: {
        id: true,
        version: true,
        isStable: true,
        createdAt: true,
        notes: true,
        status: true
      }
    })
    return this.mapVersion(nv)
  }

  async markStable(projectId: string, vid: string) {
    const v = await this.prisma.version.findFirst({ where: { id: vid, projectId } })
    if (!v) throw new NotFoundException('Not Found')
    if (v.status !== 'published') throw new BadRequestException('Only published can be stable')

    // Flip stable flags and persist the stableVersionId on project so list endpoints
    // can select the stable version string efficiently and consistently.
    await this.prisma.$transaction([
      // Unmark previous stable versions
      this.prisma.version.updateMany({
        where: { projectId, isStable: true },
        data: { isStable: false }
      }),
      // Mark the target as stable
      this.prisma.version.update({ where: { id: vid }, data: { isStable: true } }),
      // Persist stableVersionId for the project and bump updatedAt
      this.prisma.project.update({ where: { id: projectId }, data: { stableVersionId: vid, mcpStatus: 'active', updatedAt: new Date() } })
    ])
  }

  async getStable(projectId: string) {
    const v = await this.prisma.version.findFirst({
      where: { projectId, isStable: true },
      select: {
        id: true,
        version: true,
        isStable: true,
        createdAt: true,
        notes: true,
        status: true
      }
    })
    if (!v) throw new NotFoundException('No stable version')
    return this.mapVersion(v)
  }

  async snapshot(projectId: string, vid: string, opts?: { rootId?: string | null }) {
    const v = await this.prisma.version.findFirst({
      where: { id: vid, projectId },
      select: {
        id: true,
        version: true,
        isStable: true,
        createdAt: true,
        notes: true,
        status: true,
        treeSnapshot: true
      }
    })
    if (!v) throw new NotFoundException('Not Found')

    let tree: Node[]
    if (v.status === 'published' && v.treeSnapshot) {
      try {
        tree = JSON.parse(v.treeSnapshot)
      } catch {
        tree = []
      }
    } else {
      const rows = await this.prisma.knowledgeNode.findMany({
        where: { projectId },
        orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
        select: { id: true, name: true, type: true, parentId: true, sortOrder: true }
      })
      tree = this.buildTree(rows as Flat[])
    }

    const { tree: scoped, ids } = this.filterTreeByRoot(tree, opts?.rootId ?? null)

    // contents
    const vc = await this.prisma.versionContent.findUnique({
      where: { versionId: vid },
      select: { main: true }
    })
    const main = vc?.main ?? ''

    // Load node contents only for included ids
    let nodes: Record<string, string> = {}
    if (ids.size) {
      const list = await this.prisma.nodeContent.findMany({
        where: { versionId: vid, nodeId: { in: Array.from(ids) } },
        select: { nodeId: true, content: true }
      })
      nodes = Object.fromEntries(list.map((r) => [r.nodeId, r.content ?? '']))
      // Ensure all file nodes have an entry
      for (const id of ids) if (!nodes[id]) nodes[id] = ''
    }

    return {
      version: this.mapVersion(v),
      tree: scoped,
      contents: { main, nodes }
    }
  }

  async stableSnapshot(projectId: string) {
    const v = await this.prisma.version.findFirst({ where: { projectId, isStable: true } })
    if (!v) throw new NotFoundException('No stable version')
    return this.snapshot(projectId, v.id)
  }

  // --- Stable preview text (system prompt) ---
  // Build the same preview text as front-end, for the stable version of a project
  async stablePreview(projectId: string): Promise<string> {
    const proj = await this.prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    const snap = await this.stableSnapshot(projectId)
    // Dynamically import shared builder (ESM) to avoid CJS/ESM interop issues
    const mod = await import('@hyper-context/shared')
    const buildPreview = (mod as any).buildPreview as (name: string, tree: any, contents: any) => string
    return buildPreview(proj?.name || '项目', (snap as any).tree, (snap as any).contents)
  }
}
