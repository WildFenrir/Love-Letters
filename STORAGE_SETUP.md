# 🔧 Настройка Supabase Storage для изображений

## Пошаговая инструкция

### Шаг 1: Проверьте создан ли бакет

1. Откройте https://app.supabase.com
2. Выберите ваш проект
3. В левом меню нажмите **Storage**
4. Должен быть бакет с именем `wishes`

**Если бакета нет:**
- Нажмите **New Bucket**
- Name: `wishes`
- Включите **Public bucket**
- Нажмите **Create bucket**

---

### Шаг 2: Проверьте настройки бакета

1. Нажмите на бакет `wishes`
2. Убедитесь что:
   - ✅ **Public bucket** включён (зелёный переключатель)
   - ✅ **File size limit**: 5242880 (5MB) или больше
   - ✅ **Allowed MIME types**: `image/*` или пусто (все типы)

---

### Шаг 3: Проверьте политики доступа

1. В бакете перейдите во вкладку **Policies**
2. Должны быть 2 политики:

**Для чтения (SELECT):**
```sql
Name: Enable public read
Allowed Operation: SELECT
Target roles: anon, authenticated
Policy definition: true
```

**Для загрузки (INSERT):**
```sql
Name: Enable public upload
Allowed Operation: INSERT
Target roles: anon, authenticated
Policy definition: true
```

**Если политик нет:**
- Нажмите **New Policy**
- Выберите **For full customization**
- Выберите операцию (SELECT или INSERT)
- Target roles: `anon`, `authenticated`
- Policy definition: `true`
- Нажмите **Review** → **Save policy**

---

### Шаг 4: Проверьте CORS настройки

1. В **Storage** перейдите во вкладку **Configuration**
2. Проверьте **CORS origins**:
   - Должно быть: `*` или ваш домен
   - Для локальной разработки: `http://localhost:*`

**Если нужно изменить:**
```bash
# Через Supabase CLI или API
# Или просто оставьте * для разработки
```

---

### Шаг 5: Тестирование через UI

1. В бакете `wishes` нажмите **Upload**
2. Выберите любое изображение
3. Если загрузилось — ✅ бакет работает
4. Если ошибка — ❌ проблема в политиках или настройках

---

## 🚀 Быстрое исправление через SQL

Выполните в **SQL Editor**:

```sql
-- 1. Создать бакет если нет
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wishes', 'wishes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Удалить старые политики
DO $$
BEGIN
  DROP POLICY IF EXISTS "Enable public read" ON storage.objects;
  DROP POLICY IF EXISTS "Enable public upload" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Создать новые политики
CREATE POLICY "Enable public read" ON storage.objects
  FOR SELECT TO public 
  USING (bucket_id = 'wishes');

CREATE POLICY "Enable public upload" ON storage.objects
  FOR INSERT TO anon, authenticated 
  WITH CHECK (bucket_id = 'wishes');

-- 4. Проверить что всё создалось
SELECT * FROM storage.buckets WHERE id = 'wishes';
SELECT * FROM storage.policies WHERE bucket_id = 'wishes';
```

---

## 🐛 Отладка

Откройте консоль браузера (F12) и посмотрите логи:

```javascript
// Должны быть сообщения:
🖼️ Попытка загрузки изображения...
Имя файла: 1234567890_image.jpg
📤 Загрузка изображения: {fileName, fileSize, fileType, path}
📥 Результат загрузки: {data, error}
✅ Публичный URL: https://...
```

**Если видите ошибку:**
- `403 Forbidden` → проблема с политиками
- `404 Not Found` → бакет не существует
- `Failed to fetch` → CORS или сеть
- `File too large` → файл больше 5MB

---

## ✅ Альтернативное решение

Если изображения не работают — можно **отключить загрузку** и использовать только текст:

1. В `index.html` удалите или скройте поле загрузки изображения
2. В `script.js` закомментируйте загрузку изображений
3. В `admin.html` скройте колонку с изображениями

Желания будут работать и без картинок! ✨

---

## 📞 Если ничего не помогает

1. Откройте **Network** tab в консоли (F12)
2. Попробуйте загрузить изображение
3. Найдите failed запрос к `supabase.co/storage/v1/object/wishes/...`
4. Посмотрите **Response** — там будет точная ошибка
5. Покажите скриншот ошибки
