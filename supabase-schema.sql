-- Секретные Записки - Схема базы данных для Supabase
-- Выполните этот скрипт в SQL Editor на https://app.supabase.com

-- ========== Таблицы ==========

-- Записки
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'admin_to_user' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настроения
CREATE TABLE IF NOT EXISTS moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  mood_emoji TEXT NOT NULL,
  mood_text TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отзывы (о дне / общие)
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Желания
CREATE TABLE IF NOT EXISTS wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== Индексы для производительности ==========

CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moods_created_at ON moods(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_created_at ON wishes(created_at DESC);

-- ========== Миграция для существующих таблиц ==========

-- Если таблицы уже созданы, добавьте поле direction:
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'admin_to_user' CHECK (direction IN ('admin_to_user', 'user_to_admin'));
-- ALTER TABLE reviews ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin'));
-- ALTER TABLE wishes ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin'));

-- Обновите существующие записи (опционально):
-- UPDATE notes SET direction = 'admin_to_user' WHERE direction IS NULL;
-- UPDATE reviews SET direction = 'user_to_admin' WHERE direction IS NULL;
-- UPDATE wishes SET direction = 'user_to_admin' WHERE direction IS NULL;

-- Если таблица reviews уже создана с note_id, выполните это:
-- ALTER TABLE reviews DROP COLUMN IF EXISTS note_id;
-- ALTER TABLE reviews ALTER COLUMN text SET NOT NULL;

-- ========== RLS (Row Level Security) ==========

-- Включаем RLS для всех таблиц
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;

-- ========== Политики доступа ==========

-- Записки: чтение всем, запись только авторизованным
CREATE POLICY "notes_public_read" ON notes
  FOR SELECT USING (true);

CREATE POLICY "notes_auth_insert" ON notes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notes_auth_update" ON notes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "notes_auth_delete" ON notes
  FOR DELETE TO authenticated USING (true);

-- Настроения: чтение всем, запись всем (анонимно)
CREATE POLICY "moods_public_read" ON moods
  FOR SELECT USING (true);

CREATE POLICY "moods_public_insert" ON moods
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Отзывы: чтение всем, запись всем (анонимно)
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_public_insert" ON reviews
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Желания: чтение всем, запись только авторизованным
CREATE POLICY "wishes_public_read" ON wishes
  FOR SELECT USING (true);

CREATE POLICY "wishes_auth_insert" ON wishes
  FOR INSERT TO authenticated WITH CHECK (true);

-- ========== Триггер для updated_at ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========== Storage Bucket для изображений желаний ==========

-- 1. Создаём бакет (если не создан через UI)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wishes', 'wishes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Политика для чтения всем (публичный доступ)
CREATE POLICY "wishes_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'wishes');

-- 3. Политика для загрузки изображений всем (анонимно + авторизованным)
CREATE POLICY "wishes_upload" ON storage.objects
  FOR INSERT TO anon, authenticated 
  WITH CHECK (
    bucket_id = 'wishes' 
    AND (LOWER(SUBSTRING(name FROM '\.(jpg|jpeg|png|gif|webp)$')) IN ('.jpg', '.jpeg', '.png', '.gif', '.webp'))
  );

-- 4. Политика для удаления (только авторизованным)
CREATE POLICY "wishes_delete" ON storage.objects
  FOR DELETE TO authenticated 
  USING (bucket_id = 'wishes');
