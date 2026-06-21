-- Настройка Supabase Storage для изображений желаний
-- Выполните этот скрипт в SQL Editor

-- 1. Создаём бакет "wishes" (публичный)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wishes', 'wishes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Очищаем старые политики если есть
DROP POLICY IF EXISTS "wishes_public_read" ON storage.objects;
DROP POLICY IF EXISTS "wishes_upload" ON storage.objects;
DROP POLICY IF EXISTS "wishes_delete" ON storage.objects;

-- 3. Политика для чтения всем (публичный доступ к изображениям)
CREATE POLICY "wishes_public_read" ON storage.objects
  FOR SELECT 
  USING (bucket_id = 'wishes');

-- 4. Политика для загрузки изображений всем (анонимно + авторизованным)
CREATE POLICY "wishes_upload" ON storage.objects
  FOR INSERT TO anon, authenticated 
  WITH CHECK (
    bucket_id = 'wishes' 
    AND (
      LOWER(SUBSTRING(name FROM '\.(jpg|jpeg|png|gif|webp)$')) IN ('.jpg', '.jpeg', '.png', '.gif', '.webp')
      OR name LIKE '%.jpg'
      OR name LIKE '%.jpeg'
      OR name LIKE '%.png'
      OR name LIKE '%.gif'
      OR name LIKE '%.webp'
    )
  );

-- 5. Политика для удаления (только авторизованным)
CREATE POLICY "wishes_delete" ON storage.objects
  FOR DELETE TO authenticated 
  USING (bucket_id = 'wishes');

-- Готово! ✅
-- Теперь можно загружать изображения в бакет "wishes"
