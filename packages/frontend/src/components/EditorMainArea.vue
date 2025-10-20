<template>
  <div class="h-full min-h-0 flex flex-col">
    <!-- 主文档编辑器 -->
    <div v-if="isMain" class="h-full min-h-0">
      <MarkdownEditor v-model="innerContent" :readonly="!isEditable" />
    </div>

    <!-- 结构化编辑（非 main） -->
    <div v-else class="min-h-0 flex-1 overflow-auto flex flex-col gap-4">
      <!-- 核心区 -->
      <div class="rounded-lg border bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-medium text-gray-800">核心区</div>
          <div class="text-xs text-gray-500">基于当前目录：{{ selectedName || '-' }}</div>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="md:col-span-1">
            <label class="mb-1 block text-xs text-gray-600">知识名称</label>
            <input
              class="w-full rounded border px-2 py-1.5 text-sm bg-gray-50"
              :value="headLocal.name"
              disabled
            />
          </div>
          <div class="md:col-span-1">
            <label class="mb-1 block text-xs text-gray-600">知识等级</label>
            <Listbox v-model="headLocal.level" as="div" class="relative" :disabled="!isEditable">
              <ListboxButton
                class="relative w-full rounded border bg-white py-1.5 pl-3 pr-8 text-left text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!isEditable"
              >
                <span class="block truncate">{{ levelLabel(headLocal.level) }}</span>
                <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon class="h-4 w-4 text-gray-400" />
                </span>
              </ListboxButton>
              <ListboxOptions
                class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white py-1 text-sm shadow-lg focus:outline-none"
              >
                <ListboxOption
                  v-for="opt in levelOptions"
                  :key="opt.value"
                  :value="opt.value"
                  v-slot="{ active, selected }"
                >
                  <div
                    :class="[
                      active ? 'bg-gray-100' : 'bg-white',
                      'relative cursor-default select-none py-1.5 pl-8 pr-3'
                    ]"
                  >
                    <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{
                      opt.label
                    }}</span>
                    <span
                      v-if="selected"
                      class="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-600"
                    >
                      <CheckIcon class="h-4 w-4" />
                    </span>
                  </div>
                </ListboxOption>
              </ListboxOptions>
            </Listbox>
          </div>
          <div class="md:col-span-2">
            <label class="mb-1 block text-xs text-gray-600">知识描述</label>
            <textarea
              v-model="headLocal.description"
              rows="3"
              class="w-full rounded border px-2 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!isEditable"
              placeholder="请输入该知识点的描述"
            ></textarea>
          </div>
          <div v-if="headLocal.level === 'core'" class="md:col-span-2">
            <label class="mb-1 block text-xs text-gray-600">知识内容（核心）</label>
            <!-- 默认高度加大，提升编辑舒适度 -->
            <div class="h-80 min-h-0">
              <MarkdownEditor v-model="headLocal.coreContent" :readonly="!isEditable" />
            </div>
          </div>
        </div>
      </div>

      <!-- 扩展知识区 -->
      <div class="rounded-lg border bg-white p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-sm font-medium text-gray-800">扩展知识区</div>
          <button
            class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!isEditable"
            @click="addExtendBlock"
          >
            <PlusCircleIcon class="h-4 w-4" /> 新增扩展知识
          </button>
        </div>

        <div v-if="blocksLocal.length === 0" class="text-xs text-gray-500">
          暂无扩展知识，点击“新增扩展知识”创建。
        </div>

        <div v-for="(blk, idx) in blocksLocal" :key="blk.id" class="mb-4 rounded border p-3">
          <div class="mb-2 flex items-center justify-between">
            <div class="text-xs font-medium text-gray-700">扩展知识 #{{ idx + 1 }}</div>
            <div class="flex items-center gap-2">
              <button
                class="text-xs text-red-600 hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!isEditable"
                @click="removeExtendBlock(idx)"
              >
                删除
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div class="md:col-span-1">
              <label class="mb-1 block text-xs text-gray-600">知识名称</label>
              <input
                v-model="blk.name"
                class="w-full rounded border px-2 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                :class="{ 'border-red-500 focus:border-red-500': isDupName(idx) }"
                :disabled="!isEditable"
                placeholder="例如：MSI_api_list"
              />
              <p v-if="isDupName(idx)" class="mt-1 text-xs text-red-600">
                扩展名称需保证唯一（所有知识下）
              </p>
            </div>
            <div class="md:col-span-1">
              <label class="mb-1 block text-xs text-gray-600">知识等级</label>
              <Listbox v-model="blk.level" as="div" class="relative" :disabled="!isEditable">
                <ListboxButton
                  class="relative w-full rounded border bg-white py-1.5 pl-3 pr-8 text-left text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="!isEditable"
                >
                  <span class="block truncate">{{ levelLabel(blk.level) }}</span>
                  <span
                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
                  >
                    <ChevronUpDownIcon class="h-4 w-4 text-gray-400" />
                  </span>
                </ListboxButton>
                <ListboxOptions
                  class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded border bg-white py-1 text-sm shadow-lg focus:outline-none"
                >
                  <ListboxOption
                    v-for="opt in levelOptions"
                    :key="opt.value"
                    :value="opt.value"
                    v-slot="{ active, selected }"
                  >
                    <div
                      :class="[
                        active ? 'bg-gray-100' : 'bg-white',
                        'relative cursor-default select-none py-1.5 pl-8 pr-3'
                      ]"
                    >
                      <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">{{
                        opt.label
                      }}</span>
                      <span
                        v-if="selected"
                        class="absolute inset-y-0 left-0 flex items-center pl-2 text-primary-600"
                      >
                        <CheckIcon class="h-4 w-4" />
                      </span>
                    </div>
                  </ListboxOption>
                </ListboxOptions>
              </Listbox>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-xs text-gray-600">知识描述</label>
              <textarea
                v-model="blk.description"
                rows="2"
                class="w-full rounded border px-2 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="!isEditable"
              ></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="mb-1 block text-xs text-gray-600">知识内容</label>
              <!-- 默认高度加大，与核心内容统一 -->
              <div class="h-80 min-h-0">
                <MarkdownEditor v-model="blk.content" :readonly="!isEditable" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'
