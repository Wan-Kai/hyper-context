import type { MockMethod } from 'vite-plugin-mock'
import { versionsMap } from './versions'
import { trees, type Node } from './knowledge'

// Content store per project per version
// Each version keeps a "main" markdown and per-node content by node id
type ContentBundle = {
  // main markdown for the version
  main: string
  // node structured content (XML-like) per node id
  nodes: Record<string, string>
}

// Snapshot of tree per version captured on publish
const gm = globalThis as any
const treeSnapshots: Record<string, Record<string, Node[]>> = (gm.__HC_TREE_SNAPSHOTS__ ||= {})

// Helper to create structured knowledge text with head + extend blocks
function makeStructured(params: {
  name: string
  level?: 'core' | 'extend'
  description?: string
  blocks?: Array<{
    name: string
    level?: 'core' | 'extend'
    description?: string
    content?: string
  }>
}): string {
  const level = params.level || 'core'
  const description = params.description || ''
  const head = [
    '<head>',
    `  <name>${params.name}</name>`,
    `  <level>${level}</level>`,
    `  <description>${description}</description>`,
    '</head>'
  ].join('\n')

  const blocks = (params.blocks || []).map((b) => {
    const bLevel = b.level || 'extend'
    const content = (b.content || '').split('\n').map((l) => (l ? `    ${l}` : '')).join('\n')
    const contentLine = b.content ? `\n${content}\n  ` : ''
    return [
      '  <block>',
      `    <name>${b.name}</name>`,
      `    <level>${bLevel}</level>`,
      `    <description>${b.description || ''}</description>`,
      `    <content>${contentLine}</content>`,
      '  </block>'
    ].join('\n')
  }).join('\n')

  const extend = ['<extend>', blocks, '</extend>'].join('\n')
  return [head, '', extend].join('\n')
}

