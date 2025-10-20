import { Body, Controller, Param, Post, Req, Res, Get, Delete } from '@nestjs/common'
import { McpSdkService } from './sdk.service'
import { mcpRequestContext } from './context'

@Controller('projects/:id/mcp-rpc')
export class McpRpcController {
  constructor(private readonly sdk: McpSdkService) {}

  @Post()
  async handle(@Param('id') projectId: string, @Req() req: any, @Res() res: any, @Body() body: any) {
    // Inject projectId into JSON-RPC params if missing (supports single or batch)
    const inject = (payload: any) => {
      try {
        if (!payload || typeof payload !== 'object') return payload
        if (payload.method === 'tools/call' && payload.params && typeof payload.params === 'object') {
          const args = payload.params.arguments || {}
          if (!args.projectId) args.projectId = projectId
          payload.params.arguments = args
        }
      } catch {}
      return payload
    }
    if (Array.isArray(body)) body = body.map((p) => inject(p))
    else body = inject(body)
    await new Promise<void>((resolve, reject) => {
      mcpRequestContext.run({ projectId }, async () => {
        try {
          await this.sdk.handleRequest(req, res, body)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  // Streamable HTTP: expose GET to establish SSE stream for clients that open it explicitly
  @Get()
  async stream(@Param('id') projectId: string, @Req() req: any, @Res() res: any) {
    await new Promise<void>((resolve, reject) => {
      mcpRequestContext.run({ projectId }, async () => {
        try {
          await this.sdk.handleRequest(req, res, undefined)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  // Optional: allow clients to close session via DELETE (Streamable HTTP supports DELETE)
  @Delete()
  async close(@Param('id') projectId: string, @Req() req: any, @Res() res: any) {
    await new Promise<void>((resolve, reject) => {
      mcpRequestContext.run({ projectId }, async () => {
        try {
          await this.sdk.handleRequest(req, res, undefined)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}
