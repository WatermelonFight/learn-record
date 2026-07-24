import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/plan',
  },
  {
    path: '/plan',
    name: 'Plan',
    component: () => import('../views/PlanView.vue'),
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/TasksView.vue'),
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('../views/HistoryView.vue'),
  },
]

const router = createRouter({
  // 使用 hash 模式，兼容 GitHub Pages（不支持 history 模式）
  history: createWebHashHistory(),
  routes,
})

export default router
