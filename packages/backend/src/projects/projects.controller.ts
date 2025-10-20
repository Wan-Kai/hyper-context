import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put } from '@nestjs/common'
import { ProjectsService } from './projects.service'
import { CreateProjectDto } from './dto/create-project.dto'
import { UpdateProjectDto } from './dto/update-project.dto'

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  async list() {
    return this.projects.findAll()
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const item = await this.projects.findOne(id)
    if (!item) throw new NotFoundException('Not Found')
    return item
  }

  @Post()
  async create(@Body() body: CreateProjectDto) {
    const item = await this.projects.create(body || {})
    return item
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    const item = await this.projects.update(id, body || {})
    if (!item) throw new NotFoundException('Not Found')
    return item
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.projects.remove(id)
    return
  }
}
