-- ========== THEMES TABLE ==========

-- Таблица для хранения выбранной темы пользователя
CREATE TABLE IF NOT EXISTS themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL DEFAULT 'classic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_themes_user_id ON themes(user_id);

-- RLS Policies
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Пользователь видит свою тему
CREATE POLICY "Users can view own theme"
  ON themes FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователь может обновлять свою тему
CREATE POLICY "Users can update own theme"
  ON themes FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователь может вставить свою тему
CREATE POLICY "Users can insert own theme"
  ON themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Админ может видеть все темы (для просмотра темы получателя)
CREATE POLICY "Admins can view all themes"
  ON themes FOR SELECT
  USING (true);

-- ========== INSERT DEFAULT THEMES ==========

-- Доступные темы (справочник)
-- classic - Классическая (фиолетовая)
-- nature - Природа (зелёная)
-- ocean - Океан (синяя)
-- sunset - Закат (оранжевая)
-- dark - Тёмная