import { PlusCircleIcon } from '@heroicons/vue/24/outline'
import type { StructuredHead, StructuredExtendBlock, KnowledgeLevel } from '@/api/types'

type ExtendBlock = StructuredExtendBlock & { id: string }

const props = defineProps<{
  modelValue: string
  isMain: boolean
  isEditable: boolean
  selectedName: string
  head: StructuredHead
  blocks: ExtendBlock[]
  // 全局重复名称集合（由父组件计算），用于标红提示
  dupExtendNames?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'update:head', v: StructuredHead): void
  (e: 'update:blocks', v: ExtendBlock[]): void
}>()

// v-model bridge for content
const innerContent = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v)
})

// Local editable mirrors to avoid mutating props directly
const headLocal = ref<StructuredHead>({ name: '', level: 'core', description: '', coreContent: '' })
const blocksLocal = ref<ExtendBlock[]>([])
const dupNamesGlobalSet = computed<Set<string>>(() => new Set(props.dupExtendNames || []))

// Guard to prevent feedback loop between syncing props -> local and emitting local -> parent
const syncingFromProps = ref(false)

// init + sync from parent
watch(
  () => props.head,
  (v) => {
    // mark that we're syncing from parent to avoid emitting back
    syncingFromProps.value = true
    headLocal.value = JSON.parse(
      JSON.stringify(v || { name: '', level: 'core', description: '', coreContent: '' })
    )
    // clear the flag in a microtask so sibling watchers (blocks) can also run under the guard
    queueMicrotask(() => (syncingFromProps.value = false))
  },
  { immediate: true, deep: true }
)
watch(
  () => props.blocks,
  (v) => {
    // mark that we're syncing from parent to avoid emitting back
    syncingFromProps.value = true
    blocksLocal.value = JSON.parse(JSON.stringify(v || []))
    // clear the flag in a microtask so sibling watchers (head) can also run under the guard
    queueMicrotask(() => (syncingFromProps.value = false))
  },
  { immediate: true, deep: true }
)

// propagate to parent
watch(
  headLocal,
  (v) => {
    if (syncingFromProps.value) return
    if (!props.isEditable) return
    emit('update:head', JSON.parse(JSON.stringify(v)))
  },
  { deep: true }
)
watch(
  blocksLocal,
  (v) => {
    if (syncingFromProps.value) return
    if (!props.isEditable) return
    emit('update:blocks', JSON.parse(JSON.stringify(v)))
  },
  { deep: true }
)

function isDupName(index: number): boolean {
  const n = (blocksLocal.value[index]?.name || '').trim()
  if (!n) return false
  return dupNamesGlobalSet.value.has(n)
}

// level options
const levelOptions: Array<{ value: KnowledgeLevel; label: string }> = [
  { value: 'core', label: '核心' },
  { value: 'extend', label: '非核心' }
]
function levelLabel(v: KnowledgeLevel) {
  return levelOptions.find((o) => o.value === v)?.label || v
}

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
function addExtendBlock() {
  if (!props.isEditable) return
  const next = [...blocksLocal.value]
  next.push({ id: uid(), name: '', level: 'extend', description: '', content: '' })
  blocksLocal.value = next
}
function removeExtendBlock(i: number) {
  if (!props.isEditable) return
  const next = [...blocksLocal.value]
  next.splice(i, 1)
  blocksLocal.value = next
}
</script>

<style scoped>
/* rely on parent layout */
</style>
