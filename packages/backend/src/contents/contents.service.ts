import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ContentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMain(projectId: string, versionId: string) {
    const v = await this.prisma.version.findFirst({ where: { id: versionId, projectId }, select: { id: true } })
    if (!v) throw new NotFoundException('Not Found')
    const vc = await this.prisma.versionContent.findUnique({ where: { versionId } })
    return { content: vc?.main ?? '' }
  }

  async setMain(projectId: string, versionId: string, content: string) {
    const v = await this.prisma.version.findFirst({ where: { id: versionId, projectId }, select: { id: true, status: true } })
    if (!v) throw new NotFoundException('Not Found')
    if (v.status !== 'draft') throw new BadRequestException('Only draft can be edited')
    const exists = await this.prisma.versionContent.findUnique({ where: { versionId } })
    if (exists) {
      await this.prisma.versionContent.update({ where: { versionId }, data: { main: content ?? '' } })
    } else {
      await this.prisma.versionContent.create({ data: { versionId, projectId, main: content ?? '' } })
    }
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    return { content: content ?? '' }
  }

  async getNode(projectId: string, versionId: string, nodeId: string) {
    const v = await this.prisma.version.findFirst({ where: { id: versionId, projectId }, select: { id: true } })
    if (!v) throw new NotFoundException('Not Found')
    const nc = await this.prisma.nodeContent.findUnique({ where: { versionId_nodeId: { versionId, nodeId } } })
    return { content: nc?.content ?? '' }
  }

  async setNode(projectId: string, versionId: string, nodeId: string, content: string) {
    const v = await this.prisma.version.findFirst({ where: { id: versionId, projectId }, select: { id: true, status: true } })
    if (!v) throw new NotFoundException('Not Found')
    if (v.status !== 'draft') throw new BadRequestException('Only draft can be edited')
    // ensure node exists and belongs to project
    const n = await this.prisma.knowledgeNode.findUnique({ where: { id: nodeId } })
    if (!n || n.projectId !== projectId) throw new NotFoundException('Not Found')
    await this.prisma.nodeContent.upsert({
      where: { versionId_nodeId: { versionId, nodeId } },
      update: { content: content ?? '' },
      create: { versionId, nodeId, content: content ?? '' },
    })
    await this.prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } })
    return { content: content ?? '' }
  }

  async getStableMain(projectId: string) {
    const v = await this.prisma.version.findFirst({ where: { projectId, isStable: true }, select: { id: true } })
    if (!v) throw new NotFoundException('No stable version')
    return this.getMain(projectId, v.id)
  }

  async getStableNode(projectId: string, nodeId: string) {
    const v = await this.prisma.version.findFirst({ where: { projectId, isStable: true }, select: { id: true } })
    if (!v) throw new NotFoundException('No stable version')
    return this.getNode(projectId, v.id, nodeId)
  }
}
