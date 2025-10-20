import { Module } from '@nestjs/common'
import { VersionsController } from './versions.controller'
import { VersionsService } from './versions.service'
import { KnowledgeModule } from '../knowledge/knowledge.module'

@Module({
  imports: [KnowledgeModule],
  controllers: [VersionsController],
  providers: [VersionsService],
})
export class VersionsModule {}
