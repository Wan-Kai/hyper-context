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
            :disabled="!isEditable || hasDupExtendNamesGlobal"
            :title="
              !isEditable ? '' : hasDupExtendNamesGlobal ? '存在重复的扩展知识名称（全局）' : ''
            "
            @click="saveDraft"
          >
            保存
          </button>
          <button
            class="rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="!isEditable || publishLoading || hasDupExtendNamesGlobal"
            :title="
              !isEditable ? '' : hasDupExtendNamesGlobal ? '存在重复的扩展知识名称（全局）' : ''
            "
            @click="publishCurrentVersion"
          >
            {{ publishLoading ? '发布中...' : '发布' }}
          </button>
          <button
            class="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
            @click="previewPrompt"
          >
            预览提示词
          </button>
          <button class="rounded-md border px-3 py-1.5 text-sm" @click="openMcpModal">
            测试MCP服务
          </button>
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
            @click="onSelectMain"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="onSelectMain"
            @keydown.space.prevent="onSelectMain"
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
          <EditorMainArea
            v-model="editingContent"
            :is-main="currentFile === 'main'"
            :is-editable="isEditable"
            :selected-name="selectedNode?.name || '-'"
            v-model:head="structHead"
            v-model:blocks="structBlocks"
            :dup-extend-names="Array.from(dupExtendNamesGlobalSet)"
          />
        </div>

        <!-- 右侧信息区（版本 / MCP） -->
        <div
          class="basis-[325px] shrink-0 border-l bg-gray-50 p-4 flex flex-col min-h-0 h-full overflow-hidden"
        >
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
              <div v-if="!hasStableVersion" class="mb-2 text-xs text-gray-500">
                未设置稳定版时，将不会提供 MCP 服务
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
            <!-- MCP 服务卡片暂时隐藏，仅保留顶部“测试MCP服务”入口 -->
          </div>
        </div>
      </section>
    </div>
    <!-- Full-screen Preview Modal -->
    <teleport to="body">
      <div v-if="showPreview" class="modal-overlay z-50" @click.self="showPreview = false">
        <div class="modal-panel z-50">
          <div class="flex items-center justify-between border-b bg-white px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="text-sm font-medium">提示词预览</div>
              <div v-if="previewTokenCount !== null" class="text-xs text-gray-500">
                Token 数：{{ previewTokenCount }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-md border px-2 py-1 text-xs"
                @click="copyPreview"
                title="复制当前展示原文"
              >
                复制
              </button>
              <button class="rounded-md border px-2 py-1 text-xs" @click="showPreview = false">
                关闭
              </button>
            </div>
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
    <McpTestModal v-model="showMcpModal" :project-id="projectId" :hint-names="mcpHintNames" />
    <!-- Toasts: lightweight success/error messages -->
    <teleport to="body">
      <div v-if="toast" class="fixed right-4 top-4 z-50">
        <div
          class="min-w-[160px] rounded-md border px-3 py-2 text-sm shadow-lg"
          :class="
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          "
        >
          {{ toast.text }}
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { projectApi, knowledgeApi, versionApi, contentApi } from '@/api/endpoints'
import type {
  Project,
  KnowledgeNode,
  Version,
  StructuredExtendBlock,
  StructuredHead,
  KnowledgeLevel
} from '@/api/types'
import { KnowledgeNodeType, VersionStatus } from '@/api/types'
import { McpStatus } from '@/api/types'
// MCP RPC utilities used inside McpTestModal component
import McpTestModal from '@/components/modals/McpTestModal.vue'
import EditorMainArea from '@/components/EditorMainArea.vue'
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
// HeadlessUI Listbox and related icons are used inside EditorMainArea now
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import TextInputModal from '@/components/modals/TextInputModal.vue'
import VersionBumpModal from '@/components/modals/VersionBumpModal.vue'
// 使用与 OpenAI 一致的 cl100k_base 编码来统计 token 数
// 依赖：gpt-tokenizer（纯 JS/TS，浏览器端可用）
import { encode as cl100kEncode } from 'gpt-tokenizer'

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
// 未保存变更跟踪：主文档 + 各节点
const dirtyMain = ref(false)
const dirtyNodeIds = ref<Set<string>>(new Set())
// 程序化更新保护开关：避免在解析/载入时被误记为“脏”
const suspendDirtyTracking = ref(false)
// 写入映射时的临时锁：在切换文件的同一宏任务内，仍将更新写回到切换前的文件，
// 以防编辑器的异步微任务（例如 CodeMirror 的 queueMicrotask）把旧内容写到新文件 id。
const writeTargetLockId = ref<string | null>(null)

const versions = ref<Version[]>([])
const currentVersionId = ref<string>('')
const stableVersion = ref<string | null>(null)
const hasStableVersion = computed(
  () =>
    versions.value.some((v) => v.isStable) ||
    !!(project.value?.stableVersion || stableVersion.value)
)
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
  if (v.status) return v.status === VersionStatus.Draft
  // 回退策略：当后端未提供 status 时，将“最新且未标记稳定”的版本视为草稿（可编辑）
  return v.id === newestVersionId.value && !v.isStable
})
// 在创建文件后用于在快照加载完成后自动选中文件
const pendingSelectFileId = ref<string | null>(null)

