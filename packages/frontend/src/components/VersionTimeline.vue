<template>
  <div class="version-timeline">
    <div v-if="showHeader !== false" class="sticky top-0 z-30 mb-2 flex items-center justify-between bg-white pb-2">
      <div class="text-sm font-medium text-gray-800">版本</div>
      <Tooltip text="新建版本">
        <button
          class="inline-flex items-center justify-center rounded p-1 text-gray-600 hover:bg-gray-100"
          @click="$emit('create')"
          aria-label="新建版本"
        >
          <PlusCircleIcon class="h-4 w-4" />
        </button>
      </Tooltip>
    </div>

    <ul class="relative ml-3 border-l-2 pl-4">
      <li v-for="v in items" :key="v.id" class="relative z-0 mb-6 last:mb-0">
        <span
          class="absolute -left-[9px] mt-0.5 inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-white z-0"
          :class="v.id === currentId ? 'border-primary-600' : 'border-gray-300'"
        >
          <span
            class="block h-2.5 w-2.5 rounded-full"
            :class="
              v.isStable ? 'bg-green-600' : v.id === currentId ? 'bg-primary-600' : 'bg-gray-300'
            "
          ></span>
        </span>
        <div class="flex items-start justify-between gap-3 pl-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <button
                class="truncate text-sm font-medium hover:text-primary-700"
                :class="{ 'text-primary-700': v.id === currentId }"
                @click="$emit('select', v.id)"
                :title="'切换到 ' + v.version"
              >
                v{{ v.version }}
              </button>
              <span
                v-if="v.isStable"
                class="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700"
                title="稳定版本"
              >
                <CheckBadgeIcon class="h-3 w-3" /> 稳定
              </span>
              <span
                v-if="v.status === 'draft'"
                class="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700"
                title="草稿（未发布）"
              >
                草稿
              </span>
            </div>
            <div v-if="v.createdAt" class="mt-1 text-xs leading-5 text-gray-500">
              {{ formatTime(v.createdAt) }}
            </div>
          </div>
          <div class="shrink-0 space-x-1">
            <Tooltip :text="v.isStable ? '已是稳定版' : (v.status === 'draft' ? '草稿不可设为稳定' : '设为稳定版')">
              <button
                class="inline-flex items-center justify-center rounded p-1"
                :class="
                  v.isStable
                    ? 'text-gray-300 cursor-not-allowed'
                    : v.status === 'draft'
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                "
                :disabled="v.isStable || v.status === 'draft'"
                @click="$emit('mark-stable', v.id)"
                aria-label="设为稳定版"
              >
                <CheckBadgeIcon class="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import moment from 'moment'
import { computed } from 'vue'
import Tooltip from './Tooltip.vue'
import { PlusCircleIcon, CheckBadgeIcon } from '@heroicons/vue/24/outline'

type Version = {
  id: string
  version: string
  isStable?: boolean
  createdAt?: string
  status?: 'draft' | 'published'
}
const props = defineProps<{ versions: Version[]; currentId: string; showHeader?: boolean }>()
defineEmits<{
  (e: 'select', id: string): void
  (e: 'mark-stable', id: string): void
  (e: 'create'): void
}>()

const items = computed(() => {
  const sorted = [...props.versions].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return tb - ta
  })
  return sorted
})

function formatTime(iso?: string) {
  if (!iso) return ''
  return moment(iso).format('YYYY-MM-DD HH:mm')
}
</script>

<style scoped>
/* Minimal timeline visuals using Tailwind from parent classes */
</style>
