// 共享类型（前后端对齐）
// 说明：与 packages/frontend/src/api/types.ts 及《后端接口+数据库设计.md》保持口径一致。

// ------- 通用 -------
export type McpStatus = 'active' | 'inactive' | 'error'

// 某些服务仍可能返回信封结构，这里保留泛型定义以备不时之需。
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
  timestamp?: string
}

// ------- 项目 Project -------
export interface Project {
  id: string
  name: string
  description: string
  // 文件型知识点数量
  knowledgeCount: number
  // 若无稳定版，后端建议直接返回 '—' 以便前端展示
  stableVersion: string
  mcpStatus: McpStatus
  // 更新时间（ISO）
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

// PUT /projects/:id 支持的更新字段（与前端一致）
export type UpdateProjectRequest = Partial<
  Pick<Project, 'name' | 'description' | 'stableVersion' | 'mcpStatus' | 'knowledgeCount'>
>

// ------- 知识目录树 Knowledge -------
export type KnowledgeNodeType = 'file' | 'folder'

export interface KnowledgeNode {
  id: string
  name: string
  type: KnowledgeNodeType
  parentId?: string | null
  children?: KnowledgeNode[]
}

export interface CreateKnowledgeNodeRequest {
  parentId?: string | null
  name: string
  type: KnowledgeNodeType
}

export interface UpdateKnowledgeNodeRequest {
  name?: string
}

export interface MoveKnowledgeNodeRequest {
  nodeId: string
  targetParentId: string | null
  beforeId?: string | null
}

// ------- 版本 Version / 内容 -------
export type VersionStatus = 'draft' | 'published'

export interface Version {
  id: string
  version: string
  // 后端可选返回；前端也根据 status 推断只读/可编辑
  isStable?: boolean
  createdAt: string
  notes?: string
  status?: VersionStatus
}

export interface CreateVersionRequest {
  version?: string
  notes?: string
}

// 某一版本的完整快照（树 + 内容）
export interface VersionSnapshot {
  version: Version
  tree: KnowledgeNode[]
  contents: {
    // 项目级主文档 Markdown
    main: string
    // 节点内容，按 nodeId 映射
    nodes: Record<string, string>
  }
}

// 单个内容读/写接口的负载与响应
export interface ContentPayload {
  content: string
}
export type ContentResponse = ContentPayload

// ------- 可选：分页响应（当前未启用，保留以便未来支持）
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
