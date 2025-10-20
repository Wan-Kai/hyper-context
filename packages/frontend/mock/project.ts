import type { MockMethod } from 'vite-plugin-mock'
import { KnowledgeNodeType, McpStatus } from '@hyper-context/shared'

// in-memory dataset for dev mocks (shared via globalThis to survive HMR and cross-module updates)
const gm = globalThis as any
gm.__HC_PROJ_SEQ__ = gm.__HC_PROJ_SEQ__ || 4
let seq = gm.__HC_PROJ_SEQ__ as number

const initialProjects = [
  {
    id: 'p-001',
    name: 'Hyper Docs',
    description:
      '文档与知识库示例项目文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试文字超长测试',
    knowledgeCount: 18,
    // 与 versions.ts 中的稳定版保持一致：2.1.0
    stableVersion: '2.1.0',
    mcpStatus: McpStatus.Active,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'p-002',
    name: 'Prompt Lab',
    description: '提示词实验与模板管理',
    knowledgeCount: 9,
    // 与 versions.ts 中的稳定版保持一致：0.9.0
    stableVersion: '0.9.0',
    mcpStatus: McpStatus.Inactive,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: 'p-003',
    name: 'MCP Bridge',
    description: 'MCP 服务集成与调试',
    knowledgeCount: 27,
    // 与 versions.ts 中的稳定版保持一致：2.0.0
    stableVersion: '2.0.0',
    mcpStatus: McpStatus.Active,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  }
]

export const projects: typeof initialProjects = (gm.__HC_PROJECTS__ ||= initialProjects)

export default [
  // list
  {
    url: '/api/projects',
    method: 'get',
    response: ({ query }) => {
      const q = (query?.q as string | undefined)?.trim()?.toLowerCase()
      // 运行时基于工作树计算文件型节点数量，并按 updatedAt DESC 排序
      let list = projects.slice()
      try {
        const { trees } = require('./knowledge') as any
        list = list.map((p) => {
          const tree = (trees && trees[p.id]) || []
          const countFiles = (nodes: any[]): number =>
            nodes.reduce((acc: number, n: any) => acc + (n.type === KnowledgeNodeType.File ? 1 : 0) + (n.children ? countFiles(n.children) : 0), 0)
          // 规则：有稳定版本则视为 MCP active（仅 dev mock 层默认）
          const mcp = p.stableVersion && p.stableVersion !== '—' ? 'active' : p.mcpStatus
          return { ...p, knowledgeCount: countFiles(tree), mcpStatus: mcp }
        })
      } catch (_) {}
      if (q) list = list.filter((p) => p.name.toLowerCase().includes(q))
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      return list
    }
  },

  // detail
  {
    url: '/api/projects/:id',
    method: 'get',
    response: ({ query }) => {
      const id = decodeURIComponent(String((query as any).id || ''))
      const item = projects.find((p) => p.id === id)
      if (!item) {
        return { status: 404, body: { message: 'Not Found' } }
      }
      // 动态计算 knowledgeCount，并按稳定版规则推导 MCP 状态
      try {
        const { trees } = require('./knowledge') as any
        const tree = (trees && trees[item.id]) || []
        const countFiles = (nodes: any[]): number =>
          nodes.reduce((acc: number, n: any) => acc + (n.type === KnowledgeNodeType.File ? 1 : 0) + (n.children ? countFiles(n.children) : 0), 0)
        const mcp = item.stableVersion && item.stableVersion !== '—' ? 'active' : item.mcpStatus
        return { ...item, knowledgeCount: countFiles(tree), mcpStatus: mcp }
      } catch (_) {
        const mcp = item.stableVersion && item.stableVersion !== '—' ? 'active' : item.mcpStatus
        return { ...item, mcpStatus: mcp }
      }
    }
  },

  // create
  {
    url: '/api/projects',
    method: 'post',
    statusCode: 201,
    response: ({ body }) => {
      const name = (body && (body as any).name) || '未命名项目'
      const description = (body && (body as any).description) || ''
      const now = new Date().toISOString()
      const id = `p-${String(seq++).padStart(3, '0')}`
      gm.__HC_PROJ_SEQ__ = seq
      const project = {
        id,
        name,
        description,
        knowledgeCount: 0,
        // 新项目暂无稳定版，按约定显示为 '—'
        stableVersion: '—',
        mcpStatus: McpStatus.Inactive,
        updatedAt: now
      }
      projects.unshift(project)
      return project
    }
  },

  // update
  {
    url: '/api/projects/:id',
    method: 'put',
    response: ({ query, body }) => {
      const id = decodeURIComponent(String((query as any).id || ''))
      const idx = projects.findIndex((p) => p.id === id)
      if (idx === -1) {
        return { status: 404, body: { message: 'Not Found' } }
      }
      const patch = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
      const updated = { ...projects[idx], ...patch, updatedAt: new Date().toISOString() }
      projects[idx] = updated
      return updated
    }
  },

  // delete
  {
    url: '/api/projects/:id',
    method: 'delete',
    statusCode: 204,
    response: ({ query }) => {
      const id = decodeURIComponent(String((query as any).id || ''))
      const idx = projects.findIndex((p) => p.id === id)
      if (idx === -1) {
        return { status: 404, body: { message: 'Not Found' } }
      }
      projects.splice(idx, 1)
      return null
    }
  }
] as MockMethod[]
