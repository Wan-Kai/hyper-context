// Official MCP JSON-RPC client for Streamable HTTP transport
// We keep it minimal and use fetch directly.

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number | null
  method: string
  params?: any
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0'
  id: string | number | null
  result?: T
  error?: { code: number; message: string; data?: any }
}

export async function mcpRpc<T = any>(projectId: string, payload: JsonRpcRequest | JsonRpcRequest[]): Promise<JsonRpcResponse<T> | JsonRpcResponse<T>[]> {
  const url = `/api/projects/${encodeURIComponent(projectId)}/mcp-rpc`
  const resp = await fetch(url, {
    method: 'POST',
    // MCP server requires the client to accept both JSON and SSE stream
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify(payload),
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  const ct = resp.headers.get('content-type') || ''
  if (ct.includes('application/json')) {
    return (await resp.json()) as any
  }
  if (ct.includes('text/event-stream')) {
    // Minimal SSE collector: return the last JSON message frame
    const reader = resp.body?.getReader()
    if (!reader) throw new Error('Readable stream not supported')
    const decoder = new TextDecoder()
    let buffer = ''
    let lastJson: any = null
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // Process complete SSE events separated by blank lines
      let sepIndex: number
      // Normalize to \n for simplicity
      buffer = buffer.replace(/\r\n/g, '\n')
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        const lines = rawEvent.split('\n')
        const dataLines: string[] = []
        for (const line of lines) {
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
        }
        if (dataLines.length) {
          const joined = dataLines.join('\n')
          try {
            lastJson = JSON.parse(joined)
          } catch {
            // ignore non-JSON frames
          }
        }
      }
    }
    if (lastJson) return lastJson as any
    throw new Error('Empty SSE response')
  }
  // Fallback: attempt JSON
  try {
    return (await resp.json()) as any
  } catch {
    const text = await resp.text()
    throw new Error(text || 'Unknown MCP response')
  }
}

export async function toolsList(projectId: string) {
  const req: JsonRpcRequest = { jsonrpc: '2.0', id: 'tools-list', method: 'tools/list' }
  const res = await mcpRpc(projectId, req)
  if ('error' in res && res.error) throw new Error(res.error.message)
  return (res as any).result
}

export async function callTool(projectId: string, name: string, args?: any) {
  const req: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: 'tools-call-' + name,
    method: 'tools/call',
    params: { name, arguments: args || {} },
  }
  const res = await mcpRpc(projectId, req)
  if ('error' in res && res.error) throw new Error(res.error.message)
  return (res as any).result
}
