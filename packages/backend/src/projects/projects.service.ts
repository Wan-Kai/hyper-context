import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        mcpStatus: true,
        updatedAt: true,
        stableVersion: { select: { version: true } },
        versions: { where: { isStable: true }, select: { version: true }, take: 1 },
      },
    })
    // knowledgeCount: count file-type nodes per project
    const counts = await this.prisma.knowledgeNode.groupBy({
      by: ['projectId'],
      _count: { _all: true },
      where: { type: 'file' },
    })
    const map = new Map(counts.map((c) => [c.projectId, c._count._all]))

    return items.map((p) => {
      const stableVer = p.stableVersion?.version || p.versions?.[0]?.version || '—'
      // 默认规则：有稳定版本则视为 MCP active（临时规则）
      const mcp = stableVer !== '—' ? 'active' : p.mcpStatus
      return {
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        knowledgeCount: map.get(p.id) ?? 0,
        stableVersion: stableVer,
        mcpStatus: mcp,
        updatedAt: p.updatedAt.toISOString(),
      }
    })
  }

  async findOne(id: string) {
    const p = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        mcpStatus: true,
        updatedAt: true,
        stableVersion: { select: { version: true } },
        versions: { where: { isStable: true }, select: { version: true }, take: 1 },
      },
    })
    if (!p) return null
    const files = await this.prisma.knowledgeNode.count({ where: { projectId: id, type: 'file' } })
    const stableVer = p.stableVersion?.version || p.versions?.[0]?.version || '—'
    const mcp = stableVer !== '—' ? 'active' : p.mcpStatus
    return {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      knowledgeCount: files,
      stableVersion: stableVer,
      mcpStatus: mcp,
      updatedAt: p.updatedAt.toISOString(),
    }
  }

  async create(input: { name?: string; description?: string }) {
    const name = input.name?.trim() ? input.name.trim() : '未命名项目'
    const description = typeof input.description === 'string' ? input.description : ''
    const created = await this.prisma.project.create({
      data: { name, description },
      select: {
        id: true,
        name: true,
        description: true,
        mcpStatus: true,
        updatedAt: true,
        stableVersion: { select: { version: true } },
      },
    })
    const files = await this.prisma.knowledgeNode.count({ where: { projectId: created.id, type: 'file' } })
    return {
      id: created.id,
      name: created.name,
      description: created.description ?? '',
      knowledgeCount: files,
      stableVersion: created.stableVersion?.version ?? '—',
      mcpStatus: created.mcpStatus,
      updatedAt: created.updatedAt.toISOString(),
    }
  }

  async update(id: string, patch: { name?: string; description?: string; mcpStatus?: string }) {
    const data: Record<string, any> = {}
    if (typeof patch.name === 'string') data.name = patch.name
    if (typeof patch.description === 'string') data.description = patch.description
    if (typeof patch.mcpStatus === 'string') data.mcpStatus = patch.mcpStatus
    if (Object.keys(data).length === 0) {
      // Mimic 400 from previous backend
      throw new BadRequestException('No updatable fields')
    }
    await this.prisma.project.update({ where: { id }, data })
    return this.findOne(id)
  }

  async remove(id: string) {
    await this.prisma.project.delete({ where: { id } })
  }
}
