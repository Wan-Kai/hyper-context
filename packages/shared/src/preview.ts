import type { KnowledgeNode, KnowledgeNodeType, KnowledgeLevel, StructuredExtendBlock } from './types.js'

// Extract text inside a simple XML-like tag. Handles &lt; &gt; &amp; escaping.
function extractTag(src: string, tag: string): string | null {
  const s = (src || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const re = new RegExp(`<\\s*${tag}\\s*>([\\s\\S]*?)<\\s*\\/\\s*${tag}\\s*>`, 'i')
  const m = re.exec(s)
  return m ? m[1].trim() : null
}

function extractAllBlocks(extendSrc: string): string[] {
  const out: string[] = []
  const re = /<\s*block\s*>([\s\S]*?)<\s*\/\s*block\s*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(extendSrc))) out.push(m[1])
  return out
}

type ParsedDoc = {
  head: { name: string; level: KnowledgeLevel; description: string; coreContent: string }
  extend: Array<Pick<StructuredExtendBlock, 'name' | 'level' | 'description' | 'content'>>
}

function parseStructuredDoc(src: string): ParsedDoc {
  const headSrc = extractTag(src || '', 'head') || ''
  const extendSrc = extractTag(src || '', 'extend') || ''
  const coreSrc = extractTag(src || '', 'core') || ''
  const name = extractTag(headSrc, 'name') || ''
  const level = (extractTag(headSrc, 'level') as KnowledgeLevel) || 'core'
  const description = extractTag(headSrc, 'description') || ''
  const coreContent = (coreSrc && extractTag(coreSrc, 'content')) || ''

  const blocks: ParsedDoc['extend'] = []
  for (const b of extractAllBlocks(extendSrc)) {
    blocks.push({
      name: extractTag(b, 'name') || '',
      level: ((extractTag(b, 'level') as KnowledgeLevel) || 'extend') as KnowledgeLevel,
      description: extractTag(b, 'description') || '',
      content: extractTag(b, 'content') || ''
    })
  }
  return { head: { name, level, description, coreContent }, extend: blocks }
}

function renderTree(nodes: KnowledgeNode[], indent = 0): string[] {
  const lines: string[] = []
  const pad = '  '.repeat(indent)
  for (const n of nodes) {
    if (n.type === ('folder' as KnowledgeNodeType)) {
      lines.push(`${pad}- ${n.name}/`)
      if (n.children && n.children.length) lines.push(...renderTree(n.children, indent + 1))
    } else {
      lines.push(`${pad}- ${n.name}`)
    }
  }
  return lines
}

function flattenFiles(nodes: KnowledgeNode[]): KnowledgeNode[] {
  const out: KnowledgeNode[] = []
  const walk = (list: KnowledgeNode[]) => {
    for (const n of list) {
      if (n.type === ('file' as KnowledgeNodeType)) out.push(n)
      if (n.children && n.children.length) walk(n.children)
    }
  }
  walk(nodes)
  return out
}

export function buildPreview(
  projectName: string,
  tree: KnowledgeNode[],
  contents: { main: string; nodes: Record<string, string> }
): string {
  const parts: string[] = []
  const main = (contents.main || '').trim()
  if (main) parts.push(main)

  const treeTitle = `# ${projectName || '项目'} 知识树`
  const treeLines = renderTree(tree || [])
  parts.push([treeTitle, '', ...treeLines].join('\n'))

  const detailsTitle = `# ${projectName || '项目'} 核心知识详情`
  const detailSections: string[] = []
  const files = flattenFiles(tree || [])
  for (const file of files) {
    const raw = contents.nodes?.[file.id] || ''
    const doc = parseStructuredDoc(raw)
    const name = (doc.head.name || file.name).trim()
    const desc = (doc.head.description || '').trim()
    const level = doc.head.level

    const sec: string[] = []
    sec.push(`## ${name}`)
    sec.push(desc ? `描述：${desc}` : '描述：—')

    if (level === 'core') {
      const coreMd = (doc.head.coreContent || '').trim()
      if (coreMd) {
        sec.push('')
        sec.push(coreMd)
      }
    } else {
      sec.push('')
      sec.push('部分非核心知识已省略，请使用 getKnowledgeIndex 获取本知识下省略的知识索引')
    }

    const blocks = (doc.extend || []).filter(Boolean)
    if (blocks.length) {
      sec.push('')
      sec.push('**扩展知识索引：**')
      const coreBlocks = blocks.filter((b) => (b.level || 'extend') === 'core')
      const nonCoreExists = blocks.some((b) => (b.level || 'extend') !== 'core')
      for (const b of coreBlocks) {
        const bn = (b.name || '').trim() || '未命名'
        const bd = (b.description || '').trim() || '无描述'
        sec.push(`- ${bn}: ${bd}`)
      }
      if (nonCoreExists) sec.push('- ...省略的其他扩展知识')
    }

    detailSections.push(sec.join('\n'))
  }
  parts.push([detailsTitle, '', ...detailSections].join('\n\n'))

  return parts.filter(Boolean).join('\n\n')
}
