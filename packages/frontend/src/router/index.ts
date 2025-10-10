import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  {
    path: '/project/:id',
    name: 'ProjectEditor',
    // Lazy load to keep initial bundle small for the demo
    component: () => import('@/views/ProjectEditor.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
