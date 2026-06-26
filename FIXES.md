# 🛠️ Исправления - Темы и SQL Миграция

## ✅ Что исправлено

### 1. Система тем 💕

**Проблема**: Темы не применялись при выборе

**Причина**: 
- Селекторы CSS использовали `:root[data-theme]` вместо `body[data-theme]`
- Не было дефолтного значения `--gradient-bg`

**Решение**:
1. ✅ Изменены все селекторы в `themes.css` с `:root[data-theme="..."]` на `body[data-theme="..."]`
2. ✅ Добавлен дефолтный `--gradient-bg` в `style.css`
3. ✅ Добавлены определения для текстур (`texture-light`, `texture-dark`)
4. ✅ Исправлена инициализация темы в `script.js`
5. ✅ Добавлена функция `setTheme()` которая применяет тему и показывает уведомление

**Файлы**:
- `themes.css` - исправлены селекторы тем
- `style.css` - добавлен дефолтный градиент
- `script.js` - исправлена инициализация
- `utils.js` - улучшена функция `setTheme()`
- `index.html` - добавлены модальные окна тем
- `admin.html` - добавлена кнопка тем и модальные окна

### 2. SQL Миграция 🗄️

**Проблема**: Ошибка `column "status" does not exist` при выполнении `supabase-schema.sql`

**Причина**: Таблица `wishes` уже существовала со старой схемой (без полей `status`, `category`)

**Решение**:
1. ✅ Создан новый файл `migrate-full.sql` который:
   - Отключает RLS временно
   - **Удаляет ВСЕ старые таблицы** (notes, moods, reviews)
   - **Удаляет ВСЕ новые таблицы** для чистой миграции
   - Создаёт новую структуру с нуля
   - Добавляет RLS политики
   - Вставляет начальные данные (prompts, challenges)

**Как использовать**:
```sql
-- В Supabase SQL Editor выполните:
-- 1. ЛИБО migrate-full.sql (если хотите всё удалить и создать заново)
-- 2. ЛИБО supabase-schema.sql (если база пустая)
```

**Файлы**:
- `migrate-full.sql` - полная миграция с очисткой
- `supabase-schema.sql` - для чистой установки (не используйте если таблица уже есть)

## 📋 Проверка работы

### Темы:
1. Откройте `index.html`
2. Нажмите кнопку 🎨 в правом нижнем углу
3. Выберите любую тему (Классическая, Природа, Океан, Тёмная, Закат)
4. ✅ Тема должна примениться immediately
5. ✅ Перезагрузите страницу - тема сохранится

### Админка:
1. Откройте `admin.html`
2. Нажмите "🎨 Темы" в боковой панели
3. Выберите тему
4. ✅ Тема применится и сохранится

### SQL:
1. Откройте Supabase → SQL Editor
2. Скопируйте **ВСЁ** содержимое `migrate-full.sql`
3. Нажмите Run
4. ✅ Проверьте Table Editor - должны быть 7 таблиц:
   - memories
   - wishes (с полями status, category, priority!)
   - prompts
   - prompt_responses
   - important_dates
   - playlist
   - challenges

## 🔍 Отладка тем

Если темы всё ещё не работают:

```javascript
// В консоли браузера проверьте:
localStorage.getItem('love_letters_theme')  // Должно быть 'classic' или другая тема
document.body.getAttribute('data-theme')    // Должно совпадать с localStorage

// Принудительно установите тему:
document.body.setAttribute('data-theme', 'classic');
localStorage.setItem('love_letters_theme', 'classic');
```

Проверьте CSS переменные:
```javascript
getComputedStyle(document.body).getPropertyValue('--bg-primary')
getComputedStyle(document.body).getPropertyValue('--accent-primary')
```

## 📊 Структура БД

### Таблица wishes (обновлённая):
```sql
CREATE TABLE wishes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'other',      -- НОВОЕ
  status VARCHAR(20) DEFAULT 'planned',      -- НОВОЕ
  priority VARCHAR(20) DEFAULT 'medium',     -- НОВОЕ
  image_url TEXT,
  completed_at TIMESTAMPTZ,                  -- НОВОЕ
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## 🎯 Следующие шаги

1. ✅ Выполните `migrate-full.sql` в Supabase
2. ✅ Проверьте что все 7 таблиц созданы
3. ✅ Обновите `supabase-config.js` с вашими ключами
4. ✅ Протестируйте темы в index.html и admin.html
5. ✅ Создайте пользователя в Authentication
6. ✅ Протестируйте вход и CRUD операции

## 📁 Обновлённые файлы

| Файл | Изменения |
|------|-----------|
| `themes.css` | Селекторы `:root` → `body`, добавлены текстуры |
| `style.css` | Дефолтный `--gradient-bg` |
| `script.js` | Исправлена инициализация тем |
| `utils.js` | Улучшена `setTheme()` |
| `index.html` | Модальные окна тем |
| `admin.html` | Кнопка тем + модальные окна |
| `admin.js` | Обработчики тем + раздел Vault |
| `migrate-full.sql` | ✨ НОВЫЙ - полная миграция |
| `DEPLOY.md` | ✨ НОВЫЙ - инструкция по развёртыванию |
| `FIXES.md` | ✨ НОВЫЙ - этот файл |

---

**Дата**: 2024
**Версия**: 2.0
**Статус**: ✅ Готово к использованию