const mcpStatus = ref<McpStatus>(McpStatus.Inactive)
const mcpStatusClass = computed(() =>
  mcpStatus.value === McpStatus.Active
    ? 'text-green-600'
    : mcpStatus.value === McpStatus.Error
      ? 'text-red-600'
      : 'text-gray-500'
)
const publishLoading = ref(false)
const showMcpModal = ref(false)

// --- Preview Content (shared builder) ---
import { buildPreview } from '@hyper-context/shared'
const previewContent = computed(() =>
  buildPreview(
    project.value?.name || '项目',
    knowledgeTree.value || [],
    { main: mainContent.value || '', nodes: fileContents.value || {} }
  )
)

// 预览内容的 token 数（基于 gpt-3-encoder，通用近似）
const previewTokenCount = computed<number | null>(() => {
  const src = previewContent.value || ''
  // gpt-tokenizer 默认即 cl100k_base；明确起见，保持使用 encode()
  return src ? cl100kEncode(src).length : 0
})

// Modal: full-screen preview on demand
const showPreview = ref(false)
const prevBodyOverflow = ref<string | null>(null)
// Using lightweight MarkdownPreview component (markdown-it + hljs)

// Lightweight toast for success/error feedback (no global lib)
const toast = ref<{ type: 'success' | 'error'; text: string } | null>(null)
let toastTimer: any = null
function showToast(text: string, type: 'success' | 'error' = 'success', ms = 1800) {
  toast.value = { type, text }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = null), ms)
}

// Bind editor to the active file content
const editingContent = computed({
  get() {
    return currentFile.value === 'main' ? mainContent.value : structuredContent.value
  },
  set(v: string) {
    if (currentFile.value === 'main') {
      mainContent.value = v
      // 标记主文档为脏
      dirtyMain.value = true
    } else {
      structuredContent.value = v
      // 同步到映射，避免丢失编辑内容（在切换瞬间使用写入锁保证写回旧文件）
      const targetId = writeTargetLockId.value || currentFile.value
      // 程序化更新期间或文件切换未稳定时不要写回，避免把新文件内容写入旧文件 id
      if (
        !suspendDirtyTracking.value &&
        !(writeTargetLockId.value && writeTargetLockId.value !== currentFile.value)
      ) {
        fileContents.value[targetId] = v
        // 非 main 文档：标记为脏
        dirtyNodeIds.value.add(targetId)
      }
    }
  }
})

// ---------- 结构化编辑模型（非“默认内容”时） ----------
type ExtendBlock = StructuredExtendBlock & { id: string }

const selectedNode = computed(() =>
  currentFile.value !== 'main' ? findNodeById(knowledgeTree.value, currentFile.value) : null
)

const structHead = ref<StructuredHead>({
  name: '',
  level: 'core',
  description: '',
  coreContent: ''
})
const structBlocks = ref<ExtendBlock[]>([])
// 本地表单缓存：每个文件一份，避免切换过程中的竞态导致映射被覆盖
const formCache = ref<Record<string, { head: StructuredHead; blocks: ExtendBlock[] }>>({})

