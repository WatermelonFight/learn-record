<script setup>
import { ref, computed } from 'vue'
import { useStudyStore } from '../stores/studyStore.js'

const store = useStudyStore()

// 表单数据
const date = ref(new Date().toISOString().slice(0, 10))
const startTime = ref('')
const endTime = ref('')
const task = ref('')
const showSuccess = ref(false)
const submitting = ref(false)

// 快捷选项：预设时间段
const timePresets = [
  { label: '上午 8:00-12:00', start: '08:00', end: '12:00' },
  { label: '下午 14:00-18:00', start: '14:00', end: '18:00' },
  { label: '晚上 19:00-22:00', start: '19:00', end: '22:00' },
  { label: '全天 8:00-18:00', start: '08:00', end: '18:00' },
]

function applyPreset(preset) {
  startTime.value = preset.start
  endTime.value = preset.end
}

// 快捷时长：从当前时间开始，持续指定时长
const durationPresets = [
  { label: '⏱️ 学习半小时', minutes: 30 },
  { label: '⏱️ 学习一小时', minutes: 60 },
  { label: '⏱️ 学习两小时', minutes: 120 },
]

function applyDuration(minutes) {
  const now = new Date()
  const start = new Date(now)
  start.setSeconds(0, 0) // 归零秒和毫秒
  const end = new Date(start.getTime() + minutes * 60 * 1000)

  const pad = (n) => String(n).padStart(2, '0')
  startTime.value = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  endTime.value = `${pad(end.getHours())}:${pad(end.getMinutes())}`

  // 同时更新日期为今天（以防用户之前选了其他日期）
  date.value = now.toISOString().slice(0, 10)
}

// 辅助函数：判断时间区间是否有效（允许跨天，如 23:30 → 00:30）
function isTimeRangeValid(start, end) {
  if (!start || !end) return false
  // 只要开始和结束时间不同即可（支持跨午夜）
  return start !== end
}

// 表单验证
const isValid = computed(() => {
  return date.value && startTime.value && endTime.value && task.value.trim() && isTimeRangeValid(startTime.value, endTime.value)
})

const timeError = computed(() => {
  if (startTime.value && endTime.value && startTime.value === endTime.value) {
    return '开始时间不能等于结束时间'
  }
  return ''
})

// 今日计划
const todayPlans = computed(() => store.todayPlans.value)

async function submitPlan() {
  if (!isValid.value || submitting.value) return
  submitting.value = true

  try {
    await store.addPlan({
      date: date.value,
      startTime: startTime.value,
      endTime: endTime.value,
      task: task.value.trim(),
    })

    task.value = ''
    startTime.value = ''
    endTime.value = ''

    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 2000)
  } catch (err) {
    alert('添加失败：' + (err.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id) {
  if (confirm('确定要删除这个计划吗？')) {
    try {
      await store.deletePlan(id)
    } catch (err) {
      alert('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 格式化显示时间
function formatTimeRange(start, end) {
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`
}
</script>

<template>
  <div>
    <div class="page-header">
      <h1>📋 制定学习计划</h1>
      <p>设定时间段和学习任务，开始规划你的学习</p>
    </div>

    <!-- 新建计划表单 -->
    <div class="card">
      <div class="card-header">新建学习计划</div>
      <div class="card-body">
        <form @submit.prevent="submitPlan">
          <div class="form-group">
            <label class="form-label">日期</label>
            <input type="date" class="form-input" v-model="date" />
          </div>

          <div class="form-group">
            <label class="form-label">时间段</label>
            <div class="form-row">
              <input type="time" class="form-input" v-model="startTime" placeholder="开始时间" />
              <input type="time" class="form-input" v-model="endTime" placeholder="结束时间" />
            </div>
            <p v-if="timeError" class="form-hint" style="color: var(--danger);">{{ timeError }}</p>
            <div class="btn-group mt-2">
              <button
                v-for="preset in timePresets"
                :key="preset.label"
                type="button"
                class="btn btn-outline btn-sm"
                @click="applyPreset(preset)"
              >
                {{ preset.label }}
              </button>
            </div>
            <div class="btn-group mt-2">
              <button
                v-for="d in durationPresets"
                :key="d.minutes"
                type="button"
                class="btn btn-outline btn-sm"
                @click="applyDuration(d.minutes)"
              >
                {{ d.label }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">学习任务</label>
            <textarea
              class="form-textarea"
              v-model="task"
              placeholder="描述你要完成的学习任务，例如：复习第一章、完成数学练习题..."
              rows="3"
            ></textarea>
          </div>

          <button type="submit" class="btn btn-primary btn-block" :disabled="!isValid || submitting">
            {{ submitting ? '添加中…' : '✅ 添加学习计划' }}
          </button>
        </form>
        <div v-if="showSuccess" class="mt-2" style="color: var(--success); font-weight: 600; font-size: 0.9rem;">
          ✓ 计划已添加！
        </div>
      </div>
    </div>

    <!-- 今日计划列表 -->
    <div class="card">
      <div class="card-header">
        今日计划（{{ todayPlans.length }}）
      </div>
      <div v-if="todayPlans.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h3>今天还没有计划</h3>
        <p>在上方添加你的第一个学习计划吧</p>
      </div>
      <div v-else>
        <div
          v-for="plan in todayPlans"
          :key="plan.id"
          class="task-item"
        >
          <span :class="['task-status-dot', plan.status]"></span>
          <div class="task-info">
            <div class="task-title">{{ plan.task }}</div>
            <div class="task-meta">
              🕐 {{ formatTimeRange(plan.startTime, plan.endTime) }}
              <span v-if="plan.note">📝 有备注</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn btn-outline btn-sm" @click="handleDelete(plan.id)" title="删除">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
