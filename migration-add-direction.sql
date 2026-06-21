-- Миграция: Добавление поля direction для существующих таблиц
-- Выполните этот скрипт если у вас уже есть таблицы

-- 1. Добавляем поле direction в таблицу notes
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) 
DEFAULT 'admin_to_user' 
CHECK (direction IN ('admin_to_user', 'user_to_admin'));

-- 2. Добавляем поле direction в таблицу reviews
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) 
DEFAULT 'user_to_admin' 
CHECK (direction IN ('admin_to_user', 'user_to_admin'));

-- 3. Добавляем поле direction в таблицу wishes
ALTER TABLE wishes 
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) 
DEFAULT 'user_to_admin' 
CHECK (direction IN ('admin_to_user', 'user_to_admin'));

-- 4. Опционально: Обновляем существующие записи
-- Все существующие записки считаются как от админа
UPDATE notes SET direction = 'admin_to_user' WHERE direction IS NULL;

-- Все существующие отзывы и желания считаются как от получателя
UPDATE reviews SET direction = 'user_to_admin' WHERE direction IS NULL;
UPDATE wishes SET direction = 'user_to_admin' WHERE direction IS NULL;

-- Готово! ✅
