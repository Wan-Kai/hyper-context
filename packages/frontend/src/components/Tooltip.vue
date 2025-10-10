<template>
  <!-- Anchor wrapper: handles hover/focus to show tooltip -->
  <span
    ref="anchorRef"
    class="relative inline-flex align-middle"
    @mouseenter="onOpen"
    @mouseleave="onClose"
    @focus="onOpen"
    @blur="onClose"
  >
    <slot />
  </span>

  <!-- Teleport tooltip to body to avoid clipping by overflow ancestors -->
  <teleport to="body">
    <span
      v-if="text && open"
      ref="tipRef"
      class="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-[10px] leading-none text-white shadow"
      role="tooltip"
      :style="tipStyle"
    >
      {{ text }}
      <!-- Arrow -->
      <span
        class="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-800"
      ></span>
    </span>
  </teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ text: string; placement?: 'top' | 'bottom'; offset?: number }>()

const anchorRef = ref<HTMLElement | null>(null)
const tipRef = ref<HTMLElement | null>(null)
const open = ref(false)
const coords = ref<{ top: number; left: number }>({ top: 0, left: 0 })

const placement = computed(() => props.placement ?? 'top')
const offset = computed(() => props.offset ?? 8)

function computePosition() {
  const el = anchorRef.value
  const tip = tipRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // Default width/height for initial calc; refine with real tip size if available
  const tipW = tip?.offsetWidth ?? 0
  const tipH = tip?.offsetHeight ?? 0
  const centerX = rect.left + rect.width / 2
  let top = 0
  if (placement.value === 'top') {
    top = rect.top - tipH - offset.value
  } else {
    top = rect.bottom + offset.value
  }
  const left = centerX
  coords.value = { top: Math.max(0, top), left }
}

function onOpen() {
  open.value = true
  nextTick(() => {
    computePosition()
  })
}
function onClose() {
  open.value = false
}

function onWindowUpdate() {
  if (open.value) computePosition()
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', onWindowUpdate, true)
    window.addEventListener('resize', onWindowUpdate)
  }
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', onWindowUpdate, true)
    window.removeEventListener('resize', onWindowUpdate)
  }
})

const tipStyle = computed(() => ({
  top: coords.value.top + 'px',
  left: coords.value.left + 'px',
  transform: 'translateX(-50%)',
}))
</script>

<style scoped>
/* Teleported tooltip; Tailwind handles look-and-feel. */
</style>