// 扩展知识重名校验（全局，同一版本内所有知识下）：非空名称需全局唯一
const dupExtendNamesGlobalSet = computed<Set<string>>(() => {
  const counts = new Map<string, number>()
  // Helper to add names
  const addNames = (names: string[]) => {
    for (const raw of names) {
      const n = (raw || '').trim()
      if (!n) continue
      counts.set(n, (counts.get(n) || 0) + 1)
    }
  }
  // Walk all file nodes in tree
  const collectNamesFromContent = (content: string) => {
    const extendSrc = extractTag(content || '', 'extend') || ''
    const blocks = extractAllBlocks(extendSrc)
    const names: string[] = []
    for (const b of blocks) names.push(extractTag(b, 'name') || '')
    return names
  }
  const files: KnowledgeNode[] = []
  const walk = (list: KnowledgeNode[]) => {
    for (const n of list) {
      if (n.type === KnowledgeNodeType.File) files.push(n)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(knowledgeTree.value)
  for (const f of files) {
    if (currentFile.value !== 'main' && f.id === currentFile.value) {
      // Use live structBlocks for the currently active file
      addNames(structBlocks.value.map((b) => b.name || ''))
    } else {
      addNames(collectNamesFromContent(fileContents.value[f.id] || ''))
    }
  }
  const dup = new Set<string>()
  for (const [k, c] of counts) if (c > 1) dup.add(k)
  return dup
})
const hasDupExtendNamesGlobal = computed(() => dupExtendNamesGlobalSet.value.size > 0)

// 生成唯一 id（仅前端临时使用）
function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// Ensure latest in-memory edits are reflected into structuredContent/fileContents
// Useful before operations that reload snapshot (move/rename/create/delete), to avoid race with reactive watchers
async function flushLocalEdits() {
  // In view-only (published) mode there should be no local edits; skip to avoid marking dirty
  if (!isEditable.value) return
  // 结束可能的中文输入法合成，确保 v-model 已提交
  if (typeof window !== 'undefined') {
    const ae = document.activeElement as HTMLElement | null
    // 仅在文本输入场景触发 blur，避免打断其它交互
    if (ae && (ae.tagName === 'TEXTAREA' || ae.tagName === 'INPUT')) {
      ae.blur()
    }
  }
  // 等待 DOM & v-model 同步
  await nextTick()
  // 再等待一帧，确保 compositionend 事件完成派发
  await new Promise((resolve) =>
    typeof requestAnimationFrame !== 'undefined'
      ? requestAnimationFrame(() => resolve(null))
      : setTimeout(resolve, 0)
  )
  if (currentFile.value !== 'main') {
    // Force-generate structured text from current structHead/structBlocks
    structuredContent.value = toStructuredText()
    fileContents.value[currentFile.value] = structuredContent.value
    // 同步到表单缓存（深拷贝，避免引用联动）
    formCache.value[currentFile.value] = {
      head: JSON.parse(JSON.stringify(structHead.value)),
      blocks: JSON.parse(JSON.stringify(structBlocks.value))
    }
    // 标记当前文件为脏，确保快照刷新时合并本地内容
    dirtyNodeIds.value.add(currentFile.value)
  }
}
// add/remove 操作已在 EditorMainArea 内部处理

// 解析与生成（粗略 XML-like 文本）
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

function parseStructuredText(src: string) {
  const headSrc = extractTag(src, 'head') || ''
  const extendSrc = extractTag(src, 'extend') || ''
  const coreSrc = extractTag(src, 'core') || ''
  if (!headSrc) {
    console.warn('[ProjectEditor] 解析失败：未找到 <head> 块，源长度=', (src || '').length)
  }
  const name = extractTag(headSrc, 'name') || (selectedNode.value?.name ?? '')
  const level = (extractTag(headSrc, 'level') as KnowledgeLevel) || 'core'
  const description = extractTag(headSrc, 'description') || ''
  const coreContent = (coreSrc && extractTag(coreSrc, 'content')) || ''
  structHead.value = { name, level, description, coreContent }

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

  // 核心内容：仅当 level 为 core 时输出
  // 注意：不要为 Markdown 正文添加 4 空格缩进，否则会在渲染时被识别为“代码块”，导致显示异常。
  // 此处仅在 <content> 内包一层换行，不对每行做额外缩进，保持原始 Markdown 格式。
  let core = ''
  if (structHead.value.level === 'core') {
    const coreBody = structHead.value.coreContent ? `\n${structHead.value.coreContent}\n` : ''
    core = ['<core>', `  <content>${coreBody}</content>`, '</core>'].join('\n')
  }

  const blocks = structBlocks.value
    .map((b) => {
      // 同上：扩展知识内容保持原始 Markdown，不做 4 空格缩进，避免被当作代码块
      const content = b.content ? `\n${b.content}\n` : ''
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
  return [head, core, extend].filter(Boolean).join('\n\n')
}

// 切换到非 main 文件时，基于 structuredContent 解析；同时用所选目录名覆盖 head.name
watch(
  () => currentFile.value,
  () => {
    if (currentFile.value === 'main') return
    // 覆盖名称为目录/文件名（只读）
    suspendDirtyTracking.value = true
    // 若存在本地缓存，优先使用（可避免极端竞态覆盖）。否则从映射解析。
    const cached = formCache.value[currentFile.value]
    if (cached) {
      structHead.value = JSON.parse(JSON.stringify(cached.head))
      structBlocks.value = JSON.parse(JSON.stringify(cached.blocks))
      structuredContent.value = toStructuredText()
    } else {
      structHead.value.name = selectedNode.value?.name || ''
      // 切换文件时从快照映射中取出对应内容
      structuredContent.value = fileContents.value[currentFile.value] || ''
      parseStructuredText(structuredContent.value || '')
    }
    // 若解析后名称为空，回填（保持在 suspendDirtyTracking 内，避免写回旧文件 id）
    if (!structHead.value.name) structHead.value.name = selectedNode.value?.name || ''
    // 延迟一个微任务再解除“程序化更新”保护，确保依赖 head/blocks 的监听在本轮内不进行写回
    queueMicrotask(() => {
      suspendDirtyTracking.value = false
    })
  }
)

// 任意字段变化时，重新生成 structuredContent（仅限非 main）
// 仅监听表单模型（head/blocks）变化来生成 structuredContent。
// 注意：不要把 currentFile 放进依赖，否则在切换文件瞬间会把上一个文件的内容写入到新文件的 id，导致“内容丢失”。
watch(
  [structHead, structBlocks],
  () => {
    if (currentFile.value === 'main') return
    // 始终使用选中节点名作为 head.name 的来源（仅在不一致时写入，避免自触发循环）
    if (selectedNode.value?.name && structHead.value.name !== selectedNode.value.name) {
      structHead.value.name = selectedNode.value.name
    }
    structuredContent.value = toStructuredText()
    // 将生成结果同步到当前版本的内容映射
    const targetId = writeTargetLockId.value || currentFile.value
    // 程序化更新期间（例如切换文件时解析/回填），不要回写映射，避免覆盖其他文件内容
    // 另外：当正在切换文件且存在写入锁（writeTargetLockId）时，阻止把“新文件”的解析结果
    // 误写回到“旧文件”的 id（防止刚缓存好的旧文件内容被重置）。
    if (
      !suspendDirtyTracking.value &&
      // 若锁存在且当前选中文件已切换为新 id，则跳过写回
      !(writeTargetLockId.value && writeTargetLockId.value !== currentFile.value)
    ) {
      fileContents.value[targetId] = structuredContent.value
      // 同步表单缓存
      formCache.value[targetId] = {
        head: JSON.parse(JSON.stringify(structHead.value)),
        blocks: JSON.parse(JSON.stringify(structBlocks.value))
      }
      dirtyNodeIds.value.add(targetId)
    }
  },
  { deep: true, flush: 'post' }
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
  if (toastTimer) clearTimeout(toastTimer)
})

async function load() {
  try {
    loading.value = true
    const p = await projectApi.getProject(projectId.value)
    project.value = p
    // 初始化版本信息
    await loadVersions()
    mcpStatus.value = p?.mcpStatus || McpStatus.Inactive
    // loadVersionSnapshot 将由 currentVersionId 的 watch 触发
  } catch (err) {
    console.error('加载项目失败', err)
  } finally {
    loading.value = false
  }
}

// 根据版本获取完整快照：目录树 + 主文档 + 节点内容
// opts.preserveLocal: 在刷新快照时尽量保留当前正在编辑的本地未保存内容（避免被结构变更操作覆盖）
async function loadVersionSnapshot(vid: string, opts?: { preserveLocal?: boolean }) {
  try {
    const snap = await versionApi.snapshot(projectId.value, vid)
    knowledgeTree.value = snap.tree || []

    // 如果需要保留本地未保存的内容，则对主文档与所有脏节点进行合并
    if (opts?.preserveLocal) {
      // 收集新树中的文件 id，避免把已删除/移出的旧键带回
      const idsInTree = new Set<string>()
      const collect = (list: KnowledgeNode[]) => {
        for (const n of list) {
          if (n.type === KnowledgeNodeType.File) idsInTree.add(n.id)
          if (n.children && n.children.length) collect(n.children)
        }
      }
      collect(knowledgeTree.value || [])

      // 基于远端快照初始化
      const mergedNodes: Record<string, string> = { ...(snap.contents?.nodes || {}) }
      let mergedMain = snap.contents?.main || ''

      // 主文档：若本地有未保存，优先保留
      if (dirtyMain.value) mergedMain = mainContent.value

      // 合并所有脏节点（仅限仍存在于新树的文件）
      for (const id of dirtyNodeIds.value) {
        if (!idsInTree.has(id)) continue
        const local = fileContents.value[id]
        if (typeof local === 'string') mergedNodes[id] = local
      }

      // 应用合并结果（在应用期间暂停“脏标记”）
      suspendDirtyTracking.value = true
      mainContent.value = mergedMain
      fileContents.value = mergedNodes
      suspendDirtyTracking.value = false
    } else {
      // 默认行为：用后端快照覆盖本地缓存（严格以远端为准，避免跨版本脏数据污染）
      // 在覆盖期间暂停“脏标记 + 写回映射”，并清空本地脏标记与表单缓存
      suspendDirtyTracking.value = true
      mainContent.value = snap.contents?.main || ''
      fileContents.value = { ...(snap.contents?.nodes || {}) }
      suspendDirtyTracking.value = false
      // 切换版本为严格模式：清除未保存标记与表单缓存，避免后续操作（如拖拽 preserveLocal）错误地合并旧版本的本地编辑
      dirtyMain.value = false
      dirtyNodeIds.value.clear()
      formCache.value = {}
    }
    // 切回“核心内容”；如果当前选中文件在新树中仍存在，则载入其内容
    if (currentFile.value !== 'main') {
      const exists = !!findNodeById(knowledgeTree.value, currentFile.value)
      if (!exists) {
        currentFile.value = 'main'
      } else {
        // 设置 structuredContent 与表单模型（期间暂停脏标记）
        suspendDirtyTracking.value = true
        structuredContent.value = fileContents.value[currentFile.value] || ''
        parseStructuredText(structuredContent.value || '')
        suspendDirtyTracking.value = false
      }
    }
    // 如果存在待选中文件（新建文件场景），在刷新后选择它
    if (pendingSelectFileId.value) {
      const exists = !!findNodeById(knowledgeTree.value, pendingSelectFileId.value)
      if (exists) {
        currentFile.value = pendingSelectFileId.value
        suspendDirtyTracking.value = true
        structuredContent.value = fileContents.value[pendingSelectFileId.value] || ''
        parseStructuredText(structuredContent.value || '')
        suspendDirtyTracking.value = false
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
  const draft = (versions.value as any[]).find((v) => v.status === VersionStatus.Draft)
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
      const draft = (versions.value as any[]).find((v) => v.status === VersionStatus.Draft)
      currentVersionId.value = draft?.id || newestVersionId.value || (versions.value[0]?.id ?? '')
    }
  } catch (err) {
    console.error('加载版本失败', err)
  }
}

async function onSelectNode(node: KnowledgeNode) {
  if (node.type !== KnowledgeNodeType.File) return
  // 提前锁定写入目标为切换前的文件，避免在 flush 期间触发的微任务/监听写入到新 id
  writeTargetLockId.value = currentFile.value
  // 在切换选中文件前，先把当前文件的本地编辑内容收敛到 fileContents，避免切换瞬间丢失
  await flushLocalEdits()
  currentFile.value = node.id
  setTimeout(() => {
    writeTargetLockId.value = null
  }, 0)
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
  if (!isEditable.value) return
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
  if (!isEditable.value) return
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
  if (!isEditable.value) return
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
    // 同步本地未保存编辑，避免后续快照刷新覆盖
    await flushLocalEdits()
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
        type: KnowledgeNodeType.File
      })
      pendingSelectFileId.value = created.id
      // 刷新目录树，但保留当前编辑内容，避免被覆盖
      await loadVersionSnapshot(vid, { preserveLocal: true })
    } else if (ctx.action === 'create-folder') {
      await knowledgeApi.createNode(projectId.value, {
        parentId: ctx.parentId ?? null,
        name: value,
        type: KnowledgeNodeType.Folder
      })
      // 刷新目录树，但保留当前编辑内容，避免被覆盖
      await loadVersionSnapshot(vid, { preserveLocal: true })
    } else if (ctx.action === 'rename' && ctx.targetId) {
      await knowledgeApi.updateNode(projectId.value, ctx.targetId, { name: value })
      if (currentFile.value === ctx.targetId) {
        // keep selection; nothing to change for content binding here
      }
      // 刷新目录树，但保留当前编辑内容，避免被覆盖
      await loadVersionSnapshot(vid, { preserveLocal: true })
    }
    showNameModal.value = false
  } catch (err) {
    console.error('操作失败', err)
  } finally {
    nameModalLoading.value = false
  }
}

