<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStudyStore } from './stores/studyStore.js'
import supabase from './stores/db.js'
import LoginView from './components/LoginView.vue'

const route = useRoute()
const router = useRouter()
const store = useStudyStore()

const session = ref(undefined) // undefined = 检查中, null = 未登录, object = 已登录

onMounted(async () => {
  // 监听登录状态变化
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    if (newSession) {
      store.loadPlans()
    }
  })

  // 检查当前是否已登录（session 由 Supabase SDK 自动持久化到 localStorage）
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  if (data.session) {
    await store.loadPlans()
  }
})

async function handleLogout() {
  await supabase.auth.signOut()
  router.push('/plan')
}
</script>

<template>
  <!-- 检查中：显示加载 -->
  <div v-if="session === undefined" class="loading-screen">
    <div class="loading-spinner"></div>
    <p style="color: var(--text-secondary); font-size: 0.9rem;">正在连接…</p>
  </div>

  <!-- 未登录：显示登录框 -->
  <LoginView v-else-if="!session" />

  <!-- 已登录：正常应用 -->
  <template v-else>
    <!-- 数据加载遮罩 -->
    <div v-if="!store.loaded" class="loading-screen">
      <div class="loading-spinner"></div>
      <p style="color: var(--text-secondary); font-size: 0.9rem;">正在加载数据…</p>
    </div>

    <template v-else>
      <!-- 顶部导航（桌面端） -->
      <header class="nav-top">
        <router-link to="/plan" class="nav-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          学习记录
        </router-link>

        <nav class="nav-links">
          <router-link to="/plan" :class="{ active: route.path === '/plan' }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            制定计划
          </router-link>
          <router-link to="/tasks" :class="{ active: route.path === '/tasks' }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            任务管理
          </router-link>
          <router-link to="/history" :class="{ active: route.path === '/history' }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><line x1="12" y1="12" x2="12" y2="12"/>
            </svg>
            历史记录
          </router-link>
        </nav>

        <button class="btn btn-outline btn-sm" @click="handleLogout" title="退出登录">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </header>

      <!-- 主内容区 -->
      <main class="main-content">
        <router-view />
      </main>

      <!-- 底部导航（移动端） -->
      <nav class="nav-bottom">
        <div class="nav-bottom-inner">
          <router-link to="/plan" :class="{ active: route.path === '/plan' }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            制定计划
          </router-link>
          <router-link to="/tasks" :class="{ active: route.path === '/tasks' }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            任务
          </router-link>
          <router-link to="/history" :class="{ active: route.path === '/history' }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            历史
          </router-link>
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer;" @click="handleLogout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 22px; height: 22px;">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span style="font-size: 0.7rem;">退出</span>
          </div>
        </div>
      </nav>
    </template>
  </template>
</template>

<style>
/* loading 动画 */
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
