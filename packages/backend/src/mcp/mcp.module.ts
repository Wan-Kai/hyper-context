import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { McpService } from './mcp.service'
import { McpRpcController } from './mcp.rpc.controller'
import { McpSdkService } from './sdk.service'

@Module({
  imports: [PrismaModule],
  controllers: [McpRpcController],
  providers: [McpService, McpSdkService],
  exports: [McpService, McpSdkService],
})
export class McpModule {}
