import { Body, Controller, Get, Param, Put } from '@nestjs/common'
import { ContentsService } from './contents.service'
import { ContentDto } from './dto/content.dto'

@Controller('projects/:id/versions/:vid/knowledge')
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  @Get('main')
  async getMain(@Param('id') projectId: string, @Param('vid') versionId: string) {
    return this.contents.getMain(projectId, versionId)
  }

  @Put('main')
  async setMain(@Param('id') projectId: string, @Param('vid') versionId: string, @Body() body: ContentDto) {
    return this.contents.setMain(projectId, versionId, body?.content ?? '')
  }

  @Get('nodes/:nodeId/content')
  async getNode(@Param('id') projectId: string, @Param('vid') versionId: string, @Param('nodeId') nodeId: string) {
    return this.contents.getNode(projectId, versionId, nodeId)
  }

  @Put('nodes/:nodeId/content')
  async setNode(
    @Param('id') projectId: string,
    @Param('vid') versionId: string,
    @Param('nodeId') nodeId: string,
    @Body() body: ContentDto,
  ) {
    return this.contents.setNode(projectId, versionId, nodeId, body?.content ?? '')
  }
}