// Name validation for create/rename
// Requirement: file names must be globally unique in the project (not just within the same folder).
// Folder names keep the old rule: only need to be unique among siblings under the same parent.
function validateName(value: string): string | null {
  const name = (value || '').trim()
  const ctx = nameModalCtx.value

  // Helper: traverse the whole tree
  function walk(list: KnowledgeNode[], acc: KnowledgeNode[] = []): KnowledgeNode[] {
    for (const n of list) {
      acc.push(n)
      if (n.children?.length) walk(n.children, acc)
    }
    return acc
  }

  // Identify the target node type when renaming (file vs folder)
  const targetNode =
    ctx.action === 'rename' && ctx.targetId ? findNodeById(knowledgeTree.value, ctx.targetId) : null

  // When creating a file or renaming a file: enforce global uniqueness among all file nodes
  const isFileOperation =
    ctx.action === 'create-file' ||
    (ctx.action === 'rename' && targetNode?.type === KnowledgeNodeType.File)

  if (isFileOperation) {
    const allNodes = walk(knowledgeTree.value, [])
    const exists = allNodes.some(
      (n) => n.type === KnowledgeNodeType.File && n.name === name && n.id !== (ctx.targetId || '')
    )
    if (exists) return '已存在同名文件（文件名需在全局唯一）'
    return null
  }

  // Otherwise (creating/renaming a folder): keep sibling-only uniqueness
  let siblings: KnowledgeNode[] = []
  if (ctx.parentId) {
    const parent = findNodeById(knowledgeTree.value, ctx.parentId)
    siblings = parent?.children ?? []
  } else {
    siblings = knowledgeTree.value
  }
  const excludeId = ctx.action === 'rename' ? ctx.targetId : null
  const dup = siblings.some((n) => n.name === name && n.id !== excludeId)
  if (dup) return '同目录已存在相同名称'
  return null
}

