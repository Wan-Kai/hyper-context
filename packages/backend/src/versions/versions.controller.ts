import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post, Query } from '@nestjs/common'
import { VersionsService } from './versions.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVersionDto } from './dto/create-version.dto'

@Controller('projects/:id/versions')
export class VersionsController {
  constructor(
    private readonly versions: VersionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@Param('id') projectId: string) {
    return this.versions.list(projectId)
  }

  @Get(':vid')
  async get(@Param('id') projectId: string, @Param('vid') vid: string) {
    return this.versions.get(projectId, vid)
  }

  @Post()
  async create(@Param('id') projectId: string, @Body() body?: CreateVersionDto) {
    return this.versions.create(projectId, body)
  }

  @Post(':vid/publish')
  async publish(@Param('id') projectId: string, @Param('vid') vid: string) {
    return this.versions.publish(projectId, vid)
  }

  @Post(':vid/stable')
  @HttpCode(200)
  async stable(@Param('id') projectId: string, @Param('vid') vid: string) {
    await this.versions.markStable(projectId, vid)
    return { ok: true }
  }

  @Get('stable')
  async stableVersion(@Param('id') projectId: string) {
    return this.versions.getStable(projectId)
  }

  @Get(':vid/snapshot')
  async snapshot(
    @Param('id') projectId: string,
    @Param('vid') vid: string,
    @Query('rootId') rootId?: string,
  ) {
    return this.versions.snapshot(projectId, vid, { rootId: rootId ?? null })
  }

  @Get('stable/snapshot')
  async stableSnapshot(@Param('id') projectId: string) {
    return this.versions.stableSnapshot(projectId)
  }

  // Stable preview prompt: build the same preview text as the editor's modal, for the stable version
  @Get('stable/preview')
  async stablePreview(@Param('id') projectId: string) {
    const content = await this.versions.stablePreview(projectId)
    return { content }
  }

  // Version-scoped move (only draft)
  @Post(':vid/knowledge/nodes/:nodeId/move')
  @HttpCode(204)
  async moveInVersion(
    @Param('id') projectId: string,
    @Param('vid') vid: string,
    @Param('nodeId') nodeId: string,
    @Body() body: { targetParentId: string | null; beforeId?: string | null },
  ) {
    const v = await this.prisma.version.findFirst({ where: { id: vid, projectId }, select: { status: true } })
    if (!v) throw new NotFoundException('Not Found')
    if (v.status !== 'draft') throw new BadRequestException('Only draft can be edited')
    // Use explicit .js for Node16/NodeNext module resolution compatibility
    const { KnowledgeService } = await import('../knowledge/knowledge.service.js')
    const knowledge = new KnowledgeService(this.prisma)
    await knowledge.moveNode(projectId, nodeId, body)
    return
  }

  // Stable read helpers (no write)
  @Get('stable/knowledge/main')
  async stableMain(@Param('id') projectId: string) {
    // We reuse ContentsService for resolution
    const { ContentsService } = await import('../contents/contents.service.js')
    const svc = new ContentsService(this.prisma)
    return svc.getStableMain(projectId)
  }

  @Get('stable/knowledge/nodes/:nodeId/content')
  async stableNode(@Param('id') projectId: string, @Param('nodeId') nodeId: string) {
    const { ContentsService } = await import('../contents/contents.service.js')
    const svc = new ContentsService(this.prisma)
    return svc.getStableNode(projectId, nodeId)
  }
}
