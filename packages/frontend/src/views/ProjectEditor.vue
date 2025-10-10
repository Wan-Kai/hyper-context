<template>
  <!-- Fill the available height provided by the app shell's <main> (not the raw viewport) -->
  <div class="project-editor h-full flex flex-col">
    <!-- 顶部工具栏 -->
    <div class="border-b bg-white p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <!-- Back: icon-only, larger, without border -->
          <button
            class="inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
            @click="goDashboard"
            aria-label="返回"
            title="返回"
          >
            <ArrowLeftIcon class="h-6 w-6 text-gray-700" />
          </button>
          <div class="min-w-0">
            <div class="truncate text-lg font-semibold">{{ project?.name || '加载中...' }}</div>
            <div class="mt-0.5 text-xs text-gray-500">
              稳定版: v{{ stableVersion || project?.stableVersion || 'N/A' }}
            </div>
          </div>
        </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <button
              class="rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!isEditable"
              @click="saveDraft"
            >
              保存
            </button>
            <button
              class="rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="!isEditable"
              @click="publishCurrentVersion"
            >
              发布
            </button>
            <button
              class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              @click="previewPrompt"
            >
              预览提示词
            </button>
            <button class="rounded-md border px-3 py-1.5 text-sm" @click="testMcp">测试MCP</button>
          </div>
      </div>

      </div>
      <!-- 主体区域 -->
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <!-- 左侧知识目录树 -->
        <aside class="w-80 shrink-0 border-r bg-gray-50 p-3 min-h-0 overflow-y-auto">
          <div class="mb-2 flex items-center justify-between">
            <div class="text-sm font-medium text-gray-700">知识目录</div>
            <div class="flex items-center gap-1">
              <button
                class="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                title="新建文件"
                :disabled="!isEditable"
                @click="openCreateFileModal(null)"
              >
                <DocumentPlusIcon class="h-4 w-4" />
                <span>新建文件</span>
              </button>
              <button
                class="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                title="新建文件夹"
                :disabled="!isEditable"
                @click="openCreateFolderModal(null)"
              >
                <FolderPlusIcon class="h-4 w-4" />
                <span>新建文件夹</span>
              </button>
            </div>
          </div>
          <div>
            <!-- 让“默认内容”与文件树节点的选中样式保持一致（统一背景/圆角/高度/左右留白） -->
            <div
              class="group relative flex h-7 cursor-pointer items-center gap-1 rounded px-2 text-sm hover:bg-gray-100"
              :class="{ 'bg-gray-200': currentFile === 'main' }"
              @click="currentFile = 'main'"
              role="button"
              tabindex="0"
              @keydown.enter.prevent="currentFile = 'main'"
              @keydown.space.prevent="currentFile = 'main'"
            >
              <!-- 与 FileTreeNode 左侧占位保持一致（使用 Tooltip 包裹以匹配 DOM 结构与高度计算） -->
              <Tooltip text="">
                <span class="h-5 w-3"></span>
              </Tooltip>
              <!-- 与 FileTreeNode 图标大小/颜色一致 -->
              <span class="flex h-5 w-5 items-center justify-center text-gray-500">
                <DocumentTextIcon class="h-4 w-4" />
              </span>
              <span class="flex-1 truncate text-left">核心内容</span>
            </div>
          </div>
          <FileTree
            :nodes="knowledgeTree"
            :selected-id="currentFile !== 'main' ? currentFile : null"
            :editable="isEditable"
            @select="onSelectNode"
            @create-file="openCreateFileModal"
            @create-folder="openCreateFolderModal"
            @delete-node="openDeleteModal"
            @rename="openRenameModal"
            @move-node="moveNode"
          />
        </aside>

        <!-- 中央编辑 + 右侧信息 -->
        <section class="flex min-w-0 flex-1 min-h-0 overflow-hidden">
          <!-- 编辑区 -->
          <div class="min-w-0 flex-1 p-4 overflow-hidden">
            <div class="h-full min-h-0 flex flex-col">
              <!-- 单一编辑器：仅在选择“默认内容”时展示 -->
              <!-- Use h-full to consume remaining vertical space instead of a viewport-based calc -->
              <div v-if="currentFile === 'main'" class="h-full min-h-0">
                <MarkdownEditor v-model="editingContent" :readonly="!isEditable" />
              </div>

              <!-- 结构化编辑：非“默认内容”时展示（核心区 + 扩展知识区） -->
              <div v-else class="min-h-0 flex-1 overflow-auto flex flex-col gap-4">
                <!-- 核心区 -->
                <div class="rounded-lg border bg-white p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="text-sm font-medium text-gray-800">核心区</div>
                    <div class="text-xs text-gray-500">
                      基于当前目录：{{ selectedNode?.name || '-' }}
                    </div>
                  </div>
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div class="md:col-span-1">
                      <label class="mb-1 block text-xs text-gray-600">知识名称</label>
                      <input
                        class="w-full rounded border px-2 py-1.5 text-sm bg-gray-50"
                        :value="structHead.name"
                        disabled
                      />
                    </div>
                    <div class="md:col-span-1">
                      <label class="mb-1 block text-xs text-gray-600">知识等级</label>
                      <Listbox v-model="structHead.level" as="div" class="relative">
                        <ListboxButton
                          class="relative w-full cursor-default rounded border bg-white py-1.5 pl-3 pr-8 text-left text-sm"
                        >
                          <span class="block truncate">{{ levelLabel(structHead.level) }}</span>
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
                              <span
                                :class="[
                                  selected ? 'font-medium' : 'font-normal',
                                  'block truncate'
                                ]"
                                >{{ opt.label }}</span
                              >
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
                        v-model="structHead.description"
                        rows="3"
                        class="w-full rounded border px-2 py-1.5 text-sm"
                        placeholder="请输入该知识点的描述"
                      ></textarea>
                    </div>
                  </div>
                </div>

                <!-- 扩展知识区 -->
                <div class="rounded-lg border bg-white p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="text-sm font-medium text-gray-800">扩展知识区</div>
                    <button
                      class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      @click="addExtendBlock"
                    >
                      <PlusCircleIcon class="h-4 w-4" /> 新增扩展知识
                    </button>
                  </div>

                  <div v-if="structBlocks.length === 0" class="text-xs text-gray-500">
                    暂无扩展知识，点击“新增扩展知识”创建。
                  </div>

                  <div
                    v-for="(blk, idx) in structBlocks"
                    :key="blk.id"
                    class="mb-4 rounded border p-3"
                  >
                    <div class="mb-2 flex items-center justify-between">
                      <div class="text-xs font-medium text-gray-700">扩展知识 #{{ idx + 1 }}</div>
                      <div class="flex items-center gap-2">
                        <button
                          class="text-xs text-red-600 hover:underline"
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
                          class="w-full rounded border px-2 py-1.5 text-sm"
                          placeholder="例如：MSI_api_list"
                        />
                      </div>
                      <div class="md:col-span-1">
                        <label class="mb-1 block text-xs text-gray-600">知识等级</label>
                        <Listbox v-model="blk.level" as="div" class="relative">
                          <ListboxButton
                            class="relative w-full cursor-default rounded border bg-white py-1.5 pl-3 pr-8 text-left text-sm"
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
                                <span
                                  :class="[
                                    selected ? 'font-medium' : 'font-normal',
                                    'block truncate'
                                  ]"
                                  >{{ opt.label }}</span
                                >
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
                          class="w-full rounded border px-2 py-1.5 text-sm"
                        ></textarea>
                      </div>
                      <div class="md:col-span-2">
                        <label class="mb-1 block text-xs text-gray-600">知识内容</label>
                        <div class="h-48 min-h-0">
                          <MarkdownEditor v-model="blk.content" :readonly="!isEditable" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 右侧信息区（版本 / MCP） -->
          <div class="basis-[325px] shrink-0 border-l bg-gray-50 p-4 flex flex-col min-h-0 h-full overflow-hidden">
            <div class="flex min-h-0 flex-col gap-4">
              <div class="rounded-lg border bg-white p-4 pr-6 pb-6">
                <div class="mb-3 flex items-center justify-between">
                  <div class="text-sm font-medium text-gray-800">版本</div>
                  <button
                    class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    @click="createNewVersion"
                  >
                    <PlusCircleIcon class="h-4 w-4" />
                    <span>新建版本</span>
                  </button>
                </div>
                <div class="relative max-h-[300px] overflow-y-auto overflow-x-visible pr-2">
                  <VersionTimeline
                    :versions="versions"
                    :current-id="currentVersionId"
                    :show-header="false"
                    @select="switchToVersion"
                    @mark-stable="markAsStableById"
                  />
                </div>
              </div>
              <div class="rounded-lg border bg-white p-4">
                <div class="mb-1 flex items-center justify-between text-sm">
                  <span>MCP 服务</span>
                  <span class="text-xs" :class="mcpStatusClass">{{ mcpStatus }}</span>
                </div>
                <div class="text-xs text-gray-500">最近检查：—</div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <!-- Full-screen Preview Modal -->
      <teleport to="body">
        <div v-if="showPreview" class="modal-overlay z-50" @click.self="showPreview = false">
          <div class="modal-panel z-50">
            <div class="flex items-center justify-between border-b bg-white px-4 py-3">
              <div class="text-sm font-medium">提示词预览</div>
              <button class="rounded-md border px-2 py-1 text-xs" @click="showPreview = false">
                关闭
              </button>
            </div>
            <div class="flex-1 min-h-0 overflow-auto bg-white p-6">
              <MarkdownPreview :source="previewContent" :breaks="true" />
            </div>
          </div>
        </div>
      </teleport>

      <!-- Modals: use HeadlessUI-based components, avoid browser prompts -->
      <DeleteConfirmModal
        v-model="showDeleteModal"
        :name="deleteTarget?.name"
        :loading="deleteLoading"
        @confirm="confirmDelete"
      />
      <TextInputModal
        v-model="showNameModal"
        :title="nameModal.title"
        :label="nameModal.label"
        :placeholder="nameModal.placeholder"
        :initial-value="nameModal.initialValue"
        :confirm-text="nameModal.confirmText"
        :confirm-text-loading="nameModal.confirmTextLoading"
        :loading="nameModalLoading"
        :validate="validateName"
        :required="true"
        @submit="submitNameModal"
      />
      <VersionBumpModal
        v-model="showVersionBumpModal"
        :latest-version="latestSemver"
        :loading="versionCreateLoading"
        @submit="submitCreateVersion"
      />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, knowledgeApi, versionApi, contentApi } from '@/api/endpoints'
