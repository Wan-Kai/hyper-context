<template>
  <TransitionRoot as="template" :show="modelValue">
    <Dialog as="div" class="relative z-50" @close="onClose">
      <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="ease-out duration-200" enter-from="opacity-0 translate-y-2 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-150" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-1 sm:scale-95">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl">
              <DialogTitle class="text-lg font-medium text-gray-900">新建版本</DialogTitle>
              <div class="mt-2 text-sm text-gray-600">
                当前版本：<span class="font-medium text-gray-900">{{ latestVersion || '0.0.0' }}</span>，请选择要创建的版本类型。
              </div>
              <div class="mt-4 grid gap-3">
                <button
                  type="button"
                  class="flex items-start justify-between rounded border px-3 py-2 text-left hover:bg-gray-50"
                  :disabled="loading"
                  @click="submit('patch')"
                >
                  <div>
                    <div class="text-sm font-medium text-gray-900">小版本（Patch）</div>
                    <div class="mt-0.5 text-xs text-gray-500">修复缺陷、微小变更</div>
                  </div>
                  <div class="text-sm text-gray-700">{{ preview.patch }}</div>
                </button>
                <button
                  type="button"
                  class="flex items-start justify-between rounded border px-3 py-2 text-left hover:bg-gray-50"
                  :disabled="loading"
                  @click="submit('minor')"
                >
                  <div>
                    <div class="text-sm font-medium text-gray-900">中版本（Minor）</div>
                    <div class="mt-0.5 text-xs text-gray-500">向后兼容的功能更新</div>
                  </div>
                  <div class="text-sm text-gray-700">{{ preview.minor }}</div>
                </button>
                <button
                  type="button"
                  class="flex items-start justify-between rounded border px-3 py-2 text-left hover:bg-gray-50"
                  :disabled="loading"
                  @click="submit('major')"
                >
                  <div>
                    <div class="text-sm font-medium text-gray-900">大版本（Major）</div>
                    <div class="mt-0.5 text-xs text-gray-500">可能包含不兼容的重大变化</div>
                  </div>
                  <div class="text-sm text-gray-700">{{ preview.major }}</div>
                </button>
              </div>
              <div class="mt-6 flex justify-end gap-3">
                <button type="button" class="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="onClose" :disabled="loading">取消</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

type Bump = 'patch' | 'minor' | 'major'

const props = defineProps<{
  modelValue: boolean
  latestVersion?: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'submit', bump: Bump): void
}>()

function parse(v?: string | null): [number, number, number] {
  const m = (v || '').match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return [0, 0, 0]
  return [Number(m[1]) || 0, Number(m[2]) || 0, Number(m[3]) || 0]
}

function nextVersion(base: string | null | undefined, bump: Bump): string {
  const [ma, mi, pa] = parse(base)
  if (bump === 'patch') return `${ma}.${mi}.${pa + 1}`
  if (bump === 'minor') return `${ma}.${mi + 1}.0`
  return `${ma + 1}.0.0`
}

const preview = computed(() => ({
  patch: nextVersion(props.latestVersion ?? null, 'patch'),
  minor: nextVersion(props.latestVersion ?? null, 'minor'),
  major: nextVersion(props.latestVersion ?? null, 'major')
}))

function onClose() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

function submit(bump: Bump) {
  if (props.loading) return
  emit('submit', bump)
}
</script>

<!-- Consistent HeadlessUI modal used across the app -->

