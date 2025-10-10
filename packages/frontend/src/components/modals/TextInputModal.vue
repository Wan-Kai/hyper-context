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
              <DialogTitle class="text-lg font-medium text-gray-900">{{ title }}</DialogTitle>
              <div class="mt-4">
                <label v-if="label" class="mb-1 block text-sm font-medium text-gray-700">{{ label }}</label>
                <input
                  ref="inputRef"
                  v-model.trim="inputValue"
                  type="text"
                  :placeholder="placeholder"
                  class="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-primary-600"
                  :disabled="loading"
                  @keyup.enter="onSubmit"
                />
                <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
              </div>
              <div class="mt-6 flex justify-end gap-3">
                <button type="button" class="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" @click="onClose" :disabled="loading">取消</button>
                <button type="button" class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60" @click="onSubmit" :disabled="loading">{{ loading ? (confirmTextLoading || '提交中...') : (confirmText || '确定') }}</button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps<{
  modelValue: boolean
  title: string
  label?: string
  placeholder?: string
  initialValue?: string
  confirmText?: string
  confirmTextLoading?: string
  loading?: boolean
  required?: boolean
  // Optional validator: return an error message string to block submit; return null/undefined if valid
  validate?: (value: string) => string | null | undefined
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'cancel'): void
  (e: 'submit', value: string): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputValue = ref('')
const error = ref<string>('')
const loading = computed(() => !!props.loading)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      inputValue.value = props.initialValue ?? ''
      error.value = ''
      nextTick(() => inputRef.value?.focus())
    }
  }
)

function onClose() {
  if (loading.value) return
  emit('update:modelValue', false)
  emit('cancel')
}

function onSubmit() {
  if (props.required && !inputValue.value.trim()) {
    error.value = '请输入内容'
    nextTick(() => inputRef.value?.focus())
    return
  }
  const v = inputValue.value.trim()
  if (props.validate) {
    const msg = props.validate(v)
    if (msg) {
      error.value = msg
      nextTick(() => inputRef.value?.focus())
      return
    }
  }
  emit('submit', v)
}
</script>

<!-- Follows the same lightweight style as other modals -->
