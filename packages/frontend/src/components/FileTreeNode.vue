<template>
  <div>
    <div
      class="group relative flex h-7 items-center gap-1 rounded px-2 text-sm hover:bg-gray-100"
      :class="[
        { 'bg-gray-200': selectedId === node.id && node.type === 'file' },
        editable && hoverPos === 'inside' && node.type === 'folder' ? 'ring-2 ring-primary-500 ring-inset' : ''
      ]"
      :style="{ paddingLeft: depth * 12 + 'px' }"
      :draggable="editable"
      @dragstart="onDragStart"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Drop indicator line: before -->
      <div
        v-if="hoverPos === 'before'"
        class="pointer-events-none absolute -top-0.5 left-0 right-0 z-10 h-0 border-t-2 border-primary-500"
      ></div>
      <!-- Drop indicator line: after -->
      <div
        v-if="hoverPos === 'after'"
        class="pointer-events-none absolute -bottom-0.5 left-0 right-0 z-10 h-0 border-t-2 border-primary-500"
      ></div>
      <Tooltip :text="expandedIds.has(node.id) ? '收起' : '展开'">
        <button
          v-if="node.type === 'folder'"
          class="flex h-5 w-5 items-center justify-center text-gray-600 hover:text-gray-800"
          @click="$emit('toggle', node.id)"
          aria-label="Toggle"
        >
          <ChevronDownIcon v-if="expandedIds.has(node.id)" class="h-4 w-4" />
          <ChevronRightIcon v-else class="h-4 w-4" />
        </button>
        <span v-else class="h-5 w-5"></span>
      </Tooltip>

      <span class="flex h-5 w-5 items-center justify-center text-gray-500">
        <FolderIcon v-if="node.type === 'folder'" class="h-4 w-4" />
        <DocumentTextIcon v-else class="h-4 w-4" />
      </span>
      <button
        class="flex-1 truncate text-left"
        :title="node.name"
        @click="onNameClick"
      >
        {{ node.name }}
      </button>
      <div v-if="editable" class="invisible ml-1 flex items-center gap-1 group-hover:visible">
        <Tooltip v-if="node.type === 'folder'" text="新建文件">
          <button
            class="rounded p-1 text-gray-600 hover:bg-gray-200"
            @click.stop="$emit('create-file', node.id)"
          >
            <DocumentPlusIcon class="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip v-if="node.type === 'folder'" text="新建文件夹">
          <button
            class="rounded p-1 text-gray-600 hover:bg-gray-200"
            @click.stop="$emit('create-folder', node.id)"
          >
            <FolderPlusIcon class="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip text="重命名">
          <button
            class="rounded p-1 text-gray-600 hover:bg-gray-200"
            @click.stop="$emit('rename', node.id)"
          >
            <PencilSquareIcon class="h-4 w-4" />
          </button>
        </Tooltip>
        <Tooltip text="删除">
          <button
            class="rounded p-1 text-red-600 hover:bg-red-100"
            @click.stop="$emit('delete-node', node.id)"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </Tooltip>
      </div>
    </div>
    <div
      v-if="
        node.type === 'folder' && expandedIds.has(node.id) && node.children && node.children.length
      "
    >
      <FileTreeNode
        v-for="(c, i) in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :expanded-ids="expandedIds"
        :selected-id="selectedId"
        :editable="editable"
        :siblings="node.children"
        :index="i"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @create-file="$emit('create-file', $event)"
        @create-folder="$emit('create-folder', $event)"
        @delete-node="$emit('delete-node', $event)"
        @rename="$emit('rename', $event)"
        @move-node="$emit('move-node', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue'
defineOptions({ name: 'FileTreeNode' })
import {
  ChevronRightIcon,
  ChevronDownIcon,
  FolderIcon,
  DocumentTextIcon,
  DocumentPlusIcon,
  FolderPlusIcon,
  TrashIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'
import Tooltip from './Tooltip.vue'

type NodeType = 'file' | 'folder'
interface Node {
  id: string
  name: string
  type: NodeType
  parentId?: string | null
  children?: Node[]
}

const props = defineProps({
  node: { type: Object as PropType<Node>, required: true },
  depth: { type: Number, required: true },
  expandedIds: { type: Object as PropType<Set<string>>, required: true },
  selectedId: { type: String as PropType<string | null>, default: null },
  editable: { type: Boolean, default: true },
  // siblings of current node (to support before/after drop)
  siblings: { type: Array as PropType<Node[]>, required: true },
  index: { type: Number, required: true }
})

const emit = defineEmits<{
  (e: 'toggle', id: string): void
  (e: 'select', node: Node): void
  (e: 'create-file', parentId: string | null): void
  (e: 'create-folder', parentId: string | null): void
  (e: 'delete-node', id: string): void
  (e: 'rename', id: string): void
  (
    e: 'move-node',
    payload: { nodeId: string; targetParentId: string | null; beforeId?: string | null }
  ): void
}>()

function onNameClick() {
  if (props.node.type === 'folder') emit('toggle', props.node.id)
  else emit('select', props.node)
}

function onDragStart(e: DragEvent) {
  if (!props.editable) return
  try {
    e.dataTransfer?.setData('text/plain', props.node.id)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
  } catch (_) {}
}

// Hover position for visual feedback: reactive to render indicator line
const hoverPos = ref<'before' | 'after' | 'inside' | null>(null)

function calcHoverPos(e: DragEvent): 'before' | 'after' | 'inside' {
  const el = (e.currentTarget as HTMLElement) || (e.target as HTMLElement)
  const rect = el.getBoundingClientRect()
  const y = e.clientY - rect.top
  const ratio = y / Math.max(rect.height, 1)
  if (ratio < 0.3) return 'before'
  if (ratio > 0.7) return 'after'
  return 'inside'
}

function onDragOver(e: DragEvent) {
  if (!props.editable) return
  const pos = calcHoverPos(e)
  hoverPos.value = pos
  // Change dropEffect hint (always "move" for our use case)
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onDragLeave() {
  // Keep simple: clear indicator; it will reappear on the next dragover
  hoverPos.value = null
}

function onDrop(e: DragEvent) {
  if (!props.editable) return
  const draggedId = e.dataTransfer?.getData('text/plain') || ''
  hoverPos.value = null
  if (!draggedId || draggedId === props.node.id) return

  const parentId = props.node.parentId ?? null
  const thisId = props.node.id

  const pos = calcHoverPos(e)

  if (pos === 'inside' && props.node.type === 'folder') {
    // Drop into folder: append to end
    emit('move-node', { nodeId: draggedId, targetParentId: thisId })
    return
  }

  // Otherwise treat as reordering before/after current node within its siblings
  if (pos === 'before') {
    emit('move-node', { nodeId: draggedId, targetParentId: parentId, beforeId: thisId })
    return
  }

  // after: find next sibling id; if none, append to end (beforeId: null)
  const sibs = props.siblings || []
  const idx = props.index
  const next = sibs[idx + 1]
  emit('move-node', {
    nodeId: draggedId,
    targetParentId: parentId,
    beforeId: next ? next.id : null
  })
}
</script>

<style scoped>
/* Minimal; parent handles layout */
</style>
