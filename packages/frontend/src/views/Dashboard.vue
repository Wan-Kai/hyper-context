<template>
  <div class="dashboard">
    <!-- Top bar -->
    <div class="mb-8 flex items-center justify-between">
      <h2 class="text-2xl font-bold">项目管理</h2>
      <div class="flex gap-3">
        <input
          v-model="query"
          @keyup.enter="reload"
          type="text"
          placeholder="搜索项目，按回车以确认搜索条件..."
          class="w-72 rounded-md border px-3 py-2 text-sm outline-none focus:border-primary-600"
        />
        <button
          @click="openCreateModal"
          class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          新建项目
        </button>
      </div>
    </div>

    <!-- Stats (placeholder) -->
    <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded-lg border bg-white p-4">
        <div class="text-sm text-gray-500">项目总数</div>
        <div class="mt-1 text-2xl font-semibold">0</div>
      </div>
      <div class="rounded-lg border bg-white p-4">
        <div class="text-sm text-gray-500">有稳定版的项目</div>
        <div class="mt-1 text-2xl font-semibold">0</div>
      </div>
      <div class="rounded-lg border bg-white p-4">
        <div class="text-sm text-gray-500">MCP 运行</div>
        <div class="mt-1 text-2xl font-semibold">0</div>
      </div>
    </div>

    <!-- Projects grid -->
    <!-- 项目网格：调低大屏列数以放宽卡片宽度 -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
      <div v-for="p in projects" :key="p.id" class="project-card cursor-default">
        <div class="mb-3 flex items-start justify-between">
          <h3 class="truncate text-lg font-semibold">{{ p.name }}</h3>
          <div class="flex items-center gap-2">
            <!-- 稳定版显示：无稳定版时用 '—' 占位 -->
            <span class="version-badge">v{{ p.stableVersion || '—' }}</span>
            <!-- MCP 状态徽标：仅显示状态色点与标签 -->
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
              :class="mcpBadgeClass(p.mcpStatus)"
              title="MCP 状态"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="mcpDotClass(p.mcpStatus)"></span>
              <span class="hidden sm:inline">MCP</span>
            </span>
          </div>
        </div>
        <p class="mb-4 line-clamp-2 text-sm text-gray-600">{{ p.description }}</p>
        <div class="flex items-center justify-between text-sm text-gray-500">
          <span>{{ p.knowledgeCount }} 个知识点</span>
          <span>{{ formatDate(p.updatedAt) }}</span>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <Tooltip text="编辑提示词">
            <button
              @click="goPromptEditor(p)"
              class="rounded p-1 text-primary-600 hover:bg-primary-50"
              aria-label="编辑提示词"
            >
              <PencilSquareIcon class="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="修改基础信息">
            <button
              @click="openEditModal(p)"
              class="rounded p-1 text-gray-600 hover:bg-gray-100"
              aria-label="修改基础信息"
            >
              <Cog6ToothIcon class="h-5 w-5" />
            </button>
          </Tooltip>
          <Tooltip text="删除">
            <button
              @click="openDeleteModal(p)"
              class="rounded p-1 text-red-600 hover:bg-red-100"
              aria-label="删除"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="projects.length === 0"
        class="flex h-40 items-center justify-center rounded-lg border border-dashed bg-white text-gray-500"
      >
        暂无项目，点击右上角“新建项目”创建
      </div>
    </div>
    <!-- Create/Edit Project Modal (extracted) -->
    <ProjectFormModal
      v-model="projectModalOpen"
      :project="editingProject"
      :saving="saving"
      @cancel="closeProjectModal"
      @submit="submitProjectForm"
    />

    <!-- Delete Confirm Modal (extracted) -->
    <DeleteConfirmModal
      v-model="deleteModalOpen"
      :name="deletingProject?.name"
      :loading="deleting"
      @cancel="closeDeleteModal"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { projectApi } from '@/api/endpoints'
import type { Project } from '@/api/types'
import moment from 'moment'
import ProjectFormModal from '@/components/modals/ProjectFormModal.vue'
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal.vue'
import Tooltip from '@/components/Tooltip.vue'
import { PencilSquareIcon, Cog6ToothIcon, TrashIcon } from '@heroicons/vue/24/outline'

const projects = ref<Project[]>([])
const query = ref('')
const router = useRouter()

onMounted(reload)

function formatDate(iso: string) {
  return moment(iso).format('YYYY-MM-DD HH:mm')
}

async function reload() {
  try {
    const list = await projectApi.getProjects()
    const q = query.value.trim().toLowerCase()
    projects.value = q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list
  } catch (err) {
    console.error('加载项目列表失败', err)
  }
}

// ------ Create / Edit modal state ------
const projectModalOpen = ref(false)
const editingProject = ref<Project | null>(null)
const saving = ref(false)

function openCreateModal() {
  editingProject.value = null
  projectModalOpen.value = true
}

function openEditModal(p: Project) {
  editingProject.value = p
  projectModalOpen.value = true
}

function closeProjectModal() {
  if (saving.value) return
  projectModalOpen.value = false
}

async function submitProjectForm(payload: { name: string; description: string }) {
  if (saving.value) return
  try {
    saving.value = true
    if (editingProject.value) {
      const updated = await projectApi.updateProject(editingProject.value.id, {
        name: payload.name,
        description: payload.description
      })
      // update item in list in-place to preserve ordering
      const idx = projects.value.findIndex((x) => x.id === updated.id)
      if (idx !== -1) projects.value[idx] = updated
    } else {
      const created = await projectApi.createProject({
        name: payload.name,
        description: payload.description
      })
      projects.value.unshift(created)
    }
    projectModalOpen.value = false
  } catch (err) {
    console.error('保存项目失败', err)
  } finally {
    saving.value = false
  }
}

// ------ Delete modal state ------
const deleteModalOpen = ref(false)
const deletingProject = ref<Project | null>(null)
const deleting = ref(false)

function openDeleteModal(p: Project) {
  deletingProject.value = p
  deleteModalOpen.value = true
}

function closeDeleteModal() {
  if (deleting.value) return
  deleteModalOpen.value = false
}

async function confirmDelete() {
  if (!deletingProject.value || deleting.value) return
  try {
    deleting.value = true
    await projectApi.deleteProject(deletingProject.value.id)
    projects.value = projects.value.filter((p) => p.id !== deletingProject.value!.id)
    deleteModalOpen.value = false
  } catch (err) {
    console.error('删除项目失败', err)
  } finally {
    deleting.value = false
  }
}

function goPromptEditor(p: Project) {
  router.push({ name: 'ProjectEditor', params: { id: p.id } })
}

// MCP 状态徽标样式（颜色仅作用于徽标本身，尽量不干扰卡片主体）
function mcpBadgeClass(status: Project['mcpStatus']) {
  switch (status) {
    case 'active':
      return 'bg-green-50 text-green-700 border border-green-100'
    case 'error':
      return 'bg-red-50 text-red-700 border border-red-100'
    default:
      return 'bg-gray-50 text-gray-600 border border-gray-100'
  }
}
function mcpDotClass(status: Project['mcpStatus']) {
  switch (status) {
    case 'active':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}
</script>
