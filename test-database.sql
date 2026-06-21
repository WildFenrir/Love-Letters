-- Тест: Проверка подключения к базе и таблиц
-- Выполните в SQL Editor

-- 1. Проверка что таблицы существуют
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('notes', 'moods', 'reviews', 'wishes');

-- 2. Проверка колонок direction
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND column_name = 'direction'
ORDER BY table_name;

-- 3. Проверка RLS политик
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('notes', 'moods', 'reviews', 'wishes')
ORDER BY tablename, policyname;

-- 4. Проверка что можно вставить данные (тест)
INSERT INTO wishes (title, description, direction) 
VALUES ('Тест', 'Проверка базы', 'user_to_admin');

-- 5. Проверка что данные вставились
SELECT * FROM wishes ORDER BY created_at DESC LIMIT 5;

-- 6. Удалить тестовую запись
DELETE FROM wishes WHERE title = 'Тест' AND description = 'Проверка базы';

-- 7. Проверка Storage бакета
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'wishes';

-- 8. Проверка Storage политик
SELECT policyname, cmd, roles
FROM storage.policies
WHERE bucket_id = 'wishes';
