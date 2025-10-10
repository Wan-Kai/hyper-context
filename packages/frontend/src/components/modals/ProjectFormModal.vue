<template>
  <TransitionRoot as="template" :show="modelValue">
    <Dialog as="div" class="relative z-50" @close="onClose">
      <TransitionChild
        as="template"
        enter="ease-out duration-200" enter-from="opacity-0" enter-to="opacity-100"
        leave="ease-in duration-150" leave-from="opacity-100" leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="ease-out duration-200" enter-from="opacity-0 translate-y-2 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-1 sm:scale-95"
          >
            <DialogPanel class="w-full max-w-lg transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl">
              <DialogTitle class="text-lg font-medium text-gray-900">
                {{ isEdit ? '编辑项目' : '新建项目' }}
              </DialogTitle>
              <div class="mt-4 space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">项目名称</label>
                  <input
                    ref="nameInputRef"
                    v-model.trim="form.name"
                    type="text"
                    placeholder="请输入项目名称"
                    class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary-600"
                    :disabled="saving"
                  />
                  <p v-if="formErrors.name" class="mt-1 text-xs text-red-600">{{ formErrors.name }}</p>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700">项目描述</label>
                  <textarea
                    v-model.trim="form.description"
                    rows="3"
                    placeholder="可选"
                    class="w-full resize-none rounded-md border px-3 py-2 text-sm outline-none focus:border-primary-600"
                    :disabled="saving"
                  />
                </div>
              </div>
              <div class="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  class="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  @click="onClose"
                  :disabled="saving"
                >
                  取消
                </button>
                <button
                  type="button"
                  class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                  @click="onSubmit"
                  :disabled="saving"
                >
                  {{ saving ? '保存中...' : (isEdit ? '保存' : '创建') }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { Project } from '@/api/types'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps<{
  modelValue: boolean
  project?: Project | null
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'submit', payload: { name: string; description: string }): void
}>()

const isEdit = computed(() => !!props.project)
const nameInputRef = ref<HTMLInputElement | null>(null)

const form = reactive({
  name: '',
  description: ''
})
const formErrors = reactive<{ name?: string }>({})

function resetForm() {
  form.name = props.project?.name ?? ''
  form.description = props.project?.description ?? ''
  formErrors.name = undefined
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      nextTick(() => nameInputRef.value?.focus())
    }
  }
)

watch(
  () => props.project,
  () => {
    if (props.modelValue) resetForm()
  }
)

function onClose() {
  if (props.saving) return
  emit('update:modelValue', false)
  emit('cancel')
}

function onSubmit() {
  formErrors.name = undefined
  if (!form.name.trim()) {
    formErrors.name = '请输入项目名称'
    nextTick(() => nameInputRef.value?.focus())
    return
  }
  emit('submit', { name: form.name.trim(), description: form.description.trim() })
}

const saving = computed(() => !!props.saving)
</script>

<!-- This component is intentionally style-light; Tailwind classes applied inline. -->

