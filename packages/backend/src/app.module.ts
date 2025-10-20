import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { ProjectsModule } from './projects/projects.module'
import { KnowledgeModule } from './knowledge/knowledge.module'
import { VersionsModule } from './versions/versions.module'
import { ContentsModule } from './contents/contents.module'
import { HealthModule } from './health/health.module'
import { McpModule } from './mcp/mcp.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ProjectsModule,
    KnowledgeModule,
    VersionsModule,
    ContentsModule,
    HealthModule,
    McpModule,
  ],
})
export class AppModule {}