const initialContents: Record<string, Record<string, ContentBundle>> = {
  // Project: p-001 (Hyper Docs)
  'p-001': {
    // Stable version 2.1.0
    'v-2.1.0': {
      main: '# Hyper Docs 2.1.0\n\n这是稳定版的核心说明文档。包含基础介绍与最佳实践。',
      nodes: {
        'k-01': makeStructured({
          name: '介绍.md',
          level: 'core',
          description: '项目概览、核心能力与术语定义。',
          blocks: [
            { name: '术语表', level: 'extend', description: '核心术语释义', content: '- 文档: 文本内容的集合\n- 知识: 可复用的信息单元' },
            { name: '最佳实践总览', level: 'extend', description: '选择合适的模板与结构', content: '1. 从稳定版开始\n2. 渐进式引入高级特性' }
          ]
        }),
        'k-02-01': makeStructured({
          name: '快速开始.md',
          level: 'core',
          description: '安装、初始化与首个文档。',
          blocks: [
            { name: '安装', content: 'pnpm i\n# 或\nnpm i' },
            { name: '初始化', content: 'pnpm run init\n# 选择默认模板' },
            { name: 'CLI 参考', level: 'extend', description: '常用命令', content: '`docs build`、`docs dev`' }
          ]
        }),
        'k-02-02-01': makeStructured({
          name: '配置.md',
          level: 'core',
          description: '常用配置项与默认值。',
          blocks: [
            { name: '基本配置', content: 'title、theme、sidebar' },
            { name: '进阶配置', level: 'extend', content: 'search.providers、i18n.locales' }
          ]
        }),
        'k-02-02-02': makeStructured({
          name: '性能优化.md',
          level: 'extend',
          description: '构建与渲染相关优化建议。',
          blocks: [
            { name: '构建优化', content: '缓存构建产物\n拆分依赖' },
            { name: '渲染优化', content: '减少首屏体积\n合理使用延迟加载' }
          ]
        }),
        'k-02-03': makeStructured({
          name: '最佳实践.md',
          level: 'extend',
          description: '组织结构与协作流程建议。',
          blocks: [
            { name: '结构设计', content: '按领域分层组织\n命名规范：中英文统一' },
            { name: '协作流程', content: 'PR 模板\nCode Review 清单' }
          ]
        }),
        'k-03-01': makeStructured({
          name: 'API 列表.md',
          level: 'core',
          description: '常用 API 汇总清单。',
          blocks: [
            { name: 'Project API', content: '`GET /projects`\n`POST /projects`' },
            { name: 'Knowledge API', content: '`GET /projects/:id/knowledge/tree`' }
          ]
        })
      }
    },
    // A newer patch release
    'v-2.3.1': {
      main: '# Hyper Docs 2.3.1\n\n新增了若干改进与错误修复。',
      nodes: {
        'k-01': makeStructured({
          name: '介绍.md',
          level: 'core',
          description: '增加“架构概览”章节，完善兼容性说明。',
          blocks: [
            { name: '架构概览', level: 'extend', description: '模块与数据流', content: 'Frontend ⇄ Backend ⇄ Storage' }
          ]
        }),
        'k-02-01': makeStructured({
          name: '快速开始.md',
          level: 'core',
          description: '支持 `--init` 快速脚手架与模板拉取。',
          blocks: [
            { name: '安装', content: 'pnpm i' },
            { name: '一键初始化', content: 'pnpm run init -- --from stable' },
            { name: '模板拉取', level: 'extend', content: 'pnpm run template pull <name>' }
          ]
        }),
        'k-02-02-01': makeStructured({
          name: '配置.md',
          level: 'core',
          description: '新增 features.experimental 说明。',
          blocks: [
            { name: '基本配置', content: 'title、theme、sidebar' },
            { name: '实验特性', level: 'extend', description: 'features.experimental', content: '开启后将启用实验性校验。' }
          ]
        }),
        'k-02-02-02': makeStructured({
          name: '性能优化.md',
          level: 'extend',
          description: '引入按需加载与资源预取。',
          blocks: [
            { name: '按需加载', content: '分包策略与路由懒加载' },
            { name: '资源预取', content: 'prefetch 与 preload 的使用时机' }
          ]
        }),
        'k-02-03': makeStructured({
          name: '最佳实践.md',
          level: 'extend',
          description: '新增发布与回滚流程建议。',
          blocks: [
            { name: '发布', content: '版本命名规范\nChangelog 生成' },
            { name: '回滚', content: '灰度发布\n快速回滚策略' }
          ]
        }),
        'k-03-01': makeStructured({
          name: 'API 列表.md',
          level: 'core',
          description: '补充版本与稳定标记 API。',
          blocks: [
            { name: 'Version API', content: '`GET /projects/:id/versions`\n`POST /projects/:id/versions`\n`POST /projects/:id/versions/:vid/stable`' }
          ]
        })
      }
    },
    // Release candidate with small differences
    'v-2.5.0-rc.2': {
      main: '# Hyper Docs 2.5.0 RC2\n\n候选版本，聚焦稳定性回归测试。',
      nodes: {
        'k-01': makeStructured({
          name: '介绍.md',
          level: 'core',
          description: 'RC2 变更范围与兼容性注意事项。',
          blocks: [
            { name: '升级指南', level: 'extend', content: '请先从 2.3.x 升级到 2.4.x，再升级 2.5.0-rc.2' }
          ]
        }),
        'k-02-01': makeStructured({
          name: '快速开始.md',
          description: '新增 `init --from stable` 脚手架模式。',
          blocks: [
            { name: '初始化', content: 'pnpm run init -- --from stable' },
            { name: '回归测试建议', level: 'extend', content: '覆盖渲染、搜索、构建三大路径。' }
          ]
        }),
        'k-02-02-01': makeStructured({
          name: '配置.md',
          description: '默认启用更严格的校验规则。',
          blocks: [
            { name: '严格模式', content: 'lint.strict = true' }
          ]
        }),
        'k-02-02-02': makeStructured({
          name: '性能优化.md',
          description: '候选版聚焦稳定性，保守优化。',
          blocks: [
            { name: '缓存策略', content: '保留现有缓存策略，优先稳定性验证。' }
          ]
        }),
        'k-02-03': makeStructured({
          name: '最佳实践.md',
          description: 'RC 发布流程 checklist。',
          blocks: [
            { name: 'Checklist', content: '- 用例通过\n- 文档更新\n- 回滚预案' }
          ]
        }),
        'k-03-01': makeStructured({
          name: 'API 列表.md',
          description: '冻结 API 列表，准备正式版发布。'
        })
      }
    }
  },
  // Project: p-002 (Prompt Lab) — tree is empty in mock, but keep a main content per version
  'p-002': {
    'v-0.9.0': {
      main: '# Prompt Lab 0.9.0\n\n稳定版：提示词管理与多模板支持。',
      nodes: {}
    },
  },
  // Project: p-003 (MCP Bridge)
  'p-003': {
    'v-2.0.0': {
      main: '# MCP Bridge 2.0.0\n\n稳定版：支持多端协议桥接与调试面板。',
      nodes: {}
    }
  }
}

