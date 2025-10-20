import type { MockMethod } from 'vite-plugin-mock'
import { contentsMap, versionsMap } from './knowledge-content'
import type { KnowledgeNode as Node } from '@hyper-context/shared'
import { KnowledgeNodeType, VersionStatus } from '@hyper-context/shared'

// in-memory knowledge trees keyed by project id
const initialTrees: Record<string, Node[]> = {
  'p-001': [
    { id: 'k-01', name: '介绍.md', type: KnowledgeNodeType.File, parentId: null },
    {
      id: 'k-02',
      name: '指南',
      type: KnowledgeNodeType.Folder,
      parentId: null,
      children: [
        { id: 'k-02-01', name: '快速开始.md', type: KnowledgeNodeType.File, parentId: 'k-02' },
        {
          id: 'k-02-02',
          name: '高级',
          type: KnowledgeNodeType.Folder,
          parentId: 'k-02',
          children: [
            { id: 'k-02-02-01', name: '配置.md', type: KnowledgeNodeType.File, parentId: 'k-02-02' },
            { id: 'k-02-02-02', name: '性能优化.md', type: KnowledgeNodeType.File, parentId: 'k-02-02' }
          ]
        },
        { id: 'k-02-03', name: '最佳实践.md', type: KnowledgeNodeType.File, parentId: 'k-02' }
      ]
    },
    {
      id: 'k-03',
      name: '参考',
      type: KnowledgeNodeType.Folder,
      parentId: null,
      children: [
        { id: 'k-03-01', name: 'API 列表.md', type: KnowledgeNodeType.File, parentId: 'k-03' }
      ]
    }
  ],
  'p-002': [],
  'p-003': []
}

// Ensure single shared state across mock modules via globalThis
export const trees: Record<string, Node[]> =
  ((globalThis as any).__HC_TREES__ ||= initialTrees)

let seq = 1000

function findNodeAndParent(
  list: Node[],
  id: string,
  parent: Node | null = null
): { node: Node | null; parent: Node | null } {
  for (const n of list) {
    if (n.id === id) return { node: n, parent }
    if (n.type === KnowledgeNodeType.Folder && n.children && n.children.length) {
      const res = findNodeAndParent(n.children, id, n)
      if (res.node) return res
    }
  }
  return { node: null, parent: null }
}

function removeNode(list: Node[], id: string): boolean {
  const idx = list.findIndex((n) => n.id === id)
  if (idx !== -1) {
    list.splice(idx, 1)
    return true
  }
  for (const n of list) {
    if (n.type === KnowledgeNodeType.Folder && n.children) {
      const ok = removeNode(n.children, id)
      if (ok) return true
    }
  }
  return false
}

function getChildrenOf(list: Node[], parentId: string | null | undefined): Node[] {
  if (!parentId) return list
  const { node: parent } = findNodeAndParent(list, parentId)
  if (parent && parent.type === KnowledgeNodeType.Folder) {
    parent.children = parent.children || []
    return parent.children
  }
  return list
}

// Return true if targetParentId is within the subtree of sourceId (or equals sourceId)
function isDescendant(list: Node[], sourceId: string, targetParentId: string | null | undefined): boolean {
  if (!targetParentId) return false
  if (sourceId === targetParentId) return true
  // walk up from targetParentId to root; if we hit sourceId, then target is within source's subtree
  let currentId: string | null | undefined = targetParentId
  while (currentId) {
    const { node, parent } = findNodeAndParent(list, currentId)
    if (!node) break
    if (node.id === sourceId) return true
    currentId = parent?.id || null
  }
  return false
}