// Delete confirm modal state
const showDeleteModal = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<{ id: string; name: string } | null>(null)

function openDeleteModal(id: string) {
  if (!isEditable.value) return
  const node = findNodeById(knowledgeTree.value, id)
  deleteTarget.value = { id, name: node?.name || '' }
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!isEditable.value) return
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    // 刷新前同步当前编辑内容
    await flushLocalEdits()
    await knowledgeApi.deleteNode(projectId.value, deleteTarget.value.id)
    if (currentFile.value === deleteTarget.value.id) currentFile.value = 'main'
    // 删除后刷新目录树，但保留当前编辑内容
    await loadVersionSnapshot(currentVersionId.value, { preserveLocal: true })
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
    // 刷新前同步当前编辑内容
    await flushLocalEdits()
    await knowledgeApi.moveNode(
      projectId.value,
      payload.nodeId,
      { targetParentId: payload.targetParentId, beforeId: payload.beforeId ?? null },
      { versionId: currentVersionId.value }
    )
    // 移动后刷新目录树，但保留当前编辑内容
    await loadVersionSnapshot(currentVersionId.value, { preserveLocal: true })
  } catch (err) {
    console.error('移动失败', err)
  }
}

async function createNewVersion() {
  // 确保版本列表已就绪（避免弹窗打开时列表为空）
  await loadVersions()
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
  // 全局扩展名称重复时阻止保存
  if (hasDupExtendNamesGlobal.value) {
    showToast('存在重复的扩展知识名称（全局），请修改后再保存', 'error')
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
      .then(async () => {
        dirtyMain.value = false
        // 刷新快照以与后端对齐（保留其他未保存节点）
        await loadVersionSnapshot(vid, { preserveLocal: true })
        showToast('保存成功')
      })
      .catch((err) => {
        console.error('保存主文档失败', err)
        showToast('保存失败', 'error')
      })
  } else {
    const nodeId = currentFile.value
    contentApi
      .setNode(projectId.value, vid, nodeId, payload)
      .then(async () => {
        // 同步缓存映射，避免下一次切换版本前丢失
        fileContents.value[nodeId] = structuredContent.value
        // 清除当前节点的脏标记
        dirtyNodeIds.value.delete(nodeId)
        // 刷新快照以与后端对齐（保留其他未保存节点）
        await loadVersionSnapshot(vid, { preserveLocal: true })
        showToast('保存成功')
      })
      .catch((err) => {
        console.error('保存文件内容失败', err)
        showToast('保存失败', 'error')
      })
  }
}

