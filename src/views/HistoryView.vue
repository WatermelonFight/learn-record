<script setup>
import { ref, computed } from 'vue'
import { useStudyStore } from '../stores/studyStore.js'

const store = useStudyStore()

// 视图模式：'table' | 'board'
const viewMode = ref('table')

// ===================== 筛选（共用） =====================
const filterMonth = ref('')
const filterStatus = ref('all')
const filterKeyword = ref('')
const currentPage = ref(1)
const pageSize = 20

const availableMonths = computed(() => {
  const months = new Set()
  for (const plan of store.plans) {
    if (plan.status !== 'pending') {
      months.add(plan.date.slice(0, 7))
    }
  }
  return Array.from(months).sort().reverse()
})

const historyPlans = computed(() => {
  let plans = store.plans.filter((p) => p.status !== 'pending')

  if (filterMonth.value) {
    plans = plans.filter((p) => p.date.startsWith(filterMonth.value))
  }
  if (filterStatus.value !== 'all') {
    plans = plans.filter((p) => p.status === filterStatus.value)
  }
  if (filterKeyword.value.trim()) {
    const kw = filterKeyword.value.trim().toLowerCase()
    plans = plans.filter(
      (p) =>
        p.task.toLowerCase().includes(kw) ||
        (p.note && p.note.toLowerCase().includes(kw))
    )
  }

  plans.sort((a, b) => {
    return `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
  })

  return plans
})

// ===================== 表格分页 =====================
const totalPages = computed(() => Math.ceil(historyPlans.value.length / pageSize) || 1)
const paginatedPlans = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return historyPlans.value.slice(start, start + pageSize)
})

function onFilterChange() {
  currentPage.value = 1
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// ===================== 统计 =====================
const stats = computed(() => {
  const completed = historyPlans.value.filter((p) => p.status === 'completed').length
  const incomplete = historyPlans.value.filter((p) => p.status === 'incomplete').length
  const total = historyPlans.value.length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, incomplete, total, rate }
})

// ===================== 看板视图 =====================
const boardMonth = ref(new Date().toISOString().slice(0, 7)) // YYYY-MM

const weekHeaders = ['一', '二', '三', '四', '五', '六', '日']

// 计算某月的日历网格
const calendarGrid = computed(() => {
  const [year, month] = boardMonth.value.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const daysInMonth = lastDay.getDate()

  // 获取第一天是星期几（0=日, 1=一, ..., 6=六），调整为周一=0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  // 构建该月每天的任务映射
  const taskMap = {}
  for (const plan of store.plans) {
    if (plan.status === 'pending') continue
    const planDate = plan.date
    if (!planDate.startsWith(boardMonth.value)) continue
    if (!taskMap[planDate]) taskMap[planDate] = []
    taskMap[planDate].push(plan)
  }

  // 生成网格（6行 x 7列）
  const grid = []
  let day = 1
  for (let row = 0; row < 6; row++) {
    const week = []
    for (let col = 0; col < 7; col++) {
      if ((row === 0 && col < startDow) || day > daysInMonth) {
        week.push(null)
      } else {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const tasks = taskMap[dateStr] || []
        week.push({
          day,
          date: dateStr,
          tasks,
          completed: tasks.filter((t) => t.status === 'completed').length,
          incomplete: tasks.filter((t) => t.status === 'incomplete').length,
        })
        day++
      }
    }
    grid.push(week)
    if (day > daysInMonth) break
  }

  return grid
})

// 看板月份切换
function prevBoardMonth() {
  const [y, m] = boardMonth.value.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  boardMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextBoardMonth() {
  const [y, m] = boardMonth.value.split('-').map(Number)
  const d = new Date(y, m, 1)
  boardMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function goToToday() {
  boardMonth.value = new Date().toISOString().slice(0, 7)
}

function formatBoardMonth() {
  const [y, m] = boardMonth.value.split('-')
  return `${y}年${parseInt(m)}月`
}

// 看板中某天的完成率
function dayRate(cell) {
  if (!cell || cell.tasks.length === 0) return null
  return Math.round((cell.completed / cell.tasks.length) * 100)
}

// 看板单元格颜色
function cellBgClass(cell) {
  if (!cell || cell.tasks.length === 0) return ''
  const rate = dayRate(cell)
  if (rate === 100) return 'cell-all-done'
  if (rate >= 50) return 'cell-partial'
  return 'cell-none-done'
}

// 点击看板日期，设置筛选为该日期并切换到列表视图
function clickBoardDate(cell) {
  if (!cell || cell.tasks.length === 0) return
  filterMonth.value = boardMonth.value
  filterStatus.value = 'all'
  filterKeyword.value = ''
  onFilterChange()
  viewMode.value = 'table'
}

// ===================== 格式化 =====================
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-')
  return `${y}-${m}-${d}`
}

function formatTimeRange(start, end) {
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`
}

function getStatusLabel(status) {
  if (status === 'completed') return '已完成'
  if (status === 'incomplete') return '未完成'
  return '待完成'
}

// ===================== 导入导出 =====================
function handleExport() {
  const json = store.exportData()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `学习记录备份_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const fileInput = ref(null)
const importing = ref(false)
async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (ev) => {
    importing.value = true
    try {
      await store.importData(ev.target.result)
      alert('数据导入成功！')
    } catch (err) {
      alert('导入失败：' + (err.message || '请检查文件格式'))
    } finally {
      importing.value = false
    }
  }
  reader.readAsText(file)
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// ===================== 备注弹窗 =====================
const showNoteDetail = ref(false)
const noteContent = ref('')
const noteTaskTitle = ref('')

function viewNote(plan) {
  noteTaskTitle.value = plan.task
  noteContent.value = plan.note || '无备注'
  showNoteDetail.value = true
}
</script>

<template>
  <div>
    <div class="page-header flex-between">
      <div>
        <h1>📊 历史记录</h1>
        <p>查看所有已完成和未完成的学习记录</p>
      </div>
      <div class="btn-group">
        <button class="btn btn-outline btn-sm" @click="handleExport">📥 导出备份</button>
        <label class="btn btn-outline btn-sm" :style="{ cursor: importing ? 'not-allowed' : 'pointer', opacity: importing ? 0.6 : 1 }">
          {{ importing ? '导入中…' : '📤 导入数据' }}
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            :disabled="importing"
            style="display: none;"
            @change="handleImport"
          />
        </label>
      </div>
    </div>

    <!-- 统计 -->
    <div class="card">
      <div class="card-body">
        <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center;">
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">{{ stats.total }}</div>
            <div class="text-sm text-muted">历史记录</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--success);">{{ stats.completed }}</div>
            <div class="text-sm text-muted">已完成</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--danger);">{{ stats.incomplete }}</div>
            <div class="text-sm text-muted">未完成</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.5rem; font-weight: 700;" :style="{ color: stats.rate >= 70 ? 'var(--success)' : stats.rate >= 40 ? 'var(--warning)' : 'var(--danger)' }">
              {{ stats.rate }}%
            </div>
            <div class="text-sm text-muted">完成率</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选 + 视图切换 -->
    <div class="filter-bar">
      <select class="form-select" v-model="filterMonth" @change="onFilterChange">
        <option value="">全部月份</option>
        <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
      </select>
      <select class="form-select" v-model="filterStatus" @change="onFilterChange">
        <option value="all">全部状态</option>
        <option value="completed">已完成</option>
        <option value="incomplete">未完成</option>
      </select>
      <input
        class="form-input"
        type="text"
        v-model="filterKeyword"
        placeholder="🔍 搜索..."
        @input="onFilterChange"
        style="flex: 1; min-width: 120px;"
      />
      <div class="btn-group" style="margin-left: auto;">
        <button
          :class="['btn', 'btn-sm', viewMode === 'table' ? 'btn-primary' : 'btn-outline']"
          @click="viewMode = 'table'"
        >
          📋 列表
        </button>
        <button
          :class="['btn', 'btn-sm', viewMode === 'board' ? 'btn-primary' : 'btn-outline']"
          @click="viewMode = 'board'"
        >
          📅 看板
        </button>
      </div>
    </div>

    <!-- ==================== 列表视图 ==================== -->
    <div v-if="viewMode === 'table'" class="card">
      <div v-if="historyPlans.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <h3>暂无历史记录</h3>
        <p>完成或标记任务后，记录将显示在这里</p>
      </div>
      <div v-else class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>时间段</th>
              <th>任务</th>
              <th>状态</th>
              <th>备注</th>
              <th>完成时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in paginatedPlans" :key="plan.id">
              <td style="white-space: nowrap;">{{ formatDate(plan.date) }}</td>
              <td style="white-space: nowrap;">{{ formatTimeRange(plan.startTime, plan.endTime) }}</td>
              <td>{{ plan.task }}</td>
              <td>
                <span :class="['badge', plan.status === 'completed' ? 'badge-success' : 'badge-danger']">
                  {{ getStatusLabel(plan.status) }}
                </span>
              </td>
              <td>
                <button v-if="plan.note" class="btn btn-outline btn-sm" @click="viewNote(plan)">💬 查看</button>
                <span v-else class="text-sm text-muted">-</span>
              </td>
              <td class="text-sm text-muted" style="white-space: nowrap;">
                {{ plan.completedAt ? new Date(plan.completedAt).toLocaleString('zh-CN') : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 分页（列表视图） -->
    <div v-if="viewMode === 'table' && totalPages > 1" style="display: flex; justify-content: center; align-items: center; gap: 12px; padding: 16px;">
      <button class="btn btn-outline btn-sm" :disabled="currentPage === 1" @click="prevPage">← 上一页</button>
      <span class="text-sm text-muted">{{ currentPage }} / {{ totalPages }}</span>
      <button class="btn btn-outline btn-sm" :disabled="currentPage === totalPages" @click="nextPage">下一页 →</button>
    </div>

    <!-- ==================== 看板视图 ==================== -->
    <div v-if="viewMode === 'board'">
      <!-- 月份切换 -->
      <div class="card board-container">
        <div class="board-header">
          <button class="btn btn-outline btn-sm" @click="prevBoardMonth">◀</button>
          <span class="board-month-title">{{ formatBoardMonth() }}</span>
          <button class="btn btn-outline btn-sm" @click="nextBoardMonth">▶</button>
          <button class="btn btn-outline btn-sm" @click="goToToday">今天</button>
        </div>

        <!-- 图例 -->
        <div class="board-legend">
          <span class="legend-item"><span class="legend-dot cell-all-done"></span> 全部完成</span>
          <span class="legend-item"><span class="legend-dot cell-partial"></span> 部分完成</span>
          <span class="legend-item"><span class="legend-dot cell-none-done"></span> 未完成</span>
          <span class="legend-item"><span class="legend-dot cell-empty"></span> 无任务</span>
        </div>

        <!-- 日历网格 -->
        <div class="board-grid">
          <!-- 表头：星期 -->
          <div class="board-cell board-cell-header" v-for="h in weekHeaders" :key="h">{{ h }}</div>

          <!-- 日期格子 -->
          <template v-for="(week, wi) in calendarGrid" :key="wi">
            <div
              v-for="(cell, ci) in week"
              :key="`${wi}-${ci}`"
              :class="[
                'board-cell',
                'board-cell-day',
                cell ? cellBgClass(cell) : '',
                cell && cell.tasks.length > 0 ? 'has-tasks' : '',
              ]"
              @click="clickBoardDate(cell)"
            >
              <template v-if="cell">
                <div class="cell-day-num">{{ cell.day }}</div>
                <div v-if="cell.tasks.length > 0" class="cell-tasks">
                  <div
                    v-for="t in cell.tasks.slice(0, 3)"
                    :key="t.id"
                    :class="['cell-task-tag', t.status === 'completed' ? 'tag-done' : 'tag-undone']"
                  >
                    {{ t.task.length > 8 ? t.task.slice(0, 8) + '…' : t.task }}
                  </div>
                  <div v-if="cell.tasks.length > 3" class="cell-more">
                    +{{ cell.tasks.length - 3 }} 更多
                  </div>
                </div>
                <div v-if="cell.tasks.length > 0" class="cell-stats">
                  <span class="cell-stat-done">✓{{ cell.completed }}</span>
                  <span class="cell-stat-undone">✗{{ cell.incomplete }}</span>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- 点击提示 -->
        <div class="board-footer-hint">
          💡 点击有任务的日期可跳转到列表视图查看详情
        </div>
      </div>
    </div>

    <!-- 备注查看弹窗 -->
    <div v-if="showNoteDetail" class="modal-overlay" @click.self="showNoteDetail = false">
      <div class="modal">
        <div class="modal-header">
          <span>备注详情</span>
          <button class="btn btn-outline btn-sm" @click="showNoteDetail = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="text-sm text-muted mb-2">{{ noteTaskTitle }}</div>
          <p style="white-space: pre-wrap;">{{ noteContent }}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-primary" @click="showNoteDetail = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== 看板样式 ==================== */
.board-container {
  overflow: hidden;
}

.board-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.board-month-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-heading);
  min-width: 100px;
  text-align: center;
}

.board-legend {
  display: flex;
  gap: 16px;
  padding: 10px 20px;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid var(--border);
}

.legend-dot.cell-all-done { background: var(--success-bg); border-color: var(--success); }
.legend-dot.cell-partial { background: var(--warning-bg); border-color: var(--warning); }
.legend-dot.cell-none-done { background: var(--danger-bg); border-color: var(--danger); }
.legend-dot.cell-empty { background: #f9fafb; }

/* 网格 */
.board-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: var(--border);
  border-top: 1px solid var(--border);
}

.board-cell {
  background: var(--bg-card);
  min-height: 90px;
  padding: 6px;
}

.board-cell-header {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 10px 6px;
  min-height: auto;
  background: #f9fafb;
}

.board-cell-day {
  cursor: default;
  transition: background 0.15s;
}

.board-cell-day.has-tasks {
  cursor: pointer;
}

.board-cell-day.has-tasks:hover {
  filter: brightness(0.96);
}

/* 单元格颜色状态 */
.cell-all-done {
  background: var(--success-bg);
}

.cell-partial {
  background: var(--warning-bg);
}

.cell-none-done {
  background: var(--danger-bg);
}

.cell-day-num {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cell-task-tag {
  font-size: 0.65rem;
  padding: 1px 4px;
  border-radius: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-done {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}

.tag-undone {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.cell-more {
  font-size: 0.6rem;
  color: var(--text-secondary);
  padding-left: 4px;
}

.cell-stats {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.65rem;
  font-weight: 600;
}

.cell-stat-done {
  color: #059669;
}

.cell-stat-undone {
  color: #dc2626;
}

.board-footer-hint {
  text-align: center;
  padding: 10px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  border-top: 1px solid var(--border);
}

/* ==================== 响应式：移动端看板适配 ==================== */
@media (max-width: 768px) {
  .board-cell {
    min-height: 68px;
    padding: 4px;
  }

  .cell-day-num {
    font-size: 0.7rem;
  }

  .cell-task-tag {
    font-size: 0.6rem;
  }

  .board-grid {
    font-size: 0.7rem;
  }

  .board-header {
    padding: 12px 10px;
    gap: 8px;
  }

  .board-month-title {
    font-size: 0.95rem;
    min-width: 80px;
  }
}
</style>
