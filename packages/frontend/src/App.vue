<template>
  <!-- App shell uses flex layout so pages can consume the remaining height below the header -->
  <div class="min-h-screen h-screen bg-gray-50 text-gray-900 flex flex-col">
    <!-- Header -->
    <header class="border-b bg-white shrink-0">
      <div class="mx-auto max-w-7xl px-4 py-4">
        <h1 class="text-xl font-semibold">Hyper Context</h1>
      </div>
    </header>

    <!-- Main Content (fills remaining height) -->
    <main class="flex-1 min-h-0 flex flex-col">
      <!-- Route-scoped container: default pages get centered max-width with padding;
           full-bleed pages (like ProjectEditor) opt into a 100% height container. -->
      <router-view v-slot="{ Component, route }">
        <div
          :class="
            route.name === 'ProjectEditor'
              ? 'flex-1 min-h-0 overflow-hidden flex flex-col'
              : 'mx-auto max-w-7xl px-4 py-8'
          "
        >
          <component :is="Component" />
        </div>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
// App shell renders the layout and a <router-view/>; pages live under src/views.
</script>