export default [
  // Version-aware Move node (draft only)
  {
    url: '/api/projects/:id/versions/:vid/knowledge/nodes/:nodeId/move',
    method: 'post',
    statusCode: 204,
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const versionId = decodeURIComponent(String((query as any).vid || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const { targetParentId, beforeId } = (body || {}) as {
        targetParentId?: string | null
        beforeId?: string | null
      }
      const list = trees[projectId] || (trees[projectId] = [])
      // read version status from versionsMap (lazily require to avoid circular)
      const { versionsMap } = require('./knowledge-content') as any
      const vs = versionsMap[projectId] || []
      let v = vs.find((x: any) => x.id === versionId)
      if (!v) {
        // auto-create as draft for robustness in dev
        v = { id: versionId, version: 'draft', status: VersionStatus.Draft as const, createdAt: new Date().toISOString() }
        vs.push(v)
      }
      if (v.status === VersionStatus.Published) {
        return { status: 400, body: { message: 'Published version is read-only' } }
      }
      const { node, parent } = findNodeAndParent(list, nodeId)
      if (!node) return { status: 404, body: { message: 'Node not found' } }
      if (isDescendant(list, node.id, targetParentId ?? null)) {
        return { status: 400, body: { message: 'Cannot move folder into its own subtree' } }
      }
      const srcSiblings = getChildrenOf(list, parent?.id || null)
      const idx = srcSiblings.findIndex((n) => n.id === nodeId)
      if (idx !== -1) srcSiblings.splice(idx, 1)
      const dstSiblings = getChildrenOf(list, targetParentId ?? null)
      node.parentId = targetParentId ?? null
      let insertAt = typeof beforeId === 'string' && beforeId
        ? dstSiblings.findIndex((n) => n.id === beforeId)
        : -1
      if (insertAt < 0) insertAt = dstSiblings.length
      dstSiblings.splice(insertAt, 0, node)
      // 更新项目更新时间，便于 Dashboard 排序
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return null
    }
  },
  // Get knowledge tree for a project
  {
    url: '/api/projects/:id/knowledge/tree',
    method: 'get',
    response: ({ query }) => {
      const id = decodeURIComponent(String((query as any).id || ''))
      const tree = trees[id] || []
      // Deep clone to avoid accidental mutation
      return JSON.parse(JSON.stringify(tree))
    }
  },
  // Create node (file or folder)
  {
    url: '/api/projects/:id/knowledge/nodes',
    method: 'post',
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const { parentId, name, type } = (body || {}) as {
        parentId?: string | null
        name?: string
        type?: KnowledgeNodeType
      }
      if (!name || !type) {
        return { status: 400, body: { message: 'Invalid payload' } }
      }
      const newNode: Node = {
        id: `k-${seq++}`,
        name,
        type,
        parentId: parentId ?? null,
        children: type === KnowledgeNodeType.Folder ? [] : undefined
      }
      const list = trees[projectId] || (trees[projectId] = [])
      if (!parentId) {
        list.push(newNode)
      } else {
        const { node: parent } = findNodeAndParent(list, parentId)
        if (!parent || parent.type !== KnowledgeNodeType.Folder) {
          return { status: 400, body: { message: 'Parent not found or not a folder' } }
        }
        parent.children = parent.children || []
        parent.children.push(newNode)
      }
      // Initialize draft content for the latest draft version (if any)
      try {
        const draft = (versionsMap[projectId] || []).find((v) => v.status === VersionStatus.Draft)
        if (draft && newNode.type === KnowledgeNodeType.File) {
          const pv = (contentsMap[projectId] ||= {})
          const bundle = (pv[draft.id] ||= { main: pv[draft.id]?.main || '', nodes: pv[draft.id]?.nodes || {} })
          const structuredDraft = [
            '<head>',
            `  <name>${name}</name>`,
            '  <level>core</level>',
            '  <description>草稿：请补充描述</description>',
            '</head>',
            '',
            '<core>',
            '  <content>',
            '    初始核心内容草稿',
            '  </content>',
            '</core>',
            '',
            '<extend>',
            '  <block>',
            '    <name>示例</name>',
            '    <level>extend</level>',
            '    <description>可选</description>',
            '    <content>',
            '      初始内容草稿',
            '    </content>',
            '  </block>',
            '</extend>'
          ].join('\n')
          bundle.nodes[newNode.id] = bundle.nodes[newNode.id] || structuredDraft
        }
      } catch (_) {}
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return newNode
    }
  },
  // Update node (rename)
  {
    url: '/api/projects/:id/knowledge/nodes/:nodeId',
    method: 'patch',
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const list = trees[projectId] || (trees[projectId] = [])
      const { node } = findNodeAndParent(list, nodeId)
      if (!node) return { status: 404, body: { message: 'Node not found' } }
      const patch = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
      if (typeof patch.name === 'string' && patch.name.trim()) {
        node.name = patch.name.trim()
      }
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return JSON.parse(JSON.stringify(node))
    }
  },
  // Delete node
  {
    url: '/api/projects/:id/knowledge/nodes/:nodeId',
    method: 'delete',
    statusCode: 204,
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const list = trees[projectId] || (trees[projectId] = [])
      const ok = removeNode(list, nodeId)
      if (!ok) return { status: 404, body: { message: 'Node not found' } }
      // cleanup contents for all versions
      const bundles = contentsMap[projectId]
      if (bundles) {
        for (const vid of Object.keys(bundles)) {
          if (bundles[vid]?.nodes && nodeId in bundles[vid].nodes) {
            delete bundles[vid].nodes[nodeId]
          }
        }
      }
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return null
    }
  },
  // Move node
  {
    url: '/api/projects/:id/knowledge/nodes/:nodeId/move',
    method: 'post',
    statusCode: 204,
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const nodeId = decodeURIComponent(String((query as any).nodeId || ''))
      const { targetParentId, beforeId } = (body || {}) as {
        targetParentId?: string | null
        beforeId?: string | null
      }
      const list = trees[projectId] || (trees[projectId] = [])
      const { node, parent } = findNodeAndParent(list, nodeId)
      if (!node) return { status: 404, body: { message: 'Node not found' } }
      if (isDescendant(list, node.id, targetParentId ?? null)) {
        return { status: 400, body: { message: 'Cannot move folder into its own subtree' } }
      }
      // remove from old siblings
      const srcSiblings = getChildrenOf(list, parent?.id || null)
      const idx = srcSiblings.findIndex((n) => n.id === nodeId)
      if (idx !== -1) srcSiblings.splice(idx, 1)
      // insert into destination
      const dstSiblings = getChildrenOf(list, targetParentId ?? null)
      node.parentId = targetParentId ?? null
      let insertAt = typeof beforeId === 'string' && beforeId
        ? dstSiblings.findIndex((n) => n.id === beforeId)
        : -1
      if (insertAt < 0) insertAt = dstSiblings.length
      dstSiblings.splice(insertAt, 0, node)
      // 更新项目更新时间
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) p.updatedAt = new Date().toISOString()
      } catch (_) {}
      return null
    }
  }
] as MockMethod[]
