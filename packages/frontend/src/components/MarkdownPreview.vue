<template>
  <div class="markdown-body text-sm leading-6" v-html="html"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const props = withDefaults(defineProps<{
  source: string
  breaks?: boolean
}>(), {
  breaks: true
})

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
  breaks: props.breaks,
  highlight(str: string, lang: string) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>` + hljs.highlight(str, { language: lang, ignoreIllegals: true }).value + '</code></pre>'
      }
      return `<pre class="hljs"><code>` + hljs.highlightAuto(str).value + '</code></pre>'
    } catch (e) {
      const esc = str.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string))
      return `<pre class=\"hljs\"><code>${esc}</code></pre>`
    }
  }
})

const html = computed(() => md.render(props.source || ''))
</script>

<style>
/* Standard-ish Markdown preview styles */
.markdown-body { color: #111827; }
.markdown-body h1 { font-size: 1.5rem; line-height: 2rem; margin: 1.2em 0 0.6em; font-weight: 600; }
.markdown-body h2 { font-size: 1.25rem; line-height: 1.75rem; margin: 1.1em 0 0.55em; font-weight: 600; }
.markdown-body h3 { font-size: 1.125rem; line-height: 1.5rem; margin: 1em 0 0.5em; font-weight: 600; }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body pre { margin: 1em 0; }
.markdown-body p { line-height: 1.75; }
.markdown-body ul { list-style: disc; padding-left: 1.25rem; }
.markdown-body ol { list-style: decimal; padding-left: 1.25rem; }
.markdown-body blockquote { color: #6b7280; border-left: 4px solid #e5e7eb; padding-left: 0.9rem; }
.markdown-body code { background: #f6f8fa; padding: 0.15em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.markdown-body pre { background: #f6f8fa; padding: 0.85rem; border-radius: 6px; overflow: auto; }
.markdown-body pre code { background: transparent; padding: 0; }
</style>
