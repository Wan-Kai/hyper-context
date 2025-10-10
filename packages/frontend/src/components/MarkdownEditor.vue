<template>
  <div ref="root" class="h-full w-full rounded-md border"></div>
  <!-- The editor mounts into the div above -->
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { EditorState, Compartment, EditorSelection } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

// Props: v-model (string); readonly to lock editor in published versions
const props = defineProps<{ modelValue: string; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const root = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let pushing = false // avoid feedback loop when updating from outside
const editable = new Compartment()

onMounted(() => {
  if (!root.value) return

  // Custom light highlight for Markdown keywords (headings, links, code, quotes...)
  const mdHighlight = HighlightStyle.define([
    { tag: [t.heading, t.heading1, t.heading2, t.heading3], color: '#2563eb', fontWeight: '600' },
    { tag: [t.heading4, t.heading5, t.heading6], color: '#1d4ed8', fontWeight: '600' },
    { tag: [t.emphasis], color: '#0f766e' },
    { tag: [t.strong], color: '#0f172a', fontWeight: '700' },
    { tag: [t.quote], color: '#64748b', fontStyle: 'italic' },
    // Inline & fenced code content
    {
      tag: [t.monospace],
      color: '#b45309',
      backgroundColor: '#FFF7ED',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      padding: '0 3px',
      borderRadius: '4px'
    },
    { tag: [t.link, t.url], color: '#0369a1', textDecoration: 'none' },
    { tag: [t.separator], color: '#9ca3af' }
  ])

  const extensions = [
    markdown(),
    EditorView.lineWrapping,
    syntaxHighlighting(mdHighlight, { fallback: true }),
    // Key handling: keep things minimal, but make Tab insert a tab character
    // (prevents focus change and matches common Markdown editors)
    keymap.of([
      {
        key: 'Tab',
        run(v) {
          // Respect read-only mode: don't intercept Tab when not editable
          if (!v.state.facet(EditorView.editable)) return false
          const unit = '  ' // use spaces instead of a tab to avoid markdown code-block styling
          const tr = v.state.changeByRange((r) => {
            const doc = v.state.doc
            const startLine = doc.lineAt(r.from)
            const endLine = doc.lineAt(r.to)
            const isMultiLine = startLine.number !== endLine.number

            if (isMultiLine) {
              // Indent every line covered by the selection
              const changes = [] as { from: number; insert: string }[]
              for (let ln = startLine.number; ln <= endLine.number; ln++) {
                const l = doc.line(ln)
                changes.push({ from: l.from, insert: unit })
              }
              const linesCount = endLine.number - startLine.number + 1
              const added = unit.length * linesCount
              const newFrom = r.from + unit.length
              const newTo = r.to + added
              return {
                changes,
                range: EditorSelection.range(newFrom, newTo)
              }
            }

            // Single-line cases
            const line = startLine
            const lineText = line.text
            const isList = /^\s*(?:[-+*]|\d+[.)])\s/.test(lineText)
            if (r.empty && isList) {
              // In list items, indent the whole line (nest the list level)
              return {
                changes: { from: line.from, insert: unit },
                range: EditorSelection.cursor(r.from + unit.length)
              }
            }
            // Default: insert spaces at cursor or replace selection
            return {
              changes: { from: r.from, to: r.to, insert: unit },
              range: EditorSelection.cursor(r.from + unit.length)
            }
          })
          v.dispatch(tr)
          return true
        }
      },
      {
        key: 'Shift-Tab',
        run(v) {
          if (!v.state.facet(EditorView.editable)) return false
          const unitLen = 2
          const tr = v.state.changeByRange((r) => {
            const doc = v.state.doc
            const startLine = doc.lineAt(r.from)
            const endLine = doc.lineAt(r.to)
            const isMultiLine = startLine.number !== endLine.number

            const indentLen = (text: string) => {
              const m = text.match(/^[\t ]+/)
              const indent = m ? m[0] : ''
              if (!indent) return 0
              return indent.startsWith('\t') ? 1 : Math.min(unitLen, indent.length)
            }

            if (isMultiLine) {
              const changes = [] as { from: number; to: number }[]
              let totalRemoved = 0
              let removedAtStart = 0
              for (let ln = startLine.number; ln <= endLine.number; ln++) {
                const l = doc.line(ln)
                const rem = indentLen(l.text)
                if (rem > 0) {
                  changes.push({ from: l.from, to: l.from + rem })
                  totalRemoved += rem
                  if (ln === startLine.number) removedAtStart = rem
                }
              }
              const newFrom = Math.max(startLine.from, r.from - removedAtStart)
              const newTo = Math.max(startLine.from, r.to - totalRemoved)
              return {
                changes,
                range: EditorSelection.range(newFrom, newTo)
              }
            }

            // Single line: remove leading indent from current line
            const line = startLine
            const remove = indentLen(line.text)
            if (!remove) return { range: EditorSelection.cursor(r.from) }
            const from = line.from
            const to = line.from + remove
            const newPos = Math.max(from, r.from - remove)
            return {
              changes: { from, to },
              range: EditorSelection.cursor(newPos)
            }
          })
          v.dispatch(tr)
          return true
        }
      }
    ]),
    // Toggleable editable compartment
    editable.of(EditorView.editable.of(!(props.readonly ?? false))),
    // Tidy, minimal theme
    EditorView.theme({
      '&': { fontSize: '13px' },
      '&.cm-editor': { borderRadius: '0.375rem', height: '100%' },
      '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', height: '100%' },
      '.cm-content': { padding: '12px' },
      '.cm-gutters': { display: 'none' }, // hide line numbers for a clean look
      // Remove active-line highlight completely
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
      // Softer selection background; remove any underline artifacts
      '.cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'rgba(37, 99, 235, 0.18)'
      },
      // Composition (IME) range: use a soft background, no underline
      '.cm-compositionRange': {
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        textDecoration: 'none',
        outline: 'none'
      },
      // Focus ring off; rely on surrounding card focus styles
      '&.cm-focused': { outline: 'none' },
      // Cursor color
      '.cm-cursor': { borderLeftColor: '#111827' }
    })
  ]

  view = new EditorView({
    state: EditorState.create({ doc: props.modelValue || '', extensions }),
    parent: root.value,
    dispatch(tr) {
      if (!view) return
      view.update([tr])
      if (tr.docChanged) {
        pushing = true
        emit('update:modelValue', view.state.doc.toString())
        // next microtask: allow external watchers to settle
        queueMicrotask(() => (pushing = false))
      }
    }
  })
})

// Sync external value into editor (when switching files)
watch(
  () => props.modelValue,
  (v) => {
    if (!view) return
    const cur = view.state.doc.toString()
    if (pushing || v === cur) return
    view.dispatch({
      changes: { from: 0, to: cur.length, insert: v ?? '' }
    })
  }
)

// React to readonly prop changes at runtime
watch(
  () => props.readonly,
  (ro) => {
    if (!view) return
    view.dispatch({ effects: editable.reconfigure(EditorView.editable.of(!(ro ?? false))) })
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})
</script>

<style scoped>
/* Ensure the editor fills parent container height */
div[ref="root"] { height: 100%; }
</style>
