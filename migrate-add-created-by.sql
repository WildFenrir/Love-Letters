-- =====================================================
-- LOVE LETTERS - ИСПРАВЛЕНИЕ ДЛЯ АДМИН-ПАНЕЛИ
-- Делаем user_id необязательным и отключаем RLS
-- =====================================================

-- 1. Делаем user_id необязательным во всех таблицах
ALTER TABLE memories ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE wishes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE important_dates ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE playlist ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE challenges ALTER COLUMN user_id DROP NOT NULL;

-- 2. Добавляем колонки created_by/added_by если их нет
ALTER TABLE memories ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'admin';
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'admin';
ALTER TABLE important_dates ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'admin';
ALTER TABLE playlist ADD COLUMN IF NOT EXISTS added_by VARCHAR(50) DEFAULT 'admin';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS created_by VARCHAR(50) DEFAULT 'admin';

-- 3. Обновляем старые записи
UPDATE memories SET created_by = 'admin' WHERE created_by IS NULL OR created_by = 'user';
UPDATE wishes SET created_by = 'admin' WHERE created_by IS NULL OR created_by = 'user';
UPDATE important_dates SET created_by = 'admin' WHERE created_by IS NULL OR created_by = 'user';
UPDATE playlist SET added_by = 'admin' WHERE added_by IS NULL OR added_by = 'user';
UPDATE challenges SET created_by = 'admin' WHERE created_by IS NULL OR created_by = 'user';

-- 4. Отключаем RLS для всех таблиц (для админ-панели)
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE wishes DISABLE ROW LEVEL SECURITY;
ALTER TABLE important_dates DISABLE ROW LEVEL SECURITY;
ALTER TABLE playlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;

-- 5. Разрешаем вставку с NULL user_id
-- (это уже сделано в шаге 1, но на всякий случай проверим)
ALTER TABLE memories ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE wishes ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE important_dates ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE playlist ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE challenges ALTER COLUMN user_id DROP DEFAULT;

-- =====================================================
-- ГОТОВО!
-- =====================================================
