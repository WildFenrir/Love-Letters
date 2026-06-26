-- =====================================================
-- LOVE LETTERS - МИГРАЦИЯ БАЗЫ ДАННЫХ
-- Удаляет старые таблицы и создаёт новую структуру
-- =====================================================

-- 1. УДАЛЯЕМ СТАРЫЕ ТАБЛИЦЫ (если существуют)
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS moods CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;

-- 3. УДАЛЯЕМ НОВЫЕ ТАБЛИЦЫ (для чистой миграции)
DROP TABLE IF EXISTS prompt_responses CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS playlist CASCADE;
DROP TABLE IF EXISTS important_dates CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS wishes CASCADE;
DROP TABLE IF EXISTS memories CASCADE;

-- Примечание: Storage buckets создаются через UI Supabase (Storage → Create bucket)
-- Или через API. Не удаляются через SQL обычным пользователем.

-- =====================================================
-- СОЗДАЁМ НОВУЮ СТРУКТУРУ
-- =====================================================

-- 5. ТАБЛИЦА memories (Воспоминания)
CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT,
  memory_date DATE NOT NULL,
  tags TEXT[],
  image_urls TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для memories
CREATE INDEX idx_memories_user ON memories(user_id);
CREATE INDEX idx_memories_date ON memories(memory_date DESC);

-- 6. ТАБЛИЦА wishes (Bucket List) - расширенная версия
CREATE TABLE wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'other',
  status VARCHAR(20) DEFAULT 'planned',
  priority VARCHAR(20) DEFAULT 'medium',
  image_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для wishes
CREATE INDEX idx_wishes_user ON wishes(user_id);
CREATE INDEX idx_wishes_status ON wishes(status);
CREATE INDEX idx_wishes_category ON wishes(category);

-- 7. ТАБЛИЦА prompts (Love Prompts)
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  target VARCHAR(10) DEFAULT 'both', -- 'him', 'her', 'both'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для prompts
CREATE INDEX idx_prompts_target ON prompts(target);

-- 8. ТАБЛИЦА prompt_responses (Ответы на Prompts)
CREATE TABLE prompt_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_id, user_id)
);

-- Индексы для prompt_responses
CREATE INDEX idx_responses_prompt ON prompt_responses(prompt_id);
CREATE INDEX idx_responses_user ON prompt_responses(user_id);

-- 9. ТАБЛИЦА important_dates (Календарь событий)
CREATE TABLE important_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  gift_ideas TEXT[],
  plans TEXT,
  reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для important_dates
CREATE INDEX idx_dates_user ON important_dates(user_id);
CREATE INDEX idx_dates_date ON important_dates(event_date);

-- 10. ТАБЛИЦА playlist (Плейлист)
CREATE TABLE playlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  youtube_url TEXT NOT NULL,
  title VARCHAR(100),
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для playlist
CREATE INDEX idx_playlist_user ON playlist(user_id);

-- 11. ТАБЛИЦА challenges (Квесты)
CREATE TABLE challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
  due_date DATE,
  proof_image_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для challenges
CREATE INDEX idx_challenges_user ON challenges(user_id);
CREATE INDEX idx_challenges_status ON challenges(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Включаем RLS для всех таблиц
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- ========== memories POLICIES ==========
CREATE POLICY "Users can view own memories"
  ON memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- ========== wishes POLICIES ==========
CREATE POLICY "Users can view own wishes"
  ON wishes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wishes"
  ON wishes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wishes"
  ON wishes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wishes"
  ON wishes FOR DELETE
  USING (auth.uid() = user_id);

-- ========== prompts POLICIES ==========
CREATE POLICY "Anyone can view prompts"
  ON prompts FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can insert prompts"
  ON prompts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can update prompts"
  ON prompts FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete prompts"
  ON prompts FOR DELETE
  USING (auth.role() = 'authenticated');

-- ========== prompt_responses POLICIES ==========
CREATE POLICY "Users can view own responses"
  ON prompt_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON prompt_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses"
  ON prompt_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own responses"
  ON prompt_responses FOR DELETE
  USING (auth.uid() = user_id);

-- ========== important_dates POLICIES ==========
CREATE POLICY "Users can view own dates"
  ON important_dates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dates"
  ON important_dates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dates"
  ON important_dates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dates"
  ON important_dates FOR DELETE
  USING (auth.uid() = user_id);

-- ========== playlist POLICIES ==========
CREATE POLICY "Users can view own playlist"
  ON playlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlist"
  ON playlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlist"
  ON playlist FOR DELETE
  USING (auth.uid() = user_id);

-- ========== challenges POLICIES ==========
CREATE POLICY "Users can view own challenges"
  ON challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON challenges FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ - Love Prompts
-- =====================================================

INSERT INTO prompts (question, target, created_by) VALUES
-- Для обоих
('Какое ваше любимое совместное воспоминание?', 'both', NULL),
('Что вас привлекло друг в друге при первой встрече?', 'both', NULL),
('Какое ваше любимое место для свиданий?', 'both', NULL),
('Какой момент в отношениях был самым романтичным?', 'both', NULL),
('Что вы больше всего цените в наших отношениях?', 'both', NULL),

-- Для него
('Что ты чувствуешь, когда видишь её улыбку?', 'him', NULL),
('Как изменилась твоя жизнь после встречи с ней?', 'him', NULL),
('Что ты думаешь о вашем будущем вместе?', 'him', NULL),
('Какая её черта характера тебе нравится больше всего?', 'him', NULL),
('Что ты готов сделать ради её счастья?', 'him', NULL),

-- Для неё
('Что ты чувствуешь, когда он тебя обнимает?', 'her', NULL),
('Какое его качество тебя восхищает?', 'her', NULL),
('Что ты думаешь, когда он смотрит на тебя?', 'her', NULL),
('Как ты понимаешь, что он тебя любит?', 'her', NULL),
('Что ты хочешь пожелать ему на будущее?', 'her', NULL);

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ - Challenges
-- =====================================================

INSERT INTO challenges (title, description, status, due_date, user_id) VALUES
('Романтический ужин', 'Приготовьте ужин при свечах дома или в красивом месте', 'pending', NULL, NULL),
('Фотосессия', 'Устройте профессиональную или домашнюю фотосессию', 'pending', NULL, NULL),
('Письмо любви', 'Напишите друг другу письмо от руки с признаниями', 'pending', NULL, NULL),
('Танец', 'Научитесь танцевать медленный танец вместе', 'pending', NULL, NULL),
('Путешествие', 'Спланируйте поездку в новое место', 'pending', NULL, NULL),
('Совместное хобби', 'Найдите занятие, которое понравится вам обоим', 'pending', NULL, NULL),
('День без телефонов', 'Проведите целый день только вдвоём, без гаджетов', 'pending', NULL, NULL),
('Посмотрите рассвет', 'Встретьте рассвет вместе в красивом месте', 'pending', NULL, NULL);

-- =====================================================
-- ФУНКЦИИ И ТРИГГЕРЫ
-- =====================================================

-- Функция для автоматического updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wishes_updated_at BEFORE UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_responses_updated_at BEFORE UPDATE ON prompt_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_important_dates_updated_at BEFORE UPDATE ON important_dates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ГОТОВО!
-- =====================================================
