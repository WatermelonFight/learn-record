/**
 * 数据库连接层 —— Supabase
 *
 * 你需要做：
 * 1. 去 https://supabase.com 注册账号
 * 2. 创建一个项目，记下项目 URL 和 anon key
 * 3. 在项目 SQL Editor 里执行建表语句（见文件末尾注释）
 * 4. 将下面的 SUPABASE_URL 和 SUPABASE_ANON_KEY 替换为你的值
 * 5. 在 Supabase → Authentication → Policies 中启用公开读写（或配置 RLS）
 *
 * 替换方式：在项目根目录创建 .env 文件：
 *   VITE_SUPABASE_URL=https://你的项目ID.supabase.co
 *   VITE_SUPABASE_ANON_KEY=你的anon_key
 * 然后重启 dev server
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://你的项目ID.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '你的anon_key'

// 是否已配置 Supabase（检测是否仍为占位符）
export const isSupabaseConfigured = () => {
  return (
    SUPABASE_URL &&
    !SUPABASE_URL.includes('你的项目ID') &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes('你的anon_key')
  )
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default supabase

/*
-- ============================================================
-- 在 Supabase SQL Editor 中执行以下语句建表：
-- ============================================================

CREATE TABLE IF NOT EXISTS study_plans (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL,
  start_time   TEXT NOT NULL,
  end_time     TEXT NOT NULL,
  task         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 创建索引（按日期查询加速）
CREATE INDEX IF NOT EXISTS idx_study_plans_date ON study_plans (date);

-- 启用 RLS 并要求登录（未登录用户无法读写）：
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;

-- 删除旧的公开策略（如果之前执行过）
DROP POLICY IF EXISTS "允许公开读取" ON study_plans;
DROP POLICY IF EXISTS "允许公开插入" ON study_plans;
DROP POLICY IF EXISTS "允许公开更新" ON study_plans;
DROP POLICY IF EXISTS "允许公开删除" ON study_plans;

-- 新建：仅登录用户可读写
CREATE POLICY "仅登录用户可读写"
  ON study_plans FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
*/
