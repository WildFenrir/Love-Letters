# 💌 Секретные Записки

Персональный сайт для отправки тёплых записок особенному человеку. Built with Supabase + GitHub Pages.

## 🌟 Возможности

### Для получателя (`index.html`)
- 📝 **Записки** — список всех записок в реальном времени (новые сверху)
- 😊 **Настроение** — выбор эмоции + комментарий с историей
- 💭 **Отзывы** — оценка дня звёздами + текстовые отзывы
- ✨ **Желания** — таблица желаний с возможностью добавления и загрузки изображений

### Для админа (`admin.html`)
- 🔐 **Авторизация** через Supabase Authentication
- ➕ **Создание записок** с поддержкой markdown
- ✏️ **Редактирование** и удаление записок
- 📤 **Направление сообщений** — выбор кто кому пишет (админ → получатель или получатель → админ)
- 📊 **Статистика** — количество записок, настроений, отзывов и желаний
- 😊 **Настроения получателя** — история и статистика настроений
- 💭 **Отзывы получателя** — все отзывы о дне
- ✨ **Желания получателя** — полная таблица желаний с изображениями

## 🚀 Быстрый старт

### 1. Настройка Supabase

1. Перейдите на [Supabase](https://supabase.com)
2. Создайте новый проект
3. В **Settings → API** скопируйте:
   - Project URL
   - `anon` public key
4. Вставьте значения в `supabase-config.js`:

```javascript
const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY';
```

### 2. Создание таблиц базы данных

1. Перейдите в **SQL Editor** в панели Supabase
2. Скопируйте содержимое файла `supabase-schema.sql`
3. Выполните скрипт

Или создайте таблицы вручную:

```sql
-- Записки
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'admin_to_user' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Настроения
CREATE TABLE moods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  mood_emoji TEXT NOT NULL,
  mood_text TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Отзывы
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Желания
CREATE TABLE wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  direction VARCHAR(20) DEFAULT 'user_to_admin' CHECK (direction IN ('admin_to_user', 'user_to_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Настройка Storage для изображений

1. Перейдите в **Storage** в панели Supabase
2. Создайте новый бакет с именем `wishes`
3. Сделайте его **Public**
4. В настройках бакета добавьте политику:

```sql
-- Разрешить загрузку изображений всем
CREATE POLICY "wishes_upload" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'wishes');

-- Разрешить чтение всем
CREATE POLICY "wishes_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'wishes');
```

### 4. Создание пользователя админа

1. Перейдите в **Authentication → Users**
2. Нажмите **Add User**
3. Введите email и пароль
4. Подтвердите email (или отключите подтверждение в настройках)

### 5. Локальная разработка

```bash
# Используем любой локальный сервер
# Вариант 1: Python
python -m http.server 8000

# Вариант 2: Node.js (npx)
npx serve .

# Вариант 3: VS Code Live Server
# Установите расширение и нажмите "Go Live"
```

Откройте `http://localhost:8000` в браузере.

### 6. Развёртывание на GitHub Pages

1. Создайте репозиторий на GitHub
2. Загрузите файлы проекта:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

3. В настройках репозитория:
   - Перейдите в **Settings** → **Pages**
   - Выберите ветку **main** и папку **/(root)**
   - Нажмите **Save**

4. Через несколько минут сайт будет доступен по адресу:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

## 📁 Структура проекта

```
/
├── index.html              # Главная страница (для получателя)
├── admin.html              # Админ-панель
├── style.css               # Стили (тёмная тема)
├── script.js               # Логика для index.html
├── admin.js                # Логика для admin.html
├── supabase-config.js      # Конфигурация Supabase
├── supabase-schema.sql     # SQL схема для базы данных
├── assets/
│   └── icons/              # Иконки (опционально)
└── README.md               # Этот файл
```

## 🎨 Markdown в записках

Поддерживается базовый markdown:

```markdown
# Заголовок 1
## Заголовок 2
### Заголовок 3

**Жирный текст**
*Курсив*

- Элемент списка
- Ещё элемент

[Ссылка](https://example.com)
```

## 🔒 Безопасность

- **Админ-панель** защищена Supabase Authentication
- **RLS Policies** ограничивают запись записок только для авторизованных
- **Storage Policies** ограничивают тип загружаемых файлов (только изображения)

### Рекомендации по безопасности:

1. Используйте сложный пароль для админ-аккаунта
2. Включите **Email Confirmation** для админ-аккаунта
3. Настройте RLS политики под ваши нужды
4. Регулярно делайте бэкапы базы данных

## 🛠️ Технологии

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Backend:** Supabase (PostgreSQL, Storage, Authentication, Realtime)
- **Хостинг:** GitHub Pages
- **Supabase SDK:** v2.x

## 💡 Идеи для улучшения

- [ ] Добавить тёмную/светлую тему переключателем
- [ ] Реализовать загрузку картинок в записки
- [ ] Добавить уведомления о новых записках (Email/Push)
- [ ] Экспорт данных в JSON
- [ ] Статистика по настроениям (графики)
- [ ] Комментарии к желаниям
- [ ] Отметка желаний как "исполнено"

## 📝 Лицензия

Этот проект создан для личного использования. Чувствуйте себя свободно модифицировать его под свои нужды!

---

Сделано с 💕 для особенного человека.
