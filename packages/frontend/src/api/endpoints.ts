import { httpGet, httpPost, httpPut, httpDelete, httpPatch } from './index'
import type {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  KnowledgeNode,
  CreateKnowledgeNodeRequest,
  Version,
  CreateVersionRequest,
  VersionSnapshot,
  ContentPayload,
  ContentResponse
} from './types'

export const projectApi = {
  getProjects(): Promise<Project[]> {
    return httpGet('/projects')
  },

  getProject(id: string): Promise<Project | null> {
    return httpGet(`/projects/${encodeURIComponent(id)}`)
  },

  createProject(payload: CreateProjectRequest): Promise<Project> {
    return httpPost('/projects', payload)
  },

  updateProject(id: string, payload: UpdateProjectRequest): Promise<Project> {
    return httpPut(`/projects/${encodeURIComponent(id)}` , payload)
  },

  deleteProject(id: string): Promise<void> {
    return httpDelete(`/projects/${encodeURIComponent(id)}`)
  }
}

// Knowledge tree endpoints (mocked in dev; proxied in prod)
export const knowledgeApi = {
  getTree(projectId: string): Promise<KnowledgeNode[]> {
    return httpGet(`/projects/${encodeURIComponent(projectId)}/knowledge/tree`)
  },

  createNode(projectId: string, payload: CreateKnowledgeNodeRequest): Promise<KnowledgeNode> {
    return httpPost(`/projects/${encodeURIComponent(projectId)}/knowledge/nodes`, payload)
  },

  deleteNode(projectId: string, nodeId: string): Promise<void> {
    return httpDelete(`/projects/${encodeURIComponent(projectId)}/knowledge/nodes/${encodeURIComponent(nodeId)}`)
  },

  // rename only
  updateNode(projectId: string, nodeId: string, payload: { name?: string }): Promise<KnowledgeNode> {
    return httpPatch(`/projects/${encodeURIComponent(projectId)}/knowledge/nodes/${encodeURIComponent(nodeId)}`, payload)
  },

  // move/reorder
  // If opts.versionId is provided, perform move within that version's draft tree; otherwise use project-level working tree
  moveNode(
    projectId: string,
    nodeId: string,
    payload: { targetParentId: string | null; beforeId?: string | null },
    opts?: { versionId?: string }
  ): Promise<void> {
    const base = `/projects/${encodeURIComponent(projectId)}`
    const path = opts?.versionId
      ? `${base}/versions/${encodeURIComponent(opts.versionId)}/knowledge/nodes/${encodeURIComponent(nodeId)}/move`
      : `${base}/knowledge/nodes/${encodeURIComponent(nodeId)}/move`
    return httpPost(path, payload)
  }
}

// Version endpoints
export const versionApi = {
  list(projectId: string): Promise<Version[]> {
    return httpGet(`/projects/${encodeURIComponent(projectId)}/versions`)
  },
  create(projectId: string, payload?: CreateVersionRequest): Promise<Version> {
    return httpPost(`/projects/${encodeURIComponent(projectId)}/versions`, payload || {})
  },
  setStable(projectId: string, versionId: string): Promise<void> {
    return httpPost(`/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/stable`)
  },
  publish(projectId: string, versionId: string): Promise<Version> {
    return httpPost(`/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/publish`)
  },
  // Fetch full snapshot by version: directory tree + file contents + main
  snapshot(
    projectId: string,
    versionId: string,
    opts?: { rootId?: string | null }
  ): Promise<VersionSnapshot> {
    const q = opts?.rootId ? `?rootId=${encodeURIComponent(opts.rootId)}` : ''
    return httpGet(`/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/snapshot${q}`)
  }
}

// Content endpoints (main markdown and per-node structured content)
export const contentApi = {
  // Version-scoped main document
  getMain(projectId: string, versionId: string): Promise<ContentResponse> {
    return httpGet(`/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/knowledge/main`)
  },
  setMain(projectId: string, versionId: string, payload: ContentPayload): Promise<ContentResponse> {
    return httpPut(`/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/knowledge/main`, payload)
  },

  // Version-scoped node document
  getNode(
    projectId: string,
    versionId: string,
    nodeId: string
  ): Promise<ContentResponse> {
    return httpGet(
      `/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/knowledge/nodes/${encodeURIComponent(nodeId)}/content`
    )
  },
  setNode(
    projectId: string,
    versionId: string,
    nodeId: string,
    payload: ContentPayload
  ): Promise<ContentResponse> {
    return httpPut(
      `/projects/${encodeURIComponent(projectId)}/versions/${encodeURIComponent(versionId)}/knowledge/nodes/${encodeURIComponent(nodeId)}/content`,
      payload
    )
  },

  // Stable read helpers (no write)
  getStableMain(projectId: string): Promise<ContentResponse> {
    return httpGet(`/projects/${encodeURIComponent(projectId)}/versions/stable/knowledge/main`)
  },
  getStableNode(projectId: string, nodeId: string): Promise<ContentResponse> {
    return httpGet(
      `/projects/${encodeURIComponent(projectId)}/versions/stable/knowledge/nodes/${encodeURIComponent(nodeId)}/content`
    )
  }
}
