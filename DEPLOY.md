# 🚀 Инструкция по развёртыванию Love Letters

## 1. Настройка Supabase

### 1.1 Создайте проект
1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Дождитесь завершения создания

### 1.2 Настройте базу данных
1. Откройте **SQL Editor** в панели Supabase
2. Скопируйте **всё** содержимое файла `supabase-schema.sql`
3. Вставьте в SQL Editor и нажмите **Run**
4. ✅ Будут созданы:
   - 7 таблиц (memories, wishes, prompts, prompt_responses, important_dates, playlist, challenges)
   - RLS-политики для всех таблиц
   - Storage buckets (wishes, memories, challenges, private_vault)
   - Начальные данные (prompts, challenges)

### 1.3 Получите ключи доступа
1. Перейдите в **Settings → API**
2. Скопируйте:
   - **Project URL** (например: `https://xxxxx.supabase.co`)
   - **anon public key** (длинная строка)

### 1.4 Настройте `supabase-config.js`
```javascript
const supabaseUrl = 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = 'YOUR_ANON_KEY';
const ADMIN_EMAIL = 'your-email@example.com';
```

### 1.5 Создайте пользователя
1. Перейдите в **Authentication → Users**
2. Нажмите **Add User**
3. Введите email и пароль
4. Запомните пароль для входа в админку

## 2. Локальное тестирование

```bash
# Вариант 1: Python
python -m http.server 8000

# Вариант 2: Node.js
npx serve .

# Вариант 3: VS Code Live Server
```

Откройте в браузере:
- **Главная страница**: http://localhost:8000/index.html
- **Админка**: http://localhost:8000/admin.html

## 3. Развёртывание на GitHub Pages

### 3.1 Создайте репозиторий
```bash
git init
git add .
git commit -m "Love Letters - Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/love-letters.git
git push -u origin main
```

### 3.2 Настройте GitHub Pages
1. Откройте репозиторий на GitHub
2. Перейдите в **Settings → Pages**
3. Выберите:
   - **Source**: Deploy from a branch
   - **Branch**: main / (root)
4. Нажмите **Save**

### 3.3 Доступ к сайту
Через 1-2 минуты сайт будет доступен по адресу:
```
https://YOUR_USERNAME.github.io/love-letters/
```

## 4. Проверка работы

### 4.1 Главная страница (index.html)
- [ ] Открывается боковая панель
- [ ] Переключение между разделами работает
- [ ] Кнопка темы (🎨) открывает модальное окно
- [ ] Выбор темы применяет изменения
- [ ] Кнопка входа открывает модальное окно

### 4.2 Админ-панель (admin.html)
- [ ] Вход с email/паролем работает
- [ ] Дашборд показывает статистику
- [ ] Все 8 разделов доступны (Дашборд, Воспоминания, Bucket List, Prompts, Календарь, Плейлист, Квесты, Сейф)
- [ ] Кнопка тем (🎨) работает
- [ ] CRUD операции работают (создание, редактирование, удаление)

### 4.3 База данных
Проверьте в Supabase **Table Editor**:
- [ ] `memories` - воспоминания
- [ ] `wishes` - цели с status и category
- [ ] `prompts` - вопросы
- [ ] `prompt_responses` - ответы
- [ ] `important_dates` - события
- [ ] `playlist` - YouTube треки
- [ ] `challenges` - квесты

### 4.4 Storage
Проверьте в Supabase **Storage**:
- [ ] `wishes` - публичный, для фото целей
- [ ] `memories` - публичный, для фото воспоминаний
- [ ] `challenges` - публичный, для фото квестов
- [ ] `private_vault` - приватный, для личных файлов

## 5. Возможные проблемы и решения

### Ошибка: "Invalid API key"
**Решение**: Проверьте `supabase-config.js` - ключ должен быть `anon public`, не `service_role`

### Ошибка: "relation does not exist"
**Решение**: Выполните `supabase-schema.sql` в SQL Editor

### Не загружаются изображения
**Решение**: 
1. Проверьте что buckets созданы в Storage
2. Проверьте RLS-политики для buckets

### Не работает тема
**Решение**:
1. Проверьте что `themes.css` подключён
2. Очистите localStorage: `localStorage.clear()`
3. Перезагрузите страницу

### 404 на GitHub Pages
**Решение**:
1. Подождите 2-3 минуты после деплоя
2. Проверьте что файл называется `index.html` (не `Index.html`)
3. В настройках Pages выберите правильную ветку

## 6. Дополнительные настройки

### Изменение Admin Email
В `supabase-config.js`:
```javascript
const ADMIN_EMAIL = 'new-email@example.com';
```

### Добавление своих Love Prompts
Через админ-панель → Love Prompts → Добавить вопрос

### Настройка напоминаний
В админ-панели → Календарь → Добавить событие → "Напомнить за X дней"

## 7. Безопасность

✅ **Сделано**:
- RLS-политики для всех таблиц
- Аутентификация через Supabase Auth
- Приватный bucket для личных файлов
- Валидация на уровне БД

⚠️ **Рекомендации**:
- Используйте сложный пароль для админа
- Включите Email Confirmation в Authentication
- Регулярно делайте бэкапы БД
- Не публикуйте `service_role` ключ на клиенте

## 8. Обновление проекта

Для обновления существующего развёртывания:
```bash
git add .
git commit -m "Update: описание изменений"
git push
```

GitHub Pages обновится автоматически через 1-2 минуты.

---

## 💕 Готово!

Теперь у вас есть персональное пространство для вашей истории любви!

**Поддержка**: Если возникли проблемы, проверьте консоль браузера (F12) на наличие ошибок.
