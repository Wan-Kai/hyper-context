import type { PrismaService } from '../prisma/prisma.service'

export type ResolvedName = {
  nodeId: string | null
  nodeName: string | null
  blockName: string | null
}

function parseNameSpec(spec: string): { segments: string[]; block: string | null } {
  const s = (spec || '').trim()
  if (!s) return { segments: [], block: null }
  const [pathPart, blockPart] = s.split('#', 2)
  const segments = pathPart
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
  const block = blockPart && blockPart.trim() ? blockPart.trim() : null
  return { segments, block }
}

type Row = { id: string; name: string; parentId: string | null; type: string }

async function resolveByPath(
  prisma: PrismaService,
  projectId: string,
  segments: string[],
): Promise<{ id: string; name: string } | null> {
  if (!segments.length) return null
  // Fetch once and walk in memory for stability and fewer round trips
  const rows = await prisma.knowledgeNode.findMany({
    where: { projectId },
    select: { id: true, name: true, parentId: true, type: true, sortOrder: true },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  })
  // Build children index
  const byParent = new Map<string | null, Row[]>()
  for (const r of rows) {
    const k = (r.parentId ?? null) as string | null
    if (!byParent.has(k)) byParent.set(k, [])
    byParent.get(k)!.push({ id: r.id, name: r.name, parentId: r.parentId, type: r.type })
  }
  let parentId: string | null = null
  let last: Row | null = null
  for (let i = 0; i < segments.length; i++) {
    const list: Row[] = byParent.get(parentId) || []
    const seg = segments[i]
    // Prefer exact match (case-sensitive); fallback to case-insensitive
    let found: Row | undefined = list.find((n) => n.name === seg)
    if (!found) found = list.find((n) => n.name.toLowerCase() === seg.toLowerCase())
    if (!found) return null
    // For intermediate segments, they must be folders
    if (i < segments.length - 1 && found.type !== 'folder') return null
    parentId = found.id
    last = found
  }
  if (!last || last.type !== 'file') return null
  return { id: last.id, name: last.name }
}

async function resolveByFileName(
  prisma: PrismaService,
  projectId: string,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const rows = await prisma.knowledgeNode.findMany({
    where: { projectId, type: 'file', name: { equals: name } },
    select: { id: true, name: true, sortOrder: true, parentId: true },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  })
  if (rows.length) return { id: rows[0].id, name: rows[0].name }
  // case-insensitive fallback
  const ci = await prisma.knowledgeNode.findMany({
    where: { projectId, type: 'file' },
    select: { id: true, name: true, sortOrder: true, parentId: true },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  })
  const found = ci.find((r) => r.name.toLowerCase() === name.toLowerCase())
  return found ? { id: found.id, name: found.name } : null
}

export async function resolveName(
  prisma: PrismaService,
  projectId: string,
  spec: string,
): Promise<ResolvedName> {
  const { segments, block } = parseNameSpec(spec)
  let node: { id: string; name: string } | null = null
  if (segments.length) node = await resolveByPath(prisma, projectId, segments)
  if (!node && segments.length === 1) node = await resolveByFileName(prisma, projectId, segments[0])
  return { nodeId: node?.id ?? null, nodeName: node?.name ?? null, blockName: block }
}