// 发布当前版本（仅 draft 可用）：标记为 published，并冻结当前目录树为快照
async function publishCurrentVersion() {
  if (!isEditable.value) return
  const vid = currentVersionId.value
  if (!vid) return
  try {
    publishLoading.value = true
    // 确保最新编辑先收敛并保存（避免发布后刷新快照覆盖未保存内容）
    await flushLocalEdits()
    // 批量保存所有未保存内容；若失败则中止发布
    const saved = await saveAllDirty()
    if (!saved) {
      showToast('保存失败，已取消发布', 'error')
      return
    }
    await versionApi.publish(projectId.value, vid)
    // 移除本地草稿标记（如果有）
    const idx = localDraftIds.value.indexOf(vid)
    if (idx !== -1) localDraftIds.value.splice(idx, 1)
    // 重新加载版本列表与快照
    await loadVersions()
    await loadVersionSnapshot(vid)
    showToast('发布成功')
  } catch (err) {
    console.error('发布失败', err)
    showToast('发布失败', 'error')
  } finally {
    publishLoading.value = false
  }
}

async function previewPrompt() {
  // Ensure latest in-memory edits are flushed before previewing
  await flushLocalEdits()
  showPreview.value = true
}

// 复制预览原文到剪贴板
async function copyPreview() {
  const text = previewContent.value || ''
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // 兼容旧环境
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    showToast('已复制到剪贴板')
  } catch (e) {
    console.error('复制失败', e)
    showToast('复制失败', 'error')
  }
}

