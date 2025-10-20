import { Injectable, OnModuleInit } from '@nestjs/common'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'
import { McpService } from './mcp.service'
import { mcpRequestContext } from './context'

@Injectable()
export class McpSdkService implements OnModuleInit {
  private server!: McpServer
  private transport!: StreamableHTTPServerTransport

  constructor(private readonly mcp: McpService) {}

  async onModuleInit() {
    this.server = new McpServer({ name: 'Hyper Context MCP', version: '0.1.0' })

    // get-knowledge-index
    this.server.tool(
      'get-knowledge-index',
      '根据知识树中知识点名称检索扩展知识的索引，严禁幻想不存在的知识点名称进行检索。',
      { names: z.array(z.string()).min(1).describe('知识树中知识点名称列表') },
      async (args: any) => {
        const ctx = mcpRequestContext.getStore()
        const projectId = ctx?.projectId || ''
        const it = this.mcp.getKnowledgeIndex(
          projectId,
          /* default version */ {},
          { names: args.names }
        )
        const gathered: any[] = []
        for await (const evt of it) {
          if (evt.type === 'data') gathered.push(evt.data)
          if (evt.type === 'error') throw new Error(evt.message)
        }
        return { content: [{ type: 'text', text: JSON.stringify(gathered, null, 2) }] }
      }
    )

    // get-knowledge
    this.server.tool(
      'get-knowledge',
      '根据扩展知识的名称（块名）检索知识详情，严禁幻想不存在的扩展知识点名称',
      { names: z.array(z.string()).min(1).describe('扩展知识块名称列表') },
      async (args: any) => {
        const ctx = mcpRequestContext.getStore()
        const projectId = ctx?.projectId || ''
        const it = this.mcp.getKnowledge(projectId, /* default version */ {}, { keys: args.names })
        const gathered: any[] = []
        for await (const evt of it) {
          if (evt.type === 'data') gathered.push(evt.data)
          if (evt.type === 'error') throw new Error(evt.message)
        }
        return { content: [{ type: 'text', text: JSON.stringify(gathered, null, 2) }] }
      }
    )

    // stateless sessions; let SDK manage any per-request context
    this.transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await this.server.connect(this.transport)
  }

  async handleRequest(req: any, res: any, body: any) {
    await this.transport.handleRequest(req, res, body)
  }
}
