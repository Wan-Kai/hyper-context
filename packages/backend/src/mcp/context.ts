import { AsyncLocalStorage } from 'node:async_hooks'

export interface McpRequestContext {
  projectId: string
}

export const mcpRequestContext = new AsyncLocalStorage<McpRequestContext>()

