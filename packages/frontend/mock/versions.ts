import type { MockMethod } from 'vite-plugin-mock'
import type { Version } from '@hyper-context/shared'
import { VersionStatus } from '@hyper-context/shared'

const now = Date.now()
// Keep counters in global to survive hot reloads
;(globalThis as any).__HC_VER_SEQ__ = (globalThis as any).__HC_VER_SEQ__ || 300
const seqRef = (globalThis as any).__HC_VER_SEQ__

function make(
  id: string,
  version: string,
  offsetHours: number,
  stable = false,
  notes?: string,
  status: VersionStatus = VersionStatus.Published
): Version {
  return {
    id,
    version,
    isStable: stable || undefined,
    createdAt: new Date(now - offsetHours * 3600 * 1000).toISOString(),
    notes,
    status
  }
}

// Exported for other mocks (e.g. knowledge content) to reference current stable version
const initialVersions: Record<string, Version[]> = {
  'p-001': [
    make('v-2.1.0', '2.1.0', 24 * 24, true, '稳定发布', VersionStatus.Published),
    make('v-2.2.0', '2.2.0', 24 * 20, false, '性能优化', VersionStatus.Published),
    make('v-2.3.0', '2.3.0', 24 * 15, false, '新功能 A', VersionStatus.Published),
    make('v-2.3.1', '2.3.1', 24 * 13, false, 'Bug 修复', VersionStatus.Published),
    make('v-2.4.0', '2.4.0', 24 * 10, false, '功能 B 与改进', VersionStatus.Published),
    make('v-2.5.0-beta', '2.5.0-beta', 24 * 6, false, 'Beta 版', VersionStatus.Published),
    make('v-2.5.0-rc.1', '2.5.0-rc.1', 24 * 2, false, 'RC1', VersionStatus.Published),
    make('v-2.5.0-rc.2', '2.5.0-rc.2', 36, false, 'RC2', VersionStatus.Published)
  ],
  'p-002': [
    make('v-0.9.0', '0.9.0', 24 * 40, true, undefined, VersionStatus.Published),
    make('v-0.9.1', '0.9.1', 24 * 30, false, undefined, VersionStatus.Published),
    make('v-0.9.2', '0.9.2', 24 * 20, false, undefined, VersionStatus.Published),
    make('v-1.0.0-beta', '1.0.0-beta', 24 * 10, false, undefined, VersionStatus.Published)
  ],
  'p-003': [
    make('v-2.0.0', '2.0.0', 24 * 50, true, undefined, VersionStatus.Published),
    make('v-2.1.0', '2.1.0', 24 * 35, false, undefined, VersionStatus.Published),
    make('v-2.2.0', '2.2.0', 24 * 15, false, undefined, VersionStatus.Published)
  ]
}

export const versionsMap: Record<string, Version[]> =
  ((globalThis as any).__HC_VERSIONS__ ||= initialVersions)

export default [
  // list versions
  {
    url: '/api/projects/:id/versions',
    method: 'get',
    response: ({ query }) => {
      const id = decodeURIComponent(String((query as any).id || ''))
      return (versionsMap[id] || []).slice()
    }
  },
  // single version meta
  {
    url: '/api/projects/:id/versions/:vid',
    method: 'get',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const vid = decodeURIComponent(String((query as any).vid || ''))
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      let v = list.find((x) => x.id === vid)
      if (!v) {
        // Auto-create as draft when missing to smooth dev reloads
        v = { id: vid, version: 'draft', createdAt: new Date().toISOString(), status: VersionStatus.Draft }
        list.push(v as any)
      }
      return v
    }
  },
  // stable version meta
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
  // create version
  {
    url: '/api/projects/:id/versions',
    method: 'post',
    response: ({ query, body }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      const version = (body && (body as any).version) || `0.0.${(globalThis as any).__HC_VER_SEQ__++}`
      const notes = (body && (body as any).notes) || ''
      // Duplicate check: if conflict, return 400 to mimic backend behavior
      const used = new Set(list.map((v) => v.version))
      if (used.has(version)) {
        return { status: 400, body: { message: 'Version already exists' } }
      }
      const id = `v-${Date.now()}`
      const v: Version = { id, version, createdAt: new Date().toISOString(), notes, status: VersionStatus.Draft }
      list.push(v)
      return v
    }
  },
  // mark stable
  {
    url: '/api/projects/:id/versions/:vid/stable',
    method: 'post',
    response: ({ query }) => {
      const projectId = decodeURIComponent(String((query as any).id || ''))
      const vid = decodeURIComponent(String((query as any).vid || ''))
      const list = versionsMap[projectId] || (versionsMap[projectId] = [])
      const t = list.find((x) => x.id === vid)
      if (!t) return { status: 404, body: { message: 'Version not found' } }
      if (t.status !== VersionStatus.Published) {
        return { status: 400, body: { message: 'Only published versions can be marked stable' } }
      }
      for (const v of list) v.isStable = undefined
      t.isStable = true
      // 同步更新项目概览中的 stableVersion 与 updatedAt（供 Dashboard 展示）
      try {
        const mod = require('./project') as any
        const projects = mod.projects as Array<any>
        const p = projects.find((p: any) => p.id === projectId)
        if (p) {
          p.stableVersion = t.version || '—'
          // 规则：有稳定版本视为 MCP active
          p.mcpStatus = 'active'
          p.updatedAt = new Date().toISOString()
        }
      } catch (_) {}
      return t
    }
  }
] as MockMethod[]