const contentsMap: Record<string, Record<string, ContentBundle>> = (gm.__HC_CONTENTS__ ||= initialContents)

// Helper: resolve stable version id for a project
function getStableVersionId(projectId: string): string | null {
  const list = versionsMap[projectId]
  if (!list || !list.length) return null
  const stable = list.find((v) => !!v.isStable)
  return stable ? stable.id : null
}

function ensureBundle(projectId: string, versionId: string): ContentBundle {
  const pv = (contentsMap[projectId] ||= {})
  return (pv[versionId] ||= { main: '', nodes: {} })
}

export default [
  // Single version meta
  {
    url: '/api/projects/:id/versions/:vid',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const v = (versionsMap[projectId] || []).find((x) => x.id === versionId)
      if (!v) return { status: 404, body: { message: 'Version not found' } }
      return v
    }
  },
  // Publish a draft version (freeze tree snapshot and mark published)
  {
    url: '/api/projects/:id/versions/:vid/publish',
    method: 'post',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const list = versionsMap[projectId] || []
      const v = list.find((x) => x.id === versionId)
      if (!v) return { status: 404, body: { message: 'Version not found' } }
      // mark published
      v.status = 'published'
      // freeze tree snapshot at publish time
      const projectTree = trees[projectId] || []
      ;(treeSnapshots[projectId] ||= {})[versionId] = JSON.parse(JSON.stringify(projectTree))
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return v
    }
  },
  // Stable version meta
  {
    url: '/api/projects/:id/versions/stable',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const list = versionsMap[projectId] || []
      const stable = list.find((x) => !!x.isStable)
      if (!stable) return { status: 404, body: { message: 'No stable version' } }
      return stable
    }
  },

  // Version snapshot: tree + contents (optionally scoped by rootId)
  {
    url: '/api/projects/:id/versions/:vid/snapshot',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const rootId = (query && (query as any).rootId) ? decodeURIComponent(String((query as any).rootId)) : null
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      let version = list.find((x) => x.id === versionId)
      // Mock 容错：若请求的版本在内存中不存在（可能因热重载重置），自动补一个草稿版本，避免前端持有的旧 id 404
      if (!version) {
        const auto = {
          id: versionId,
          version: 'draft',
          status: 'draft' as const,
          createdAt: new Date().toISOString()
        }
        list.push(auto as any)
        version = auto as any
      }
      // resolve tree by status
      const projectTree = (version.status === 'published'
        ? (treeSnapshots[projectId] && treeSnapshots[projectId][versionId]) || trees[projectId]
        : trees[projectId]) || []

      function clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }

      function findNode(list: Node[], id: string): Node | null {
        for (const n of list) {
          if (n.id === id) return n
          if (n.children && n.children.length) {
            const f = findNode(n.children, id)
            if (f) return f
          }
        }
        return null
      }

      const resolveTree = (): Node[] => {
        if (!rootId) return clone(projectTree)
        const node = findNode(projectTree, rootId)
        if (!node) return []
        // if rootId points to a file, return just that file as a top-level list
        if (node.type === 'file') return [clone(node)]
        // if folder, return its children, but keep folder itself as root for context
        return [clone(node)]
      }

      const tree = resolveTree()

      // Collect file ids within the returned tree
      const fileIds: string[] = []
      function collect(list: Node[]) {
        for (const n of list) {
          if (n.type === 'file') fileIds.push(n.id)
          if (n.children && n.children.length) collect(n.children)
        }
      }
      collect(tree)

      const bundle = (contentsMap[projectId] || {})[versionId] || { main: '', nodes: {} }
      const scopedNodes: Record<string, string> = {}
      for (const id of fileIds) scopedNodes[id] = bundle.nodes[id] || ''

      return {
        version,
        tree,
        contents: { main: bundle.main || '', nodes: scopedNodes }
      }
    }
  },

  // Stable snapshot alias
  {
    url: '/api/projects/:id/versions/stable/snapshot',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const list = versionsMap[projectId] || []
      const stable = list.find((x) => !!x.isStable)
      if (!stable) return { status: 404, body: { message: 'No stable version' } }
      // Use frozen tree if available for published versions
      const rootId = (query && (query as any).rootId) ? decodeURIComponent(String((query as any).rootId)) : null
      const projectTree = (stable.status === 'published'
        ? (treeSnapshots[projectId] && treeSnapshots[projectId][stable.id]) || trees[projectId]
        : trees[projectId]) || []
      function clone<T>(obj: T): T { return JSON.parse(JSON.stringify(obj)) }
      function findNode(list: Node[], id: string): Node | null {
        for (const n of list) {
          if (n.id === id) return n
          if (n.children && n.children.length) {
            const f = findNode(n.children, id)
            if (f) return f
          }
        }
        return null
      }
      const resolveTree = (): Node[] => {
        if (!rootId) return clone(projectTree)
        const node = findNode(projectTree, rootId)
        if (!node) return []
        if (node.type === 'file') return [clone(node)]
        return [clone(node)]
      }
      const tree = resolveTree()
      const fileIds: string[] = []
      function collect(list: Node[]) {
        for (const n of list) {
          if (n.type === 'file') fileIds.push(n.id)
          if (n.children && n.children.length) collect(n.children)
        }
      }
      collect(tree)
      const bundle = (contentsMap[projectId] || {})[stable.id] || { main: '', nodes: {} }
      const scopedNodes: Record<string, string> = {}
      for (const id of fileIds) scopedNodes[id] = bundle.nodes[id] || ''
      return { version: stable, tree, contents: { main: bundle.main || '', nodes: scopedNodes } }
    }
  },
  // Get main content by explicit version id
  {
    url: '/api/projects/:id/versions/:vid/knowledge/main',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const bundle = contentsMap[projectId]?.[versionId]
      return { content: bundle?.main || '' }
    }
  },
  // Update main content (by version id)
  {
    url: '/api/projects/:id/versions/:vid/knowledge/main',
    method: 'put',
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      let version = list.find((x) => x.id === versionId)
      // 若版本不存在则按草稿自动创建（配合前端持久化旧 id 的场景）
      if (!version) {
        const auto = { id: versionId, version: 'draft', status: 'draft' as const, createdAt: new Date().toISOString() }
        list.push(auto as any)
        version = auto as any
      }
      if (version.status === 'published') return { status: 400, body: { message: 'Published version is read-only' } }
      const content = (body && (body as any).content) || ''
      const bundle = ensureBundle(projectId, versionId)
      bundle.main = String(content || '')
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return { content: bundle.main }
    }
  },

  // Get node content by explicit version id and node id
  {
    url: '/api/projects/:id/versions/:vid/knowledge/nodes/:nodeId/content',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const bundle = contentsMap[projectId]?.[versionId]
      const content = bundle?.nodes?.[nodeId] || ''
      return { content }
    }
  },
  // Update node content (by version id)
  {
    url: '/api/projects/:id/versions/:vid/knowledge/nodes/:nodeId/content',
    method: 'put',
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      let version = list.find((x) => x.id === versionId)
      if (!version) {
        const auto = { id: versionId, version: 'draft', status: 'draft' as const, createdAt: new Date().toISOString() }
        list.push(auto as any)
        version = auto as any
      }
      if (version.status === 'published') return { status: 400, body: { message: 'Published version is read-only' } }
      const content = (body && (body as any).content) || ''
      const bundle = ensureBundle(projectId, versionId)
      bundle.nodes[nodeId] = String(content || '')
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return { content: bundle.nodes[nodeId] }
    }
  },

  // Convenience: get main content for current stable version
  {
    url: '/api/projects/:id/versions/stable/knowledge/main',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const stableVid = getStableVersionId(projectId)
      if (!stableVid) return { status: 404, body: { message: 'No stable version' } }
      const bundle = contentsMap[projectId]?.[stableVid]
      return { content: bundle?.main || '' }
    }
  },
  // Convenience: get node content for current stable version
  {
    url: '/api/projects/:id/versions/stable/knowledge/nodes/:nodeId/content',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const stableVid = getStableVersionId(projectId)
      if (!stableVid) return { status: 404, body: { message: 'No stable version' } }
      const bundle = contentsMap[projectId]?.[stableVid]
      const content = bundle?.nodes?.[nodeId] || ''
      return { content }
    }
  }
] as MockMethod[]

// Export for other mock modules to maintain consistency (e.g. cleanup on node deletion)
export { contentsMap, versionsMap }
