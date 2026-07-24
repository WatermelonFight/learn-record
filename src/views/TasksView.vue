<script setup>
import { ref, computed } from 'vue'
import { useStudyStore } from '../stores/studyStore.js'

const store = useStudyStore()

// 筛选状态
const filterStatus = ref('all') // 'all' | 'pending' | 'completed' | 'incomplete'
const searchText = ref('')
const showNoteModal = ref(false)
const editingPlan = ref(null)
const noteText = ref('')
const showConfirmDialog = ref(false)
const confirmAction = ref(null)
const confirmTarget = ref(null)

// 按日期分组的计划
const groupedPlans = computed(() => {
  let plans = [...store.plans]

  // 按状态筛选
  if (filterStatus.value !== 'all') {
    plans = plans.filter((p) => p.status === filterStatus.value)
  }

  // 按搜索文本筛选
  if (searchText.value.trim()) {
    const kw = searchText.value.trim().toLowerCase()
    plans = plans.filter(
      (p) =>
        p.task.toLowerCase().includes(kw) ||
        (p.note && p.note.toLowerCase().includes(kw))
    )
  }

  // 按日期排序（最近的在前）
  plans.sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))

  // 按日期分组
  const groups = {}
  for (const plan of plans) {
    if (!groups[plan.date]) {
      groups[plan.date] = []
    }
    groups[plan.date].push(plan)
  }

  return Object.entries(groups).map(([date, items]) => ({
    date,
    items,
    weekday: getWeekday(date),
  }))
})

function getWeekday(dateStr) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return weekdays[d.getDay()]
}

function formatTimeRange(start, end) {
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
}

// 完成 / 未完成
function handleComplete(plan) {
  confirmAction.value = 'complete'
  confirmTarget.value = plan
  showConfirmDialog.value = true
}

function handleIncomplete(plan) {
  confirmAction.value = 'incomplete'
  confirmTarget.value = plan
  showConfirmDialog.value = true
}

function handleReset(plan) {
  confirmAction.value = 'reset'
  confirmTarget.value = plan
  showConfirmDialog.value = true
}

const actionLoading = ref(false)

async function confirmActionExecute() {
  if (!confirmTarget.value || actionLoading.value) return
  const plan = confirmTarget.value
  actionLoading.value = true

  try {
    if (confirmAction.value === 'complete') {
      await store.completePlan(plan.id)
    } else if (confirmAction.value === 'incomplete') {
      await store.markIncomplete(plan.id)
    } else if (confirmAction.value === 'reset') {
      await store.resetToPending(plan.id)
    }
    showConfirmDialog.value = false
    confirmTarget.value = null
    confirmAction.value = null
  } catch (err) {
    alert('操作失败：' + (err.message || '未知错误'))
  } finally {
    actionLoading.value = false
  }
}

// 备注
function openNoteModal(plan) {
  editingPlan.value = plan
  noteText.value = plan.note || ''
  showNoteModal.value = true
}

async function saveNote() {
  if (editingPlan.value && !actionLoading.value) {
    actionLoading.value = true
    try {
      await store.updateNote(editingPlan.value.id, noteText.value)
      showNoteModal.value = false
      editingPlan.value = null
    } catch (err) {
      alert('保存备注失败：' + (err.message || '未知错误'))
    } finally {
      actionLoading.value = false
    }
  }
}

// 删除
async function handleDelete(plan) {
  if (confirm(`确定要删除任务「${plan.task}」吗？此操作不可撤销。`)) {
    try {
      await store.deletePlan(plan.id)
    } catch (err) {
      alert('删除失败：' + (err.message || '未知错误'))
    }
  }
}

// 统计
const stats = computed(() => {
  const total = store.plans.length
  const pending = store.pendingPlans.value.length
  const completed = store.completedPlans.value.length
  const incomplete = store.incompletePlans.value.length
  return { total, pending, completed, incomplete }
})

const confirmDialogTitle = computed(() => {
  if (confirmAction.value === 'complete') return '确认完成'
  if (confirmAction.value === 'incomplete') return '确认未完成'
  if (confirmAction.value === 'reset') return '重置状态'
  return ''
})

