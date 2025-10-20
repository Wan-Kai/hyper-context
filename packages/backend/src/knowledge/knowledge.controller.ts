import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { KnowledgeService } from './knowledge.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateKnowledgeNodeDto } from './dto/create-node.dto'
import { RenameKnowledgeNodeDto } from './dto/rename-node.dto'
import { MoveKnowledgeNodeDto } from './dto/move-node.dto'

@Controller('projects/:id/knowledge')
export class KnowledgeController {
  constructor(private readonly service: KnowledgeService, private readonly prisma: PrismaService) {}

  @Get('tree')
  async tree(@Param('id') projectId: string) {
    return this.service.getTree(projectId)
  }

  @Post('nodes')
  async createNode(
    @Param('id') projectId: string,
    @Body() body: CreateKnowledgeNodeDto,
  ) {
    return this.service.createNode(projectId, body)
  }

  @Patch('nodes/:nodeId')
  async rename(
    @Param('id') projectId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: RenameKnowledgeNodeDto,
  ) {
    return this.service.renameNode(projectId, nodeId, body?.name)
  }

  @Delete('nodes/:nodeId')
  @HttpCode(204)
  async remove(@Param('id') projectId: string, @Param('nodeId') nodeId: string) {
    await this.service.deleteNode(projectId, nodeId)
    return
  }

  @Post('nodes/:nodeId/move')
  @HttpCode(204)
  async move(
    @Param('id') projectId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: MoveKnowledgeNodeDto,
  ) {
    await this.service.moveNode(projectId, nodeId, body)
    return
  }
}