function openMcpModal() {
  showMcpModal.value = true
}

const mcpHintNames = computed<string[]>(() => {
  if (currentFile.value === 'main') return []
  const n = structHead.value?.name || selectedNode.value?.name || ''
  return n ? [n] : []
})

function switchToVersion(id: string) {
  currentVersionId.value = id
}

// 回到仪表盘（Dashboard）
function goDashboard() {
  router.push({ name: 'Dashboard' })
}

// 选择“核心内容”时也需要先收敛当前文件的本地编辑，避免丢失
async function onSelectMain() {
  // 同样提前加锁
  writeTargetLockId.value = currentFile.value
  await flushLocalEdits()
  // 锁在下一个宏任务释放
  currentFile.value = 'main'
  setTimeout(() => {
    writeTargetLockId.value = null
  }, 0)
}

// 批量保存所有未保存内容；全部成功返回 true，任一失败返回 false（不中断本地状态）
async function saveAllDirty(): Promise<boolean> {
  const vid = currentVersionId.value
  if (!vid) return false
  try {
    // 全局重复校验（基于当前内存态，包括当前文件的未保存表单）
    if (dupExtendNamesGlobalSet.value.size > 0) {
      const names = Array.from(dupExtendNamesGlobalSet.value).slice(0, 3).join(', ')
      showToast(
        `扩展知识名称重复（全局）：${names}${dupExtendNamesGlobalSet.value.size > 3 ? '...' : ''}`,
        'error'
      )
      return false
    }
    const jobs: Promise<any>[] = []
    if (dirtyMain.value) {
      jobs.push(
        contentApi.setMain(projectId.value, vid, { content: mainContent.value }).then(() => {
          dirtyMain.value = false
        })
      )
    }
    const nodeIds = Array.from(dirtyNodeIds.value)
    for (const id of nodeIds) {
      const content = fileContents.value[id] || ''
      jobs.push(
        contentApi.setNode(projectId.value, vid, id, { content }).then(() => {
          dirtyNodeIds.value.delete(id)
        })
      )
    }
    if (!jobs.length) return true
    await Promise.all(jobs)
    return true
  } catch (e) {
    console.error('批量保存失败', e)
    return false
  }
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
