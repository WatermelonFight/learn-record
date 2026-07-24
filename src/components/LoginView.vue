<script setup>
import { ref } from 'vue'
import supabase from '../stores/db.js'

const email = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = '请输入邮箱和密码'
    return
  }
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })
    if (error) {
      errorMsg.value = error.message === 'Invalid login credentials'
        ? '邮箱或密码错误'
        : error.message
    }
  } catch {
    errorMsg.value = '登录失败，请检查网络'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-screen">
    <div class="login-card">
      <div class="login-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <h1>学习记录</h1>
        <p>登录以继续</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div v-if="errorMsg" class="login-error">{{ errorMsg }}</div>

        <div class="form-group">
          <label class="form-label" for="login-email">邮箱</label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            class="form-input"
            placeholder="your@email.com"
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="login-pwd">密码</label>
          <input
            id="login-pwd"
            v-model="password"
            type="password"
            class="form-input"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary btn-block"
          :disabled="loading"
        >
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg);
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 32px 24px 0;
}

.login-header svg {
  width: 40px;
  height: 40px;
  color: var(--primary);
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-heading);
  margin-bottom: 4px;
}

.login-header p {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.login-form {
  padding: 24px;
}

.login-error {
  background: var(--danger-bg);
  color: #dc2626;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 16px;
  border-left: 3px solid var(--danger);
}
</style>
