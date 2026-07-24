import { reactive, computed, ref } from 'vue'
import supabase, { isSupabaseConfigured } from './db.js'

const STORAGE_KEY = 'learn-record-plans'

// ==================== util ====================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// 数据库 snake_case → 前端 camelCase
function dbToFront(row) {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    task: row.task,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
  }
}

// 前端 camelCase → 数据库 snake_case
function frontToDb(plan) {
  return {
    id: plan.id,
    date: plan.date,
    start_time: plan.startTime,
    end_time: plan.endTime,
    task: plan.task,
    status: plan.status,
    note: plan.note || '',
    created_at: plan.createdAt,
    completed_at: plan.completedAt ?? null,
  }
}

// ==================== reactive state ====================
const state = reactive({
  plans: [],
})

/** 数据是否已从远端加载完毕（用于首次渲染的 loading 态） */
const loaded = ref(false)

// ==================== 计算属性 ====================
const pendingPlans = computed(() =>
  state.plans
    .filter((p) => p.status === 'pending')
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
)

const todayPlans = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return state.plans
    .filter((p) => p.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
})

const completedPlans = computed(() =>
  state.plans
    .filter((p) => p.status === 'completed')
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
)

const incompletePlans = computed(() =>
  state.plans
    .filter((p) => p.status === 'incomplete')
    .sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${b.startTime}`))
)

// ==================== 加载数据（应用启动时调用） ====================
async function loadPlans() {
  if (loaded.value) return // 只加载一次

  if (isSupabaseConfigured()) {
    // —— 从 Supabase 加载 ——
    try {
      let allRows = []
      let from = 0
      const limit = 1000
      // 分页拉取（Supabase 单次最多 1000 行）
      while (true) {
        const { data, error } = await supabase
          .from('study_plans')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, from + limit - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        allRows = allRows.concat(data)
        if (data.length < limit) break
        from += limit
      }
      state.plans = allRows.map(dbToFront)
    } catch (err) {
      console.warn('Supabase 加载失败，回退到 localStorage', err)
      state.plans = loadFromLocalStorage()
    }
  } else {
    // —— 未配置 Supabase，从 localStorage 加载 ——
    state.plans = loadFromLocalStorage()
  }

  loaded.value = true
}

// ==================== localStorage 降级 ====================
function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plans))
}

// ==================== CRUD 操作（全部 async） ====================

async function addPlan({ date, startTime, endTime, task }) {
  const plan = {
    id: generateId(),
    date,
    startTime,
    endTime,
    task,
    status: 'pending',
    note: '',
    createdAt: new Date().toISOString(),
  }

  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('study_plans').insert(frontToDb(plan))
    if (error) {
      console.error('添加计划失败', error)
      throw error
    }
  }

  state.plans.push(plan)
  saveToLocalStorage() // 同步写入本地作离线备份
  return plan
}

async function completePlan(id) {
  await updateStatus(id, 'completed')
}

async function markIncomplete(id) {
  await updateStatus(id, 'incomplete')
}

async function resetToPending(id) {
  await updateStatus(id, 'pending')
}

async function updateStatus(id, status) {
  const now = new Date().toISOString()
  const plan = state.plans.find((p) => p.id === id)
  if (!plan) return

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('study_plans')
      .update({
        status,
        completed_at: status === 'pending' ? null : now,
      })
      .eq('id', id)
    if (error) {
      console.error('更新状态失败', error)
      throw error
    }
  }

  plan.status = status
  if (status === 'pending') {
    delete plan.completedAt
  } else {
    plan.completedAt = now
  }
  saveToLocalStorage()
}

async function updateNote(id, note) {
  const plan = state.plans.find((p) => p.id === id)
  if (!plan) return

  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('study_plans')
      .update({ note })
      .eq('id', id)
    if (error) {
      console.error('更新备注失败', error)
      throw error
    }
  }

  plan.note = note
  saveToLocalStorage()
}

async function deletePlan(id) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('study_plans').delete().eq('id', id)
    if (error) {
      console.error('删除失败', error)
      throw error
    }
  }

  const index = state.plans.findIndex((p) => p.id === id)
  if (index !== -1) state.plans.splice(index, 1)
  saveToLocalStorage()
}

async function updatePlan(id, updates) {
  const plan = state.plans.find((p) => p.id === id)
  if (!plan) return

  if (isSupabaseConfigured()) {
    const dbUpdates = {}
    if (updates.date !== undefined) dbUpdates.date = updates.date
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime
    if (updates.task !== undefined) dbUpdates.task = updates.task
    if (updates.note !== undefined) dbUpdates.note = updates.note
    if (updates.status !== undefined) dbUpdates.status = updates.status
    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('study_plans').update(dbUpdates).eq('id', id)
      if (error) {
        console.error('更新计划失败', error)
        throw error
      }
    }
  }

  Object.assign(plan, updates)
  saveToLocalStorage()
}

function getPlanById(id) {
  return state.plans.find((p) => p.id === id)
}

function getPlansByDateRange(startDate, endDate) {
  return state.plans
    .filter((p) => p.date >= startDate && p.date <= endDate)
    .sort((a, b) => `${b.date} ${a.startTime}`.localeCompare(`${a.date} ${a.startTime}`))
}

// ==================== 导入 / 导出 ====================
function exportData() {
  return JSON.stringify(state.plans, null, 2)
}

async function importData(jsonData) {
  let data
  try {
    data = JSON.parse(jsonData)
    if (!Array.isArray(data)) throw new Error('格式不正确')
  } catch {
    throw new Error('解析失败，请检查文件格式')
  }

  if (isSupabaseConfigured()) {
    // 批次插入到 Supabase（去重：先删再插）
    const batch = data.map((p) => frontToDb(p))
    const chunkSize = 100
    for (let i = 0; i < batch.length; i += chunkSize) {
      const { error } = await supabase
        .from('study_plans')
        .upsert(batch.slice(i, i + chunkSize), { onConflict: 'id' })
      if (error) {
        console.error('导入失败', error)
        throw new Error('导入到 Supabase 失败')
      }
    }
    // 重新加载
    await loadPlansForce()
  } else {
    state.plans = data
    saveToLocalStorage()
  }
}

/** 强制重新从远端拉取（导入后调用） */
async function loadPlansForce() {
  loaded.value = false
  await loadPlans()
}

// ==================== 导出 ====================
export function useStudyStore() {
  return {
    plans: state.plans,
    loaded,
    pendingPlans,
    todayPlans,
    completedPlans,
    incompletePlans,
    loadPlans,
    addPlan,
    completePlan,
    markIncomplete,
    resetToPending,
    updateNote,
    deletePlan,
    updatePlan,
    getPlanById,
    getPlansByDateRange,
    exportData,
    importData,
  }
}