import type { Project, KnowledgeNode, Version } from '@/api/types'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import FileTree from '@/components/FileTree.vue'
import VersionTimeline from '@/components/VersionTimeline.vue'
import {
  DocumentPlusIcon,
  FolderPlusIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/vue/24/outline'
import Tooltip from '@/components/Tooltip.vue'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/vue/20/solid'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import TextInputModal from '@/components/modals/TextInputModal.vue'
import VersionBumpModal from '@/components/modals/VersionBumpModal.vue'

const route = useRoute()
const router = useRouter()
const projectId = ref<string>(String(route.params.id || ''))
const project = ref<Project | null>(null)
const loading = ref(false)

// 简化数据结构
const currentFile = ref<'main' | string>('main')
const mainContent = ref<string>('')
const structuredContent = ref<string>('')
const knowledgeTree = ref<KnowledgeNode[]>([])
// 按版本快照返回的文件内容映射：nodeId -> content
const fileContents = ref<Record<string, string>>({})

const versions = ref<Version[]>([])
const currentVersionId = ref<string>('')
const stableVersion = ref<string | null>(null)
const currentVersion = computed(() => versions.value.find((v) => v.id === currentVersionId.value))
// 本地草稿版本集合（用于在后端状态接入前，临时标记新建版本为可编辑）
const localDraftIds = ref<string[]>([])
// 可编辑性：新设计使用 status=draft|published；为兼容现有 mock，回退到版本名为“工作副本”视为可编辑
// 最新版本（按创建时间倒序）的 id（用于在后端未提供 status 前推断草稿态）
const newestVersionId = computed(() => {
  const sorted = [...versions.value].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
  return sorted[0]?.id || ''
})

const isEditable = computed(() => {
  const v = currentVersion.value as any
  if (!v) return false
  if (localDraftIds.value.includes(v.id)) return true
  if (v.status) return v.status === 'draft'
  // 回退策略：当后端未提供 status 时，将“最新且未标记稳定”的版本视为草稿（可编辑）
  return v.id === newestVersionId.value && !v.isStable
})
// 在创建文件后用于在快照加载完成后自动选中文件
const pendingSelectFileId = ref<string | null>(null)

const mcpStatus = ref<'active' | 'inactive' | 'error'>('inactive')
const mcpStatusClass = computed(() =>
  mcpStatus.value === 'active'
    ? 'text-green-600'
    : mcpStatus.value === 'error'
      ? 'text-red-600'
      : 'text-gray-500'
)

const previewContent = computed(() => {
  const header = project.value ? `# 项目: ${project.value.name}\n` : ''
  const main = currentFile.value === 'main' ? mainContent.value : ''
  const kn = currentFile.value !== 'main' ? structuredContent.value : ''
  return `${header}${main}\n\n${kn}`.trim()
})

// Modal: full-screen preview on demand
const showPreview = ref(false)
const prevBodyOverflow = ref<string | null>(null)
// Using lightweight MarkdownPreview component (markdown-it + hljs)

// Bind editor to the active file content
const editingContent = computed({
  get() {
    return currentFile.value === 'main' ? mainContent.value : structuredContent.value
  },
  set(v: string) {
    if (currentFile.value === 'main') {
      mainContent.value = v
    } else {
      structuredContent.value = v
      // 同步到映射，避免丢失编辑内容
      fileContents.value[currentFile.value] = v
    }
  }
})

// ---------- 结构化编辑模型（非“默认内容”时） ----------
type KnowledgeLevel = 'core' | 'extend'
type ExtendBlock = {
  id: string
  name: string
  level: KnowledgeLevel
  description: string
  content: string
}

const selectedNode = computed(() =>
  currentFile.value !== 'main' ? findNodeById(knowledgeTree.value, currentFile.value) : null
)

const structHead = ref<{ name: string; level: KnowledgeLevel; description: string }>({
  name: '',
  level: 'core',
  description: ''
})
const structBlocks = ref<ExtendBlock[]>([])

// 生成唯一 id（仅前端临时使用）
function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function addExtendBlock() {
  structBlocks.value.push({ id: uid(), name: '', level: 'extend', description: '', content: '' })
}
function removeExtendBlock(i: number) {
  structBlocks.value.splice(i, 1)
}

// 解析与生成（粗略 XML-like 文本）
function extractTag(src: string, tag: string): string | null {
  const m = src.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`))
  return m ? m[1].trim() : null
}
function extractAllBlocks(extendSrc: string): string[] {
  const out: string[] = []
  const re = /<block>([\s\S]*?)<\/block>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(extendSrc))) out.push(m[1])
  return out
}
function parseStructuredText(src: string) {
  const headSrc = extractTag(src, 'head') || ''
  const extendSrc = extractTag(src, 'extend') || ''
  const name = extractTag(headSrc, 'name') || (selectedNode.value?.name ?? '')
  const level = (extractTag(headSrc, 'level') as KnowledgeLevel) || 'core'
  const description = extractTag(headSrc, 'description') || ''
  structHead.value = { name, level, description }

  const blocks: ExtendBlock[] = []
  for (const b of extractAllBlocks(extendSrc)) {
    blocks.push({
      id: uid(),
      name: extractTag(b, 'name') || '',
      level: ((extractTag(b, 'level') as KnowledgeLevel) || 'extend') as KnowledgeLevel,
      description: extractTag(b, 'description') || '',
      content: extractTag(b, 'content') || ''
    })
  }
  structBlocks.value = blocks
}

function indent(text: string, pad = '  '): string {
  if (!text) return ''
  return text
    .split('\n')
    .map((l) => (l.length ? pad + l : l))
    .join('\n')
}
function toStructuredText() {
  const head = [
    '<head>',
    `  <name>${structHead.value.name}</name>`,
    `  <level>${structHead.value.level}</level>`,
    `  <description>${structHead.value.description}</description>`,
    '</head>'
  ].join('\n')

  const blocks = structBlocks.value
    .map((b) => {
      const content = b.content ? `\n${indent(b.content, '    ')}\n  ` : ''
      return [
        '  <block>',
        `    <name>${b.name}</name>`,
        `    <level>${b.level}</level>`,
        `    <description>${b.description}</description>`,
        `    <content>${content}</content>`,
        '  </block>'
      ].join('\n')
    })
    .join('\n')

  const extend = ['<extend>', blocks, '</extend>'].join('\n')
  return [head, '', extend].join('\n')
}

// 切换到非 main 文件时，基于 structuredContent 解析；同时用所选目录名覆盖 head.name
watch(
  () => currentFile.value,
  () => {
    if (currentFile.value === 'main') return
    // 覆盖名称为目录/文件名（只读）
    structHead.value.name = selectedNode.value?.name || ''
    // 切换文件时从快照映射中取出对应内容
    structuredContent.value = fileContents.value[currentFile.value] || ''
    parseStructuredText(structuredContent.value || '')
    // 若解析后名称为空，回填
    if (!structHead.value.name) structHead.value.name = selectedNode.value?.name || ''
  }
)

// 任意字段变化时，重新生成 structuredContent（仅限非 main）
watch(
  [structHead, structBlocks, currentFile],
  () => {
    if (currentFile.value === 'main') return
    // 始终使用选中节点名作为 head.name 的来源
    if (selectedNode.value?.name) structHead.value.name = selectedNode.value.name
    structuredContent.value = toStructuredText()
    // 将生成结果同步到当前版本的内容映射
    fileContents.value[currentFile.value] = structuredContent.value
  },
  { deep: true }
)

// 下拉选项：知识等级
const levelOptions: Array<{ value: KnowledgeLevel; label: string }> = [
  { value: 'core', label: '核心知识' },
  { value: 'extend', label: '扩展知识' }
]
function levelLabel(v: KnowledgeLevel) {
  return levelOptions.find((o) => o.value === v)?.label || v
}

onMounted(load)
// 切换版本时，通过新接口拉取该版本的目录 + 内容快照
watch(
  () => currentVersionId.value,
  async (vid) => {
    if (!vid) return
    await loadVersionSnapshot(vid)
  }
)
// Lock body scroll when modal is open
watch(showPreview, (open) => {
  if (typeof window === 'undefined') return
  const body = document.body
  if (open) {
    prevBodyOverflow.value = body.style.overflow || ''
    body.style.overflow = 'hidden'
  } else {
    if (prevBodyOverflow.value !== null) body.style.overflow = prevBodyOverflow.value
    prevBodyOverflow.value = null
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined' && prevBodyOverflow.value !== null) {
    document.body.style.overflow = prevBodyOverflow.value
  }
})

async function load() {
  try {
    loading.value = true
    const p = await projectApi.getProject(projectId.value)
    project.value = p
    // 初始化版本信息
    await loadVersions()
    mcpStatus.value = p?.mcpStatus || 'inactive'
    // loadVersionSnapshot 将由 currentVersionId 的 watch 触发
  } catch (err) {
    console.error('加载项目失败', err)
  } finally {
    loading.value = false
  }
}

// 根据版本获取完整快照：目录树 + 主文档 + 节点内容
async function loadVersionSnapshot(vid: string) {
  try {
    const snap = await versionApi.snapshot(projectId.value, vid)
    knowledgeTree.value = snap.tree || []
    mainContent.value = snap.contents?.main || ''
    fileContents.value = { ...(snap.contents?.nodes || {}) }
    // 切回“核心内容”；如果当前选中文件在新树中仍存在，则载入其内容
    if (currentFile.value !== 'main') {
      const exists = !!findNodeById(knowledgeTree.value, currentFile.value)
      if (!exists) {
        currentFile.value = 'main'
      } else {
        structuredContent.value = fileContents.value[currentFile.value] || ''
      }
    }
    // 如果存在待选中文件（新建文件场景），在刷新后选择它
    if (pendingSelectFileId.value) {
      const exists = !!findNodeById(knowledgeTree.value, pendingSelectFileId.value)
      if (exists) {
        currentFile.value = pendingSelectFileId.value
        structuredContent.value = fileContents.value[pendingSelectFileId.value] || ''
      }
      pendingSelectFileId.value = null
    }
  } catch (err) {
    // 若快照 404，则刷新版本列表并回退选择，再由 watcher 触发重新加载
    const status = (err as any)?.status || (err as any)?.response?.status || null
    if (status === 404) {
      console.warn('快照版本不存在，刷新版本列表并回退选择...')
      const nextId = await ensureValidVersionId()
      if (nextId && nextId !== vid) {
        // 主动再拉一次，避免依赖 watch 导致感知延迟
        await loadVersionSnapshot(nextId)
      }
      return
    }
    console.error('加载版本快照失败', err)
  }
}

// 确保 currentVersionId 指向有效版本；若无效则回退到草稿或最新；返回最终可用的版本 id（或 null）
async function ensureValidVersionId(): Promise<string | null> {
  await loadVersions()
  const exists = versions.value.some((v) => v.id === currentVersionId.value)
  if (exists) return currentVersionId.value || null
  const draft = (versions.value as any[]).find((v) => v.status === 'draft')
  const fallback = draft?.id || newestVersionId.value || (versions.value[0]?.id ?? '')
  currentVersionId.value = fallback
  return fallback || null
}

async function loadVersions() {
  try {
    const list = await versionApi.list(projectId.value)
    versions.value = list
    const stable = versions.value.find((v) => v.isStable)
    stableVersion.value = stable ? stable.version : project.value?.stableVersion || null
    // 保持当前选择：若当前选择已不存在，再回退到草稿或最新
    const exists = versions.value.some((v) => v.id === currentVersionId.value)
    if (!exists) {
      const draft = (versions.value as any[]).find((v) => v.status === 'draft')
      currentVersionId.value = draft?.id || newestVersionId.value || (versions.value[0]?.id ?? '')
    }
  } catch (err) {
    console.error('加载版本失败', err)
  }
}

function onSelectNode(node: KnowledgeNode) {
  if (node.type === 'file') {
    currentFile.value = node.id
  }
}

// --- File/Folder operations via app modals ---
// Centralized name modal state to support create/rename flows
const showNameModal = ref(false)
const nameModalLoading = ref(false)
const nameModal = ref({
  title: '',
  label: '名称',
  placeholder: '',
  initialValue: '',
  confirmText: '确定',
  confirmTextLoading: '处理中...'
})
const nameModalCtx = ref<{
  action: 'create-file' | 'create-folder' | 'rename'
  parentId: string | null
  targetId: string | null
}>({ action: 'create-file', parentId: null, targetId: null })

// Toolbar buttons reuse the same open* helpers
function openCreateFileModal(parentId: string | null) {
  nameModal.value = {
    title: '新建文件',
    label: '文件名',
    placeholder: '未命名',
    initialValue: '未命名',
    confirmText: '创建',
    confirmTextLoading: '创建中...'
  }
  nameModalCtx.value = { action: 'create-file', parentId, targetId: null }
  showNameModal.value = true
}

function openCreateFolderModal(parentId: string | null) {
  nameModal.value = {
    title: '新建文件夹',
    label: '文件夹名',
    placeholder: '新建文件夹',
    initialValue: '新建文件夹',
    confirmText: '创建',
    confirmTextLoading: '创建中...'
  }
  nameModalCtx.value = { action: 'create-folder', parentId, targetId: null }
  showNameModal.value = true
}

function openRenameModal(id: string) {
  const node = findNodeById(knowledgeTree.value, id)
  nameModal.value = {
    title: '重命名',
    label: '新名称',
    placeholder: node?.name || '',
    initialValue: node?.name || '',
    confirmText: '保存',
    confirmTextLoading: '保存中...'
  }
  nameModalCtx.value = { action: 'rename', parentId: node?.parentId ?? null, targetId: id }
  showNameModal.value = true
}

async function submitNameModal(value: string) {
  const ctx = nameModalCtx.value
  nameModalLoading.value = true
  try {
    if (!isEditable.value) {
      console.warn('当前版本不可编辑（已发布）')
      return
    }
    // 确保当前所选版本在后端仍然存在（避免 mock 热重载导致的 404）
    const vid = await ensureValidVersionId()
    if (!vid) throw new Error('无可用版本')
    if (ctx.action === 'create-file') {
      const created = await knowledgeApi.createNode(projectId.value, {
        parentId: ctx.parentId ?? null,
        name: value,
        type: 'file'
      })
      pendingSelectFileId.value = created.id
      await loadVersionSnapshot(vid)
    } else if (ctx.action === 'create-folder') {
      await knowledgeApi.createNode(projectId.value, {
        parentId: ctx.parentId ?? null,
        name: value,
        type: 'folder'
      })
      await loadVersionSnapshot(vid)
    } else if (ctx.action === 'rename' && ctx.targetId) {
      await knowledgeApi.updateNode(projectId.value, ctx.targetId, { name: value })
      if (currentFile.value === ctx.targetId) {
        // keep selection; nothing to change for content binding here
      }
      await loadVersionSnapshot(vid)
    }
    showNameModal.value = false
  } catch (err) {
    console.error('操作失败', err)
  } finally {
    nameModalLoading.value = false
  }
}

// Prevent creating/renaming to a duplicated name under the same parent directory
function validateName(value: string): string | null {
  // Keep modal-level required check; here we only handle duplicates under same parent
  const ctx = nameModalCtx.value
  // Resolve sibling list under target parent; root uses top-level list
  let siblings: KnowledgeNode[] = []
  if (ctx.parentId) {
    const parent = findNodeById(knowledgeTree.value, ctx.parentId)
    siblings = parent?.children ?? []
  } else {
    siblings = knowledgeTree.value
  }
  // Exclude the node itself when renaming
  const excludeId = ctx.action === 'rename' ? ctx.targetId : null
  const exists = siblings.some((n) => n.name === value && n.id !== excludeId)
  if (exists) return '同目录已存在相同名称'
  return null
}

// Delete confirm modal state
const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)

function openDeleteModal(id: string) {
  const node = findNodeById(knowledgeTree.value, id)
  deleteTarget.value = { id, name: node?.name || '' }
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await knowledgeApi.deleteNode(projectId.value, deleteTarget.value.id)
    if (currentFile.value === deleteTarget.value.id) currentFile.value = 'main'
    await loadVersionSnapshot(currentVersionId.value)
    showDeleteModal.value = false
  } catch (err) {
    console.error('删除失败', err)
  } finally {
    deleteLoading.value = false
  }
}

function findNodeById(list: KnowledgeNode[], id: string): KnowledgeNode | null {
  for (const n of list) {
    if (n.id === id) return n
    if (n.children?.length) {
      const found = findNodeById(n.children, id)
      if (found) return found
    }
  }
  return null
}

async function moveNode(payload: {
  nodeId: string
  targetParentId: string | null
  beforeId?: string | null
}) {
  if (!isEditable.value) return
  try {
    await knowledgeApi.moveNode(
      projectId.value,
      payload.nodeId,
      { targetParentId: payload.targetParentId, beforeId: payload.beforeId ?? null },
      { versionId: currentVersionId.value }
    )
    await loadVersionSnapshot(currentVersionId.value)
  } catch (err) {
    console.error('移动失败', err)
  }
}

async function createNewVersion() {
  // 打开创建版本弹窗以选择 bump 类型
  showVersionBumpModal.value = true
}

function markAsStable() {
  const cur = currentVersion.value
  if (!cur) return
  versions.value.forEach((v) => (v.isStable = false))
  cur.isStable = true
  stableVersion.value = cur.version
}

async function markAsStableById(id: string) {
  await versionApi.setStable(projectId.value, id)
  await loadVersions()
}

function saveDraft() {
  if (!isEditable.value) {
    console.warn('当前版本不可编辑（已发布）')
    return
  }
  // 将当前编辑内容保存到草稿版本
  const vid = currentVersionId.value
  if (!vid) return
  const isMain = currentFile.value === 'main'
  const payload = { content: isMain ? mainContent.value : structuredContent.value }
  if (isMain) {
    contentApi
      .setMain(projectId.value, vid, payload)
      .then(() => {
        // 保存 main 后无需刷新快照；内容已在本地状态
        // 可根据需要在此处提示成功
      })
      .catch((err) => {
        console.error('保存主文档失败', err)
      })
  } else {
    const nodeId = currentFile.value
    contentApi
      .setNode(projectId.value, vid, nodeId, payload)
      .then(() => {
        // 同步缓存映射，避免下一次切换版本前丢失
        fileContents.value[nodeId] = structuredContent.value
      })
      .catch((err) => {
        console.error('保存文件内容失败', err)
      })
  }
}

// 发布当前版本（仅 draft 可用）：标记为 published，并冻结当前目录树为快照
async function publishCurrentVersion() {
  if (!isEditable.value) return
  const vid = currentVersionId.value
  if (!vid) return
  try {
    await versionApi.publish(projectId.value, vid)
    // 移除本地草稿标记（如果有）
    const idx = localDraftIds.value.indexOf(vid)
    if (idx !== -1) localDraftIds.value.splice(idx, 1)
    // 重新加载版本列表与快照
    await loadVersions()
    await loadVersionSnapshot(vid)
  } catch (err) {
    console.error('发布失败', err)
  }
}

function previewPrompt() {
  showPreview.value = true
}

function testMcp() {
  console.log('测试 MCP...')
}

function switchToVersion(id: string) {
  currentVersionId.value = id
}

// 回到仪表盘（Dashboard）
function goDashboard() {
  router.push({ name: 'Dashboard' })
}

// --- Create version via modal with bump type ---
const showVersionBumpModal = ref(false)
const versionCreateLoading = ref(false)

function parseSemver(v?: string | null): [number, number, number] | null {
  if (!v) return null
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return null
  return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0]
}

function compareSemver(a: [number, number, number], b: [number, number, number]) {
  if (a[0] !== b[0]) return a[0] - b[0]
  if (a[1] !== b[1]) return a[1] - b[1]
  return a[2] - b[2]
}

const latestSemver = computed<string | null>(() => {
  // 取 versions 中最大的语义化版本（忽略“工作副本”等非 semver）
  const tuples: Array<{ t: [number, number, number]; raw: string }> = []
  for (const v of versions.value) {
    const t = parseSemver(v.version)
    if (t) tuples.push({ t, raw: v.version })
  }
  if (!tuples.length) return null
  tuples.sort((x, y) => compareSemver(x.t, y.t))
  return tuples[tuples.length - 1].raw
})

function bump(base: string | null, kind: 'patch' | 'minor' | 'major'): string {
  const parsed = parseSemver(base)
  const [ma, mi, pa] = parsed ?? [0, 0, 0]
  if (kind === 'patch') return `${ma}.${mi}.${pa + 1}`
  if (kind === 'minor') return `${ma}.${mi + 1}.0`
  return `${ma + 1}.0.0`
}

async function submitCreateVersion(kind: 'patch' | 'minor' | 'major') {
  versionCreateLoading.value = true
  try {
    const base = latestSemver.value
    const next = bump(base, kind)
    const created = await versionApi.create(projectId.value, { version: next })
    await loadVersions()
    currentVersionId.value = created.id
    // 标记为草稿（待发布）
    if (!localDraftIds.value.includes(created.id)) localDraftIds.value.push(created.id)
    showVersionBumpModal.value = false
    // 不再自动续执行移动；非草稿态时拖拽被禁止
  } catch (err) {
    console.error('创建版本失败', err)
  } finally {
    versionCreateLoading.value = false
  }
}
</script>

<style scoped>
/* Basic modal layout */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.6);
}
.modal-panel {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
/* Prevent scroll chaining to the page behind */
.modal-overlay,
.modal-panel {
  overscroll-behavior: contain;
}

/* Standard-ish Markdown preview styles */
.markdown-body {
  color: #111827;
}
.markdown-body h1 {
  font-size: 1.5rem;
  line-height: 2rem;
  margin: 1.2em 0 0.6em;
  font-weight: 600;
}
.markdown-body h2 {
  font-size: 1.25rem;
  line-height: 1.75rem;
  margin: 1.1em 0 0.55em;
  font-weight: 600;
}
.markdown-body h3 {
  font-size: 1.125rem;
  line-height: 1.5rem;
  margin: 1em 0 0.5em;
  font-weight: 600;
}
.markdown-body p,
.markdown-body ul,
.markdown-body ol,
.markdown-body blockquote,
.markdown-body pre {
  margin: 1em 0;
}
.markdown-body p {
  line-height: 1.75;
}
.markdown-body ul {
  list-style: disc;
  padding-left: 1.25rem;
}
.markdown-body ol {
  list-style: decimal;
  padding-left: 1.25rem;
}
.markdown-body blockquote {
  color: #6b7280;
  border-left: 4px solid #e5e7eb;
  padding-left: 0.9rem;
}
.markdown-body code {
  background: #f6f8fa;
  padding: 0.15em 0.35em;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.markdown-body pre {
  background: #f6f8fa;
  padding: 0.85rem;
  border-radius: 6px;
  overflow: auto;
}
.markdown-body pre code {
  background: transparent;
  padding: 0;
}
</style>
