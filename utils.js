/**
 * Love Letters - Общие утилиты
 * Markdown parser, date formatter, toast, theme system, supabase helpers
 */

// ========== MARKDOWN PARSER ==========

/**
 * Простой Markdown парсер
 * Поддерживает: заголовки, жирный, курсив, списки, ссылки, переносы строк
 */
export function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text
    // Экранирование HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Заголовки
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Жирный текст
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    
    // Курсив
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    
    // Ссылки [text](url)
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    // Переносы строк
    .replace(/\n$/gim, '<br>')
    
    // Неупорядоченные списки
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(\n<li>.*<\/li>)/gim, '<ul>$1</ul>')
    
    // Упорядоченные списки
    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  
  // Оборачиваем соседние <li> в <ul>
  html = html.replace(/<\/li>\n<li>/g, '</li><li>');
  
  return html;
}

// ========== DATE FORMATTER ==========

const monthNames = {
  ru: ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

const monthNamesShort = {
  ru: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

const dayNames = {
  ru: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

/**
 * Форматирование даты
 * @param {Date|string} date - Дата для форматирования
 * @param {string} format - Формат: 'full', 'short', 'time', 'relative', 'DMY', 'MDY'
 * @param {string} locale - 'ru' или 'en'
 */
export function formatDate(date, format = 'full', locale = 'ru') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  
  const getMonthName = (index) => monthNames[locale][index];
  const getMonthNameShort = (index) => monthNamesShort[locale][index];
  const getDayName = (index) => dayNames[locale][index];
  
  switch (format) {
    case 'full':
      return `${day} ${getMonthName(month)} ${year}`;
    case 'short':
      return `${day} ${getMonthNameShort(month)} ${year}`;
    case 'time':
      return `${hours}:${minutes}`;
    case 'datetime':
      return `${day} ${getMonthNameShort(month)} ${year}, ${hours}:${minutes}`;
    case 'DMY':
      return `${day.toString().padStart(2, '0')}.${(month + 1).toString().padStart(2, '0')}.${year}`;
    case 'MDY':
      return `${getMonthNameShort(month)} ${day}, ${year}`;
    case 'ISO':
      return d.toISOString();
    case 'relative':
      return formatRelativeDate(d, locale);
    case 'day':
      return getDayName(d.getDay());
    default:
      return `${day} ${getMonthName(month)} ${year}`;
  }
}

/**
 * Относительное форматирование даты ("2 часа назад", "вчера")
 */
function formatRelativeDate(date, locale = 'ru') {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (locale === 'ru') {
    if (seconds < 60) return 'Только что';
    if (minutes < 60) return `${minutes} мин. назад`;
    if (hours < 24) return `${hours} ч. назад`;
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return formatDate(date, 'full', 'ru');
  } else {
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return formatDate(date, 'full', 'en');
  }
}

/**
 * Получить год и месяц из даты
 */
export function getDateParts(date) {
  const d = new Date(date);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate()
  };
}

// ========== TOAST NOTIFICATIONS ==========

/**
 * Показать toast уведомление
 * @param {string} message - Текст уведомления
 * @param {string} type - 'success', 'error', 'warning', 'info'
 * @param {number} duration - Длительность в мс
 */
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.querySelector('.toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Анимация появления
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Удаление через duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ========== THEME SYSTEM ==========

const THEME_KEY = 'love_letters_theme';

/**
 * Получить текущую тему
 */
export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'default';
}

/**
 * Установить тему
 */
export function setTheme(themeName) {
  localStorage.setItem(THEME_KEY, themeName);
  document.body.setAttribute('data-theme', themeName);
  showToast(`Тема "${themeName}" применена ✨`, 'success');
}

/**
 * Инициализировать тему при загрузке
 */
export function initTheme() {
  const theme = getCurrentTheme();
  document.body.setAttribute('data-theme', theme);
  updateThemeOnBody(theme);
}

/**
 * Обновить стили темы на body
 */
function updateThemeOnBody(themeName) {
  document.body.setAttribute('data-theme', themeName);
}

/**
 * Переключить тёмную/светлую тему
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const newTheme = current === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  return newTheme;
}

// ========== SUPABASE HELPERS ==========

/**
 * Загрузить файл в Supabase Storage
 * @param {string} bucket - Название бакета
 * @param {File} file - Файл для загрузки
 * @param {string} path - Путь в бакете
 */
export async function uploadToStorage(bucket, file, path) {
  const { createClient } = await import('./supabase-config.js');
  const { supabase } = createClient();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  
  // Получить публичный URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return publicUrl;
}

/**
 * Удалить файл из Supabase Storage
 */
export async function deleteFromStorage(bucket, path) {
  const { createClient } = await import('./supabase-config.js');
  const { supabase } = createClient();
  
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  
  if (error) throw error;
}

/**
 * Извлечь YouTube ID из URL
 */
export function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Получить YouTube embed URL
 */
export function getYouTubeEmbedUrl(url) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://www.youtube.com/embed/${videoId}`;
}

// ========== DRAG AND DROP HELPERS ==========

/**
 * Инициализировать drag & drop зону
 * @param {HTMLElement} dropZone - Элемент зоны
 * @param {Function} onFile - Callback при получении файла
 */
export function initDropZone(dropZone, onFile) {
  if (!dropZone) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
  });
  
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFile(files[0]);
    }
  }, false);
}

// ========== FORMAT HELPERS ==========

/**
 * Категории для Bucket List
 */
export const wishCategories = {
  travel: { name: 'Путешествия', icon: '✈️', color: '#4CAF50' },
  food: { name: 'Еда', icon: '🍽️', color: '#FF9800' },
  intimate: { name: 'Интим', icon: '🔥', color: '#E91E63' },
  entertainment: { name: 'Развлечения', icon: '🎬', color: '#9C27B0' },
  finance: { name: 'Финансы', icon: '💰', color: '#2196F3' },
  growth: { name: 'Личностный рост', icon: '📚', color: '#00BCD4' },
  home: { name: 'Дом', icon: '🏠', color: '#795548' },
  other: { name: 'Другое', icon: '⭐', color: '#607D8B' }
};

/**
 * Статусы для Bucket List
 */
export const wishStatuses = {
  planned: { name: 'Запланировано', icon: '📋', color: '#607D8B' },
  in_progress: { name: 'В процессе', icon: '⏳', color: '#FF9800' },
  done: { name: 'Выполнено', icon: '✅', color: '#4CAF50' }
};

/**
 * Форматирование числа с окончанием (1 день, 2 дня, 5 дней)
 */
export function formatNumberWithSuffix(num, words) {
  const cases = [2, 0, 1, 1, 1, 2];
  const forms = words.split('|');
  return num + ' ' + forms[(num % 100 > 4 && num % 100 < 20) ? 2 : cases[(num % 10 < 5) ? num % 10 : 5]];
}

/**
 * Генерация UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Debounce функция
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep utility
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
