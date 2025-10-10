<template>
  <div class="file-tree select-none">
    <FileTreeNode
      v-for="(n, i) in nodes"
      :key="n.id"
      :node="n"
      :depth="0"
      :expanded-ids="expandedIds"
      :selected-id="selectedId || null"
      :editable="editable"
      :siblings="nodes"
      :index="i"
      @toggle="toggle"
      @select="$emit('select', $event)"
      @create-file="$emit('create-file', $event)"
      @create-folder="$emit('create-folder', $event)"
      @delete-node="$emit('delete-node', $event)"
      @rename="$emit('rename', $event)"
      @move-node="$emit('move-node', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, defineProps, defineEmits, watch } from 'vue'
import FileTreeNode from './FileTreeNode.vue'

type NodeType = 'file' | 'folder'
interface Node { id: string; name: string; type: NodeType; parentId?: string | null; children?: Node[] }

const props = defineProps<{ nodes: Node[]; selectedId?: string | null; editable?: boolean }>()
defineEmits<{
  (e: 'select', node: Node): void
  (e: 'create-file', parentId: string | null): void
  (e: 'create-folder', parentId: string | null): void
  (e: 'delete-node', id: string): void
  (e: 'rename', id: string): void
  (e: 'move-node', payload: { nodeId: string; targetParentId: string | null; beforeId?: string | null }): void
}>()

// expanded ids stored locally
const expandedIds = reactive(new Set<string>())
function toggle(id: string) {
  if (expandedIds.has(id)) expandedIds.delete(id)
  else expandedIds.add(id)
}

// Auto-expand ancestors when selectedId changes so the selected node is visible
function findPath(list: Node[], id: string, trail: string[] = []): string[] | null {
  for (const n of list) {
    if (n.id === id) return trail
    if (n.children && n.children.length) {
      const res = findPath(n.children, id, [...trail, n.id])
      if (res) return res
    }
  }
  return null
}

watch(
  () => props.selectedId,
  (id) => {
    if (!id) return
    const path = findPath(props.nodes || [], id)
    if (path && path.length) {
      for (const pid of path) expandedIds.add(pid)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
/* Rely on Tailwind utilities */
</style>