const confirmDialogText = computed(() => {
  if (!confirmTarget.value) return ''
  const plan = confirmTarget.value
  if (confirmAction.value === 'complete') return `将「${plan.task}」标记为已完成？`
  if (confirmAction.value === 'incomplete') return `将「${plan.task}」标记为未完成？`
  if (confirmAction.value === 'reset') return `将「${plan.task}」重置为待完成状态？`
  return ''
})
</script>

<template>
  <div>
    <div class="page-header">
      <h1>✅ 任务管理</h1>
      <p>查看、完成和记录你的学习任务</p>
    </div>

    <!-- 统计卡片 -->
    <div class="card">
      <div class="card-body">
        <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;">
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">{{ stats.total }}</div>
            <div class="text-sm text-muted">全部任务</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">{{ stats.pending }}</div>
            <div class="text-sm text-muted">待完成</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">{{ stats.completed }}</div>
            <div class="text-sm text-muted">已完成</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">{{ stats.incomplete }}</div>
            <div class="text-sm text-muted">未完成</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <select class="form-select" v-model="filterStatus">
        <option value="all">全部状态</option>
        <option value="pending">⏳ 待完成</option>
        <option value="completed">✅ 已完成</option>
        <option value="incomplete">❌ 未完成</option>
      </select>
      <input
        class="form-input"
        type="text"
        v-model="searchText"
        placeholder="🔍 搜索任务..."
        style="flex: 1; min-width: 160px;"
      />
    </div>

    <!-- 任务列表 -->
    <div v-if="groupedPlans.length === 0" class="card">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <h3>暂无任务</h3>
        <p>去 <router-link to="/plan">制定计划</router-link> 添加你的第一个学习任务吧</p>
      </div>
    </div>

    <div v-for="group in groupedPlans" :key="group.date" class="card">
      <div class="date-group-title">
        {{ formatDate(group.date) }} 星期{{ group.weekday }}
      </div>
      <div v-for="plan in group.items" :key="plan.id" class="task-item">
        <span :class="['task-status-dot', plan.status]"></span>
        <div class="task-info">
          <div class="task-title">{{ plan.task }}</div>
          <div class="task-meta">
            🕐 {{ formatTimeRange(plan.startTime, plan.endTime) }}
            <span v-if="plan.status === 'completed'" style="color: var(--success);">✅ 已完成</span>
            <span v-else-if="plan.status === 'incomplete'" style="color: var(--danger);">❌ 未完成</span>
            <span v-else style="color: var(--warning);">⏳ 待完成</span>
          </div>
          <div v-if="plan.note" class="task-note">
            💬 {{ plan.note }}
          </div>
        </div>
        <div class="task-actions">
          <template v-if="plan.status === 'pending'">
            <button class="btn btn-success btn-sm" @click="handleComplete(plan)">✓ 完成</button>
            <button class="btn btn-warning btn-sm" @click="handleIncomplete(plan)">✗ 未完成</button>
          </template>
          <template v-else>
            <button class="btn btn-outline btn-sm" @click="handleReset(plan)">↩ 重置</button>
          </template>
          <button class="btn btn-outline btn-sm" @click="openNoteModal(plan)">📝</button>
          <button class="btn btn-outline btn-sm" @click="handleDelete(plan)">🗑️</button>
        </div>
      </div>
    </div>

    <!-- 备注编辑弹窗 -->
    <div v-if="showNoteModal" class="modal-overlay" @click.self="showNoteModal = false">
      <div class="modal">
        <div class="modal-header">
          <span>编辑备注</span>
          <button class="btn btn-outline btn-sm" @click="showNoteModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="editingPlan" class="mb-4">
            <div class="text-sm text-muted">{{ editingPlan.task }}</div>
          </div>
          <textarea
            class="form-textarea"
            v-model="noteText"
            placeholder="添加学习心得、备注..."
            rows="4"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showNoteModal = false">取消</button>
          <button class="btn btn-primary" @click="saveNote">保存</button>
        </div>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <div v-if="showConfirmDialog" class="modal-overlay" @click.self="showConfirmDialog = false">
      <div class="modal">
        <div class="modal-header">{{ confirmDialogTitle }}</div>
        <div class="modal-body">
          <p class="confirm-text">{{ confirmDialogText }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showConfirmDialog = false">取消</button>
          <button class="btn btn-primary" :disabled="actionLoading" @click="confirmActionExecute">
            {{ actionLoading ? '处理中…' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
