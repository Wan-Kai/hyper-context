// MCP shared types: tools, streaming events, and payloads
// Keep minimal and framework-agnostic so both frontend and backend can reuse.

export type McpTool = 'get-knowledge-index' | 'get-knowledge'

// Error codes to standardize handling across clients
export type McpErrorCode =
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'UNSUPPORTED_TOOL'
  | 'INTERNAL_ERROR'

// Streamed event frames over NDJSON
export type McpEvent =
  | { type: 'start'; tool: McpTool; params?: unknown }
  | { type: 'progress'; message: string }
  | { type: 'data'; data: unknown }
  | { type: 'end'; ok: true }
  | { type: 'error'; code: McpErrorCode; message: string }

// Tool inputs
// Note: The spec in mcp.md mentions a single `name` string. To keep flexibility
// and be backward compatible with the referenced examples that use arrays,
// we support both single and multiple forms in the service implementation.
export interface GetKnowledgeIndexInputSingle {
  name: string
}
export interface GetKnowledgeIndexInputMany {
  names: string[]
}
export type GetKnowledgeIndexInput = GetKnowledgeIndexInputSingle | GetKnowledgeIndexInputMany

export interface GetKnowledgeInputSingleKey {
  name: string // e.g. "path/to/file#blockName" or a raw block name
}
export interface GetKnowledgeInputManyKeys {
  keys: string[] // block names
}
export type GetKnowledgeInput = GetKnowledgeInputSingleKey | GetKnowledgeInputManyKeys

// Tool outputs
export interface KnowledgeIndexBlock {
  name: string
  description: string
}

export interface KnowledgeIndexFile {
  name: string // file name
  blocks: KnowledgeIndexBlock[]
}

export interface KnowledgeDetailBlock extends KnowledgeIndexBlock {
  content: string
}

export interface KnowledgeDetailFile {
  name: string
  blocks: KnowledgeDetailBlock[]
}

// Request envelope for the streaming endpoint
export interface McpInvokeRequest {
  tool: McpTool
  params?: unknown
}

