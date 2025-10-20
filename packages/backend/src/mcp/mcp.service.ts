import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
// Local replica of shared MCP types to avoid ESM import in CJS build
// Keep in sync with packages/shared/src/mcp.ts
type McpTool = 'get-knowledge-index' | 'get-knowledge'
type McpErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'UNSUPPORTED_TOOL' | 'INTERNAL_ERROR'
type McpEvent =
  | { type: 'start'; tool: McpTool; params?: unknown }
  | { type: 'progress'; message: string }
  | { type: 'data'; data: unknown }
  | { type: 'end'; ok: true }
  | { type: 'error'; code: McpErrorCode; message: string }
type KnowledgeIndexBlock = { name: string; description: string }
type KnowledgeIndexFile = { name: string; blocks: KnowledgeIndexBlock[] }
type KnowledgeDetailBlock = KnowledgeIndexBlock & { content: string }
type KnowledgeDetailFile = { name: string; blocks: KnowledgeDetailBlock[] }
import { resolveName } from './name-resolver'

@Injectable()
export class McpService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------- Structured content parsing ----------------
  private extractTag(content: string, tag: string): string {
    if (!content) return ''
    const re = new RegExp(`<\\s*${tag}\\s*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`, 'i')
    const m = re.exec(content)
    return m ? m[1].trim() : ''
  }

  private parseExtendBlocks(extendContent: string) {
    const out: { name: string; description: string; content: string }[] = []
    if (!extendContent) return out
    const re = /<\s*block\s*>([\s\S]*?)<\s*\/\s*block\s*>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(extendContent))) {
      const body = m[1]
      const name = this.extractTag(body, 'name')
      const description = this.extractTag(body, 'description').replace(/\s+/g, ' ').trim()
      const content = this.extractTag(body, 'content')
      if (name) out.push({ name, description, content })
    }
    return out
  }

  private parseStructured(content: string) {
    const head = this.extractTag(content, 'head')
    const extend = this.extractTag(content, 'extend')
    return {
      headName: this.extractTag(head, 'name'),
      extendBlocks: this.parseExtendBlocks(extend),
    }
  }

  // ---------------- Version resolution ----------------
  async resolveVersionId(projectId: string, q?: { versionId?: string | null }): Promise<string> {
    const v = (q?.versionId || '').trim()
    if (!v || v.toLowerCase() === 'stable') {
      const st = await this.prisma.version.findFirst({ where: { projectId, isStable: true }, select: { id: true } })
      if (!st) throw new Error('No stable version')
      return st.id
    }
    if (v.toLowerCase() === 'draft') {
      const dr = await this.prisma.version.findFirst({ where: { projectId, status: 'draft' }, orderBy: { createdAt: 'desc' }, select: { id: true } })
      if (!dr) throw new Error('No draft version')
      return dr.id
    }
    // assume concrete id
    const ex = await this.prisma.version.findFirst({ where: { id: v, projectId }, select: { id: true } })
    if (!ex) throw new Error('Version not found')
    return ex.id
  }

  // ---------------- Tool handlers ----------------
  async *getKnowledgeIndex(
    projectId: string,
    q: { versionId?: string | null },
    payload: { name?: string; names?: string[] },
  ): AsyncGenerator<McpEvent> {
    yield { type: 'start', tool: 'get-knowledge-index', params: payload }
    const names: string[] = Array.isArray(payload.names)
      ? payload.names
      : payload.name
      ? [payload.name]
      : []
    if (!names.length) {
      yield { type: 'error', code: 'INVALID_INPUT', message: 'name or names is required' }
      return
    }
    let vid: string
    try {
      vid = await this.resolveVersionId(projectId, q)
    } catch (e: any) {
      yield { type: 'error', code: 'NOT_FOUND', message: e?.message || 'Version not found' }
      return
    }

    const files: KnowledgeIndexFile[] = []
    for (const spec of names) {
      yield { type: 'progress', message: `Resolving ${spec}` }
      const resolved = await resolveName(this.prisma, projectId, spec)
      if (!resolved.nodeId) continue
      const nc = await this.prisma.nodeContent.findUnique({
        where: { versionId_nodeId: { versionId: vid, nodeId: resolved.nodeId } },
        select: { content: true },
      })
      const parsed = this.parseStructured(nc?.content || '')
      const blocks: KnowledgeIndexBlock[] = parsed.extendBlocks.map((b) => ({ name: b.name, description: b.description }))
      files.push({ name: resolved.nodeName || parsed.headName || 'unknown', blocks })
      yield { type: 'data', data: { name: resolved.nodeName, blocks } }
    }
    yield { type: 'end', ok: true }
  }

  async *getKnowledge(
    projectId: string,
    q: { versionId?: string | null },
    payload: { name?: string; keys?: string[] },
  ): AsyncGenerator<McpEvent> {
    yield { type: 'start', tool: 'get-knowledge', params: payload }
    let keys: string[] = []
    let scopeNodeId: string | null = null
    let scopeNodeName: string | null = null
    if (typeof payload.name === 'string' && payload.name.trim()) {
      const { blockName, nodeId, nodeName } = await resolveName(this.prisma, projectId, payload.name)
      if (blockName) keys.push(blockName)
      scopeNodeId = nodeId
      scopeNodeName = nodeName
    }
    if (Array.isArray(payload.keys)) keys = keys.concat(payload.keys)
    // de-dup
    keys = Array.from(new Set(keys.filter((k) => !!k)))
    if (!keys.length) {
      yield { type: 'error', code: 'INVALID_INPUT', message: 'name (with #block) or keys[] is required' }
      return
    }

    let vid: string
    try {
      vid = await this.resolveVersionId(projectId, q)
    } catch (e: any) {
      yield { type: 'error', code: 'NOT_FOUND', message: e?.message || 'Version not found' }
      return
    }

    const results: KnowledgeDetailFile[] = []

    if (scopeNodeId) {
      // Restrict search within a single file when path provided
      const nc = await this.prisma.nodeContent.findUnique({
        where: { versionId_nodeId: { versionId: vid, nodeId: scopeNodeId } },
        select: { content: true },
      })
      const parsed = this.parseStructured(nc?.content || '')
      const matched = parsed.extendBlocks.filter((b) => keys.includes(b.name))
      if (matched.length) {
        const blocks: KnowledgeDetailBlock[] = matched.map((b) => ({ name: b.name, description: b.description, content: b.content }))
        results.push({ name: scopeNodeName || parsed.headName || 'unknown', blocks })
        yield { type: 'data', data: results[results.length - 1] }
      }
    } else {
      // Broad search across the project for these keys
      const list = await this.prisma.nodeContent.findMany({
        where: { versionId: vid },
        select: { content: true, node: { select: { name: true, type: true } } },
      })
      for (const item of list) {
        if (item.node.type !== 'file') continue
        const parsed = this.parseStructured(item.content || '')
        const matched = parsed.extendBlocks.filter((b) => keys.includes(b.name))
        if (!matched.length) continue
        const blocks: KnowledgeDetailBlock[] = matched.map((b) => ({ name: b.name, description: b.description, content: b.content }))
        const rec: KnowledgeDetailFile = { name: parsed.headName || item.node.name, blocks }
        results.push(rec)
        yield { type: 'data', data: rec }
      }
    }

    yield { type: 'end', ok: true }
  }
}
