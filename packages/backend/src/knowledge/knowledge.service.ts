import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

type FlatNode = { id: string; name: string; type: 'file'|'folder'; parentId: string | null; sortOrder: number }
type TreeNode = { id: string; name: string; type: 'file'|'folder'; parentId: string | null; children?: TreeNode[] }

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  private buildTree(rows: FlatNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>()
    const roots: TreeNode[] = []
    for (const r of rows) map.set(r.id, { id: r.id, name: r.name, type: r.type, parentId: r.parentId })
    for (const r of rows) {
      const node = map.get(r.id)!
      if (r.parentId && map.has(r.parentId)) {
        const p = map.get(r.parentId)!
        if (p.type === 'folder') {
          if (!p.children) p.children = []
          p.children.push(node)
        } else {
          // invalid parent type in DB; fallback to root
          roots.push(node)
        }
      } else {
        roots.push(node)
      }
    }
    return roots
  }

  async getTree(projectId: string): Promise<TreeNode[]> {
    const rows = await this.prisma.knowledgeNode.findMany({
      where: { projectId },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
      select: { id: true, name: true, type: true, parentId: true, sortOrder: true },
    })
    return this.buildTree(rows as FlatNode[])
  }

  async createNode(projectId: string, input: { parentId?: string | null; name: string; type: 'file'|'folder' }) {
    const name = (input.name || '').trim()
    if (!name) throw new BadRequestException('name is required')
    if (input.type !== 'file' && input.type !== 'folder') throw new BadRequestException('invalid type')
    const parentId = input.parentId ?? null
    if (parentId) {
      const parent = await this.prisma.knowledgeNode.findUnique({ where: { id: parentId } })
      if (!parent || parent.projectId !== projectId) throw new NotFoundException('Parent not found')
      if (parent.type !== 'folder') throw new BadRequestException('Parent must be folder')
    }
    const last = await this.prisma.knowledgeNode.findFirst({
      where: { projectId, parentId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })
    const sortOrder = (last?.sortOrder ?? -1) + 1
    const created = await this.prisma.knowledgeNode.create({
      data: { projectId, parentId, name, type: input.type, sortOrder },
      select: { id: true, name: true, type: true, parentId: true },
    })
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    // 初始化草稿版本的节点内容（若存在草稿版本且新建为文件）
    if (input.type === 'file') {
      const draft = await this.prisma.version.findFirst({
        where: { projectId, status: 'draft' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })
      if (draft) {
        const structuredDraft = [
          '<head>',
          `  <name>${name}</name>`,
          '  <level>core</level>',
          '  <description>草稿：请补充描述</description>',
          '</head>',
          '',
          '<core>',
          '  <content>',
          '    初始核心内容草稿',
          '  </content>',
          '</core>',
          '',
          '<extend>',
          '  <block>',
          '    <name>示例</name>',
          '    <level>extend</level>',
          '    <description>可选</description>',
          '    <content>',
          '      初始内容草稿',
          '    </content>',
          '  </block>',
          '</extend>',
        ].join('\n')
        await this.prisma.nodeContent.upsert({
          where: { versionId_nodeId: { versionId: draft.id, nodeId: created.id } },
          update: { content: structuredDraft },
          create: { versionId: draft.id, nodeId: created.id, content: structuredDraft },
        })
      }
    }
    return created
  }

  async renameNode(projectId: string, nodeId: string, name?: string) {
    const n = await this.prisma.knowledgeNode.findUnique({ where: { id: nodeId } })
    if (!n || n.projectId !== projectId) throw new NotFoundException('Not Found')
    if (typeof name !== 'string' || !name.trim()) throw new BadRequestException('name is required')
    const updated = await this.prisma.knowledgeNode.update({ where: { id: nodeId }, data: { name: name.trim() }, select: { id: true, name: true, type: true, parentId: true } })
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    return updated
  }

  async deleteNode(projectId: string, nodeId: string) {
    const n = await this.prisma.knowledgeNode.findUnique({ where: { id: nodeId } })
    if (!n || n.projectId !== projectId) throw new NotFoundException('Not Found')
    await this.prisma.knowledgeNode.delete({ where: { id: nodeId } })
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
  }

  private async isDescendant(projectId: string, potentialAncestorId: string, childId: string) {
    // Ascend from child to root; if hit ancestor, return true
    let cur = await this.prisma.knowledgeNode.findUnique({ where: { id: childId } })
    while (cur && cur.parentId) {
      if (cur.parentId === potentialAncestorId) return true
      cur = await this.prisma.knowledgeNode.findUnique({ where: { id: cur.parentId } })
      if (cur && cur.projectId !== projectId) break
    }
    return false
  }

  async moveNode(projectId: string, nodeId: string, payload: { targetParentId: string | null; beforeId?: string | null }) {
    const node = await this.prisma.knowledgeNode.findUnique({ where: { id: nodeId } })
    if (!node || node.projectId !== projectId) throw new NotFoundException('Not Found')

    const targetParentId = payload.targetParentId
    const beforeId = payload.beforeId ?? null

    if (targetParentId === nodeId) throw new BadRequestException('Cannot move into self')
    if (targetParentId) {
      const parent = await this.prisma.knowledgeNode.findUnique({ where: { id: targetParentId } })
      if (!parent || parent.projectId !== projectId) throw new NotFoundException('Parent not found')
      if (parent.type !== 'folder') throw new BadRequestException('Parent must be folder')
      // prevent moving node into its own subtree
      const movingIntoDescendant = await this.isDescendant(projectId, nodeId, targetParentId)
      if (movingIntoDescendant) throw new BadRequestException('Cannot move into own subtree')
    }

    // Validate beforeId belongs to targetParent
    if (beforeId) {
      const b = await this.prisma.knowledgeNode.findUnique({ where: { id: beforeId } })
      if (!b || b.projectId !== projectId) throw new NotFoundException('beforeId not found')
      if ((b.parentId ?? null) !== (targetParentId ?? null)) throw new BadRequestException('beforeId not sibling of target parent')
    }

    // Reorder siblings in a transaction: remove from old parent, insert in new parent
    await this.prisma.$transaction(async (tx) => {
      const oldParentId = node.parentId
      // Old siblings excluding moving node
      const oldSiblings = await tx.knowledgeNode.findMany({
        where: { projectId, parentId: oldParentId, NOT: { id: nodeId } },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      })
      // New siblings list under target parent
      const newSiblings = await tx.knowledgeNode.findMany({
        where: { projectId, parentId: targetParentId },
        orderBy: { sortOrder: 'asc' },
        select: { id: true },
      })
      // Build ordered list with insertion
      const targetList = newSiblings.map((s) => s.id).filter((id) => id !== nodeId)
      let insertIdx = targetList.length
      if (beforeId) {
        const idx = targetList.indexOf(beforeId)
        insertIdx = idx >= 0 ? idx : targetList.length
      }
      targetList.splice(insertIdx, 0, nodeId)

      // Update moved node parent first
      await tx.knowledgeNode.update({ where: { id: nodeId }, data: { parentId: targetParentId } })

      // Reindex target siblings
      for (let i = 0; i < targetList.length; i++) {
        await tx.knowledgeNode.update({ where: { id: targetList[i] }, data: { sortOrder: i } })
      }

      // Reindex old siblings
      for (let i = 0; i < oldSiblings.length; i++) {
        await tx.knowledgeNode.update({ where: { id: oldSiblings[i].id }, data: { sortOrder: i } })
      }
    })

    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
  }
}
