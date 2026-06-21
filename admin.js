/**
 * Секретные Записки - Админ-панель
 * Управление записками через Supabase
 */

import { supabase, signInWithEmail, signOut, onAuthStateChanged, ADMIN_EMAIL } from './supabase-config.js';

// ========== DOM Elements ==========
const loginModal = document.getElementById('login-modal');
const adminContent = document.getElementById('admin-content');
const logoutBtn = document.getElementById('logout-btn');
const adminEmail = document.getElementById('admin-email');
const adminPassword = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const noteTitle = document.getElementById('note-title');
const noteContent = document.getElementById('note-content');
const noteDate = document.getElementById('note-date');
const addNoteBtn = document.getElementById('add-note-btn');
const previewNoteBtn = document.getElementById('preview-note-btn');
const previewSection = document.getElementById('preview-section');
const previewCard = document.getElementById('preview-card');
const adminNotesContainer = document.getElementById('admin-notes-container');
const toastContainer = document.getElementById('toast-container');

// Обработчики переключателя направления
document.querySelectorAll('input[name="note-direction"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    currentNoteDirection = e.target.value;
    console.log('📭 Направление:', currentNoteDirection === 'admin_to_user' ? 'Вам → Получателю' : 'Получатель → Вам');
  });
});

// Edit modal elements
const editModal = document.getElementById('edit-modal');
const editPreviewModal = document.getElementById('edit-preview-modal');
const editNoteTitle = document.getElementById('edit-note-title');
const editNoteContent = document.getElementById('edit-note-content');
const editNoteDate = document.getElementById('edit-note-date');
const editPreviewBtn = document.getElementById('edit-preview-btn');
const editSaveBtn = document.getElementById('edit-save-btn');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const editPreviewContent = document.getElementById('edit-preview-content');
const editPreviewCloseBtn = document.getElementById('edit-preview-close-btn');

// Stats elements
const statsNotes = document.getElementById('stats-notes');
const statsMoods = document.getElementById('stats-moods');
const statsReviews = document.getElementById('stats-reviews');
const statsWishes = document.getElementById('stats-wishes');
const adminMoodsContainer = document.getElementById('admin-moods-container');
const adminReviewsContainer = document.getElementById('admin-reviews-container');
const adminWishesContainer = document.getElementById('admin-wishes-container');
const moodStatsContainer = document.getElementById('mood-stats-container');
const reviewStatsContainer = document.getElementById('review-stats-container');
const activityStatsContainer = document.getElementById('activity-stats-container');

// Admin review elements
const adminStarRating = document.getElementById('admin-star-rating');
const adminReviewText = document.getElementById('admin-review-text');
const adminSubmitReviewBtn = document.getElementById('admin-submit-review-btn');

// Admin wish elements
const adminWishTitle = document.getElementById('admin-wish-title');
const adminWishDescription = document.getElementById('admin-wish-description');
const adminWishImage = document.getElementById('admin-wish-image');
const adminWishPreview = document.getElementById('admin-wish-preview');
const adminAddWishBtn = document.getElementById('admin-add-wish-btn');
const adminWishDropZone = document.getElementById('admin-wish-drop-zone');
const adminDropZoneText = document.getElementById('admin-drop-zone-text');
const adminImagePreviewContainer = document.getElementById('admin-image-preview-container');
const adminRemoveImageBtn = document.getElementById('admin-remove-image-btn');

// Admin mood elements
const adminMoodSelector = document.getElementById('admin-mood-selector');
const adminMoodComment = document.getElementById('admin-mood-comment');
const adminSubmitMoodBtn = document.getElementById('admin-submit-mood-btn');

// Recipient theme element
const recipientThemeCard = document.getElementById('recipient-theme-card');

// ========== State ==========
let isAdmin = false;
let currentEditNoteId = null;

// Admin review state
let adminSelectedRating = 0;

// Admin wish state
let adminSelectedImageFile = null;

// Admin mood state
let adminSelectedMood = null;

// Theme state
let currentTheme = 'classic';

// Note direction
let currentNoteDirection = 'admin_to_user';

// Флаг для показа приветствия (только один раз за сессию)
let hasShownWelcome = false;

// ========== Cache & Debounce ==========
const adminCache = {
  notes: null,
  moods: null,
  stats: null
};

const cacheTimestamps = {
  notes: 0,
  moods: 0,
  stats: 0
};

const CACHE_DURATION = 30000; // 30 секунд

function isCacheValid(type) {
  return adminCache[type] && (Date.now() - cacheTimestamps[type]) < CACHE_DURATION;
}

function debounce(func, wait) {
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
  
// ========== Theme System ==========

function initThemeSystem() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeModalOverlay = document.getElementById('theme-modal-overlay');
  const themeModalClose = document.getElementById('theme-modal-close');
  const themeOptions = document.querySelectorAll('.theme-option');
  
  if (!themeToggleBtn || !themeModalOverlay) {
    console.warn('⚠️ Элементы темы не найдены');
    return;
  }
  
  let currentTheme = 'classic';
  
  async function loadUserTheme() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🎨 [ADMIN] Загрузка темы:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (session?.user) {
        const { data, error } = await supabase
          .from('themes')
          .select('theme_name, user_id')
          .eq('user_id', session.user.id)
          .single();
        
        console.log('🎨 [ADMIN] Данные темы из базы:', { data, error });
        
        if (data && !error) {
          currentTheme = data.theme_name;
          console.log('🎨 [ADMIN] Тема загружена из базы:', currentTheme, 'для user_id:', data.user_id);
        } else {
          console.log('⚠️ [ADMIN] Тема не найдена в базе, используем localStorage');
          const savedTheme = localStorage.getItem('userTheme');
          if (savedTheme) currentTheme = savedTheme;
        }
      } else {
        console.log('🎨 [ADMIN] Пользователь не авторизован, используем localStorage');
        const savedTheme = localStorage.getItem('userTheme');
        if (savedTheme) currentTheme = savedTheme;
      }
      applyTheme(currentTheme);
      updateThemeSelector();
    } catch (error) {
      console.error('❌ [ADMIN] Ошибка загрузки темы:', error);
    }
  }
    
  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('userTheme', themeName);
    currentTheme = themeName;
  }
  
  async function saveTheme(themeName) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🎨 [ADMIN] Сохранение темы:', {
        themeName,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (session?.user) {
        const { data: existing } = await supabase
          .from('themes')
          .select('id, user_id')
          .eq('user_id', session.user.id)
          .single();
        
        console.log('🎨 [ADMIN] Существующая тема:', existing);
        
        if (existing) {
          await supabase.from('themes')
            .update({ theme_name: themeName, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id);
          console.log('🎨 [ADMIN] Тема обновлена для user_id:', session.user.id);
        } else {
          await supabase.from('themes')
            .insert({ user_id: session.user.id, theme_name: themeName });
          console.log('🎨 [ADMIN] Тема создана для user_id:', session.user.id);
        }
      }
      localStorage.setItem('userTheme', themeName);
      console.log('✅ [ADMIN] Тема сохранена в localStorage:', themeName);
    } catch (error) {
      console.error('❌ [ADMIN] Ошибка сохранения темы:', error);
      localStorage.setItem('userTheme', themeName);
    }
  }
    
  function updateThemeSelector() {
    themeOptions.forEach(option => {
      option.classList.toggle('selected', option.dataset.theme === currentTheme);
    });
  }
    
  function openThemeModal() {
    themeModalOverlay.classList.add('active');
    updateThemeSelector();
  }
  
  function closeThemeModal() {
    themeModalOverlay.classList.remove('active');
  }
  
  themeToggleBtn.addEventListener('click', openThemeModal);
  themeModalClose.addEventListener('click', closeThemeModal);
  themeModalOverlay.addEventListener('click', (e) => {
    if (e.target === themeModalOverlay) closeThemeModal();
  });
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const themeName = option.dataset.theme;
      applyTheme(themeName);
      saveTheme(themeName);
      updateThemeSelector();
      closeThemeModal();
      
      // Уведомление при смене темы
      const themeNames = {
        classic: 'Классическая',
        nature: 'Природа',
        ocean: 'Океан',
        dark: 'Тёмная',
        sunset: 'Закат'
      };
      const themeDisplayName = themeNames[themeName] || themeName;
      showToast(`Тема "${themeDisplayName}" применена! 🎨`, 'success');
    });
  });
      
  loadUserTheme();
}

// ========== Utility Functions ==========

/**
 * Показать toast уведомление
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Форматирование даты
 */
function formatDate(dateString) {
  if (!dateString) return 'Дата не указана';
  try {
    const date = new Date(dateString);  
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Ошибка форматирования даты:', error, dateString);
    return 'Дата не указана';
  }
}
  
/**
 * Простой парсер markdown
 */
function parseMarkdown(text) {
  if (!text) return '';
  
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
  
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  }
  
  return html;
}

/**
 * Экранирование HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== Authentication ==========

/**
 * Проверка состояния авторизации
 */
onAuthStateChanged(async (user) => {
  console.log('🔍 Состояние авторизации:', user ? user.email : 'гость');
  
  if (user) {
    // Проверяем что это админ
    if (user.email !== ADMIN_EMAIL) {
      console.warn('⚠️ Доступ запрещён: не админ! Email:', user.email);
      showToast('⛔ Доступ запрещён! Эта панель только для админа.', 'error');
      
      // Блокируем интерфейс но не выкидываем
      adminContent.style.display = 'none';
      logoutBtn.style.display = 'none';
      loginModal.classList.remove('active');
      
      // Показываем сообщение с инструкцией
      setTimeout(() => {
        showToast('Войдите под аккаунтом администратора', 'warning');
      }, 2000);
      
      return;
    }
    
    // Это админ - показываем интерфейс
    isAdmin = true;
    loginModal.classList.remove('active');
    adminContent.style.display = 'block';
    logoutBtn.style.display = 'inline-flex';
    initAdminFeatures();
    
    // Показываем приветствие только один раз за сессию
    if (!hasShownWelcome) {
      hasShownWelcome = true;
      showToast(`Добро пожаловать, ${user.email}!`, 'success');
    }
  } else {
    isAdmin = false;
    loginModal.classList.add('active');
    adminContent.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
});

/**
 * Вход в систему
 */
// Перенесено в initEventListeners()

/**
 * Выход из системы
 */
// Перенесено в initEventListeners()

/**
 * Инициализация функций админки после авторизации
 */
function initAdminFeatures() {
  subscribeToAdminNotes();
  subscribeToMoods();
  subscribeToReviews();
  subscribeToWishes();
  subscribeToStats();
  
  // Установка текущей даты в поле даты
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  noteDate.value = now.toISOString().slice(0, 16);
}

// ========== Notes Management ==========

/**
 * Подписка на настроения
 */
// Перенесено в initEventListeners()

/**
 * Предпросмотр записки
 */
// Перенесено в showNotePreview()

/**
 * Подписка на настроения
 */
let moodsChannel = null;

function subscribeToMoods() {
  // Начальная загрузка
  loadMoods();
  loadMoodStats();
  
  // Очищаем старую подписку если есть
  if (moodsChannel) {
    supabase.removeChannel(moodsChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    adminCache.moods = null;
    loadMoods();
    loadMoodStats();
  }, 500);
  
  moodsChannel = supabase
    .channel('admin-moods')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'moods' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Подписка на отзывы
 */
let reviewsChannel = null;

function subscribeToReviews() {
  // Начальная загрузка
  loadAdminReviews();
  
  // Очищаем старую подписку если есть
  if (reviewsChannel) {
    supabase.removeChannel(reviewsChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    loadAdminReviews();
  }, 500);
  
  reviewsChannel = supabase
    .channel('admin-reviews')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'reviews' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Подписка на желания
 */
let wishesChannel = null;

function subscribeToWishes() {
  // Начальная загрузка
  loadAdminWishes();
  
  // Очищаем старую подписку если есть
  if (wishesChannel) {
    supabase.removeChannel(wishesChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    loadAdminWishes();
  }, 500);
  
  wishesChannel = supabase
    .channel('admin-wishes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'wishes' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Подписка на записки
 */
let notesChannel = null;

function subscribeToAdminNotes() {
  // Начальная загрузка
  loadAdminNotes();
  
  // Очищаем старую подписку если есть
  if (notesChannel) {
    supabase.removeChannel(notesChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    console.log('🔄 Realtime обновление записок...');
    adminCache.notes = null;
    loadAdminNotes();
  }, 500);
  
  notesChannel = supabase
    .channel('notes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'notes' },
      (payload) => {
        console.log('📨 Realtime событие:', payload);
        debouncedLoad();
      }
    )
    .subscribe();
}

/**
 * Загрузка записок
 */
async function loadAdminNotes() {
  // Проверка кэша
  if (isCacheValid('notes')) {
    renderAdminNotes(adminCache.notes);
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    // Обновление кэша
    adminCache.notes = data;
    cacheTimestamps.notes = Date.now();
    
    if (!data || data.length === 0) {
      adminNotesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>Пока нет записок</p>
        </div>
      `;
      return;
    }
    
    renderAdminNotes(data);
  } catch (error) {
    console.error('Ошибка загрузки записок:', error);
  }
}

/**
 * Отрисовка записок в админке
 */
function renderAdminNotes(notes) {
  console.log('📋 Отрисовка записок:', notes.length, 'штук');
  
  adminNotesContainer.innerHTML = notes.map((note, index) => {
    console.log('Записка', index, ':', {
      id: note.id,
      title: note.title,
      created_at: note.created_at,
      direction: note.direction
    });
    
    const dateStr = formatDate(note.created_at);
    console.log('  Дата:', dateStr);
    
    return `
    <div class="card admin-card fade-in" style="animation-delay: ${index * 0.05}s">
      <div class="card-header">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <span style="font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; background: ${note.direction === 'admin_to_user' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'linear-gradient(135deg, var(--success), #22c55e)'}; color: white;">
            ${note.direction === 'admin_to_user' ? '📤 Вам → Получателю' : '📥 Получатель → Вам'}
          </span>
          <span class="card-date" style="margin-left: auto;">${dateStr}</span>
        </div>
        <h3 class="card-title">${escapeHtml(note.title)}</h3>
      </div>
      <div class="card-content" style="max-height: 150px; overflow: hidden; position: relative;">
        ${parseMarkdown(note.content)}
        <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 50px; background: linear-gradient(transparent, var(--bg-card));"></div>
      </div>
      <div class="admin-card-actions">
        <button class="btn btn-secondary btn-edit" data-id="${note.id}">
          ✏️ Редактировать
        </button>
        <button class="btn btn-danger btn-delete" data-id="${note.id}">
          🗑️ Удалить
        </button>
      </div>
    </div>
  `;
  }).join('');
  
  // Добавляем обработчики кнопок
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editNote(btn.dataset.id));
  });
  
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteNote(btn.dataset.id));
  });
}

/**
 * Редактирование записки - открытие модального окна
 */
async function editNote(noteId) {
  try {
    // Получаем запись записки
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();
    
    if (error || !data) {
      showToast('Записка не найдена', 'error');
      return;
    }
    
    // Заполняем форму редактирования
    currentEditNoteId = noteId;
    editNoteTitle.value = data.title || '';
    editNoteContent.value = data.content || '';
    
    // Устанавливаем дату
    if (data.created_at) {
      const date = new Date(data.created_at);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
      editNoteDate.value = date.toISOString().slice(0, 16);
    }
    
    // Показываем модальное окно
    editModal.classList.add('active');
  } catch (error) {
    console.error('Ошибка загрузки записки:', error);
    showToast('Ошибка загрузки записки', 'error');
  }
}

/**
 * Сохранение отредактированной записки
 */
async function saveEditedNote() {
  const title = editNoteTitle.value.trim();
  const content = editNoteContent.value.trim();
  const dateValue = editNoteDate.value;
  
  if (!title) {
    showToast('Введите заголовок!', 'warning');
    return;
  }
  
  if (!content) {
    showToast('Введите текст записки!', 'warning');
    return;
  }
  
  // Блокировка кнопки
  editSaveBtn.disabled = true;
  editSaveBtn.textContent = 'Сохранение...';
  
  try {
    const noteData = {
      title: title,
      content: content
      // updated_at обновится триггером автоматически
    };
    
    // Если дата изменена, обновляем created_at
    if (dateValue) {
      noteData.created_at = dateValue;
    }
    
    const { error } = await supabase
      .from('notes')
      .update(noteData)
      .eq('id', currentEditNoteId);
    
    if (error) throw error;
    
    showToast('Записка обновлена! ✏️', 'success');
    
    // Сброс кэша
    adminCache.notes = null;
    loadAdminNotes();
    
    // Закрываем модальное окно
    closeEditModal();
  } catch (error) {
    console.error('Ошибка сохранения записки:', error);
    showToast('Ошибка сохранения записки', 'error');
  } finally {
    editSaveBtn.disabled = false;
    editSaveBtn.textContent = '💾 Сохранить';
  }
}

/**
 * Закрытие модального окна редактирования
 */
function closeEditModal() {
  editModal.classList.remove('active');
  editPreviewModal.classList.remove('active');
  currentEditNoteId = null;
  editNoteTitle.value = '';
  editNoteContent.value = '';
  editNoteDate.value = '';
}

/**
 * Предпросмотр при редактировании
 */
function showEditPreview() {
  const title = editNoteTitle.value.trim() || 'Без названия';
  const content = editNoteContent.value.trim() || 'Пусто...';
  const dateValue = editNoteDate.value;
  
  const date = dateValue 
    ? new Date(dateValue).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Сейчас';
  
  editPreviewContent.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(title)}</h3>
        <span class="card-date">${date}</span>
      </div>
      <div class="card-content">${parseMarkdown(content)}</div>
    </div>
  `;
  
  editPreviewModal.classList.add('active');
}

/**
 * Удаление записки
 */
async function deleteNote(noteId) {
  if (!confirm('Вы уверены, что хотите удалить эту записку?')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);
    
    if (error) throw error;
    
    showToast('Записка удалена! 🗑️', 'success');
  } catch (error) {
    console.error('Ошибка удаления записки:', error);
    showToast('Ошибка удаления записки', 'error');
  }
}

// ========== Stats ==========

/**
 * Подписка на статистику
 */
const statsChannels = [];

async function subscribeToStats() {
  // Загрузка статистики
  await loadStats();
  loadMoodStats();
  loadReviewStats();
  loadActivityStats();
  
  // Очищаем старые подписки
  statsChannels.forEach(ch => supabase.removeChannel(ch));
  statsChannels.length = 0;
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    cacheTimestamps.stats = 0;
    loadStats();
    loadMoodStats();
    loadReviewStats();
    loadActivityStats();
  }, 1000);
  
  const tables = ['notes', 'moods', 'reviews', 'wishes'];
  
  tables.forEach(table => {
    const channel = supabase
      .channel(`${table}_stats`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: table },
        debouncedLoad
      )
      .subscribe();
    
    statsChannels.push(channel);
  });
}
  
/**
 * Загрузка статистики
 */
async function loadStats() {
  // Проверка кэша
  if (isCacheValid('stats')) {
    return;
  }
  
  try {
    // Параллельные запросы вместо последовательных
    const [notesResult, moodsResult, reviewsResult, wishesResult] = await Promise.all([
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase.from('moods').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }),
      supabase.from('wishes').select('*', { count: 'exact', head: true })
    ]);
    
    statsNotes.textContent = notesResult.count || 0;
    statsMoods.textContent = moodsResult.count || 0;
    statsReviews.textContent = reviewsResult.count || 0;
    statsWishes.textContent = wishesResult.count || 0;
    
    // Обновление кэша
    cacheTimestamps.stats = Date.now();
  } catch (error) {
    console.error('Ошибка загрузки статистики:', error);
  }
}

/**
 * Загрузка отзывов (админ)
 */
async function loadAdminReviews() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      adminReviewsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💭</div>
          <p>Пока нет отзывов</p>
        </div>
      `;
      return;
    }
    
    renderAdminReviews(data);
  } catch (error) {
    console.error('Ошибка загрузки отзывов:', error);
  }
}

/**
 * Отрисовка отзывов (админ)
 */
function renderAdminReviews(reviews) {
  adminReviewsContainer.innerHTML = `
    <div class="card">
      <h3 style="margin-bottom: 15px; color: var(--accent-secondary);">Все отзывы о дне</h3>
      <div class="reviews-list" style="max-height: none;">
        ${reviews.map(review => `
          <div class="review-item">
            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
            <div class="review-text" style="white-space: pre-wrap; color: var(--text-primary);">${escapeHtml(review.text)}</div>
            <div class="review-date">${formatDate(review.created_at)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Загрузка желаний (админ)
 */
async function loadAdminWishes() {
  try {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      adminWishesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <p>Пока нет желаний</p>
        </div>
      `;
      return;
    }
    
    renderAdminWishes(data);
  } catch (error) {
    console.error('Ошибка загрузки желаний:', error);
  }
}

/**
 * Отрисовка желаний (админ)
 */
function renderAdminWishes(wishes) {
  adminWishesContainer.innerHTML = `
    <div class="card">
      <h3 style="margin-bottom: 15px; color: var(--accent-secondary);">Желания получателя</h3>
      <div class="wishes-table-container">
        <table class="wishes-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Описание</th>
              <th>Картинка</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            ${wishes.map(wish => `
              <tr>
                <td style="font-weight: 600; color: var(--text-primary);">${escapeHtml(wish.title)}</td>
                <td style="max-width: 300px; color: var(--text-secondary);">${escapeHtml(wish.description || '—')}</td>
                <td>
                  ${wish.image_url 
                    ? `<img src="${wish.image_url}" alt="${escapeHtml(wish.title)}" style="max-width: 100px; max-height: 80px; border-radius: var(--radius-sm); object-fit: cover;">`
                    : '<span style="color: var(--text-muted);">Нет</span>'
                  }
                </td>
                <td style="color: var(--text-muted); font-size: 0.9rem;">${formatDate(wish.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Загрузка настроений
 */
async function loadMoods() {
  // Проверка кэша
  if (isCacheValid('moods')) {
    renderMoods(adminCache.moods);
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('moods')
      .select('id, mood_emoji, mood_text, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    // Обновление кэша
    adminCache.moods = data;
    cacheTimestamps.moods = Date.now();
    
    if (!data || data.length === 0) {
      adminMoodsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">😐</div>
          <p>Пока нет записей о настроении</p>
        </div>
      `;
      return;
    }
    
    renderMoods(data);
  } catch (error) {
    console.error('Ошибка загрузки настроений:', error);
  }
}

/**
 * Отрисовка настроений
 */
function renderMoods(moods) {
  // Получаем сегодняшние настроения
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayMoods = moods.filter(m => {
    const moodDate = new Date(m.created_at);
    return moodDate >= today;
  });
  
  // Если есть сегодняшние настроения, показываем сводку
  let todaySummary = '';
  if (todayMoods.length > 0) {
    const moodCounts = {};
    todayMoods.forEach(m => {
      moodCounts[m.mood_emoji] = (moodCounts[m.mood_emoji] || 0) + 1;
    });
    
    const summaryItems = Object.entries(moodCounts)
      .map(([emoji, count]) => `${emoji} ×${count}`)
      .join('  •  ');
    
    todaySummary = `
      <div class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, var(--bg-card), rgba(106, 17, 203, 0.1));">
        <h3 style="color: var(--accent-primary); margin-bottom: 10px;">📅 Настроения сегодня</h3>
        <p style="font-size: 1.5rem; color: var(--text-secondary);">${summaryItems}</p>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 8px;">
          Всего записей: ${todayMoods.length}
        </p>
      </div>
    `;
  }
  
  adminMoodsContainer.innerHTML = `
    ${todaySummary}
    <div class="card">
      <h3 style="margin-bottom: 15px; color: var(--accent-secondary);">История настроений</h3>
      <div class="moods-list">
        ${moods.map(mood => `
          <div class="mood-item">
            <div class="mood-emoji">${mood.mood_emoji}</div>
            <div class="mood-info">
              <div class="mood-text">${mood.mood_text}</div>
              ${mood.comment ? `<div class="mood-comment">${escapeHtml(mood.comment)}</div>` : ''}
              <div class="mood-date">${formatDate(mood.created_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Загрузка статистики настроений
 */
async function loadMoodStats() {
  try {
    const { data, error } = await supabase
      .from('moods')
      .select('mood_emoji, mood_text');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      moodStatsContainer.innerHTML = '<p class="empty-state">Пока нет данных о настроениях</p>';
      return;
    }
    
    // Подсчёт по типам
    const moodCounts = {};
    data.forEach(m => {
      const key = m.mood_emoji || '😐';
      if (!moodCounts[key]) {
        moodCounts[key] = { emoji: key, text: m.mood_text || 'Неизвестно', count: 0 };
      }
      moodCounts[key].count++;
    });
    
    const total = data.length;
    const sorted = Object.values(moodCounts).sort((a, b) => b.count - a.count);
    
    moodStatsContainer.innerHTML = `
      <div class="mood-stats">
        ${sorted.map(m => {
          const percent = Math.round((m.count / total) * 100);
          return `
            <div class="mood-stat-item">
              <div class="mood-stat-header">
                <span class="mood-stat-emoji">${m.emoji}</span>
                <span class="mood-stat-text">${m.text}</span>
                <span class="mood-stat-count">${m.count} (${percent}%)</span>
              </div>
              <div class="mood-stat-bar">
                <div class="mood-stat-fill" style="width: ${percent}%"></div>
              </div>
            </div>
          `;
        }).join('')}
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); text-align: center;">
          <span style="color: var(--text-muted);">Всего записей: </span>
          <span style="font-size: 1.5rem; font-weight: 700; color: var(--success);">${total}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Ошибка загрузки статистики настроений:', error);
  }
}

/**
 * Загрузка статистики отзывов
 */
async function loadReviewStats() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      reviewStatsContainer.innerHTML = '<p class="empty-state">Пока нет отзывов</p>';
      return;
    }
    
    const total = data.length;
    const sum = data.reduce((acc, r) => acc + r.rating, 0);
    const average = (sum / total).toFixed(1);
    
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach(r => {
      ratingCounts[r.rating]++;
    });
    
    const maxCount = Math.max(...Object.values(ratingCounts));
    
    reviewStatsContainer.innerHTML = `
      <div class="review-stats">
        <div style="text-align: center; margin-bottom: 25px;">
          <div style="font-size: 3rem; font-weight: 700; color: var(--warning);">${average}</div>
          <div style="color: var(--text-muted);">средний рейтинг из 5</div>
          <div style="font-size: 1.5rem; margin-top: 5px;">${'★'.repeat(Math.round(average))}${'☆'.repeat(5 - Math.round(average))}</div>
        </div>
        <div class="rating-bars">
          ${[5, 4, 3, 2, 1].map(rating => {
            const count = ratingCounts[rating];
            const percent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return `
              <div class="rating-bar-row">
                <span class="rating-star">${rating} ★</span>
                <div class="rating-bar">
                  <div class="rating-bar-fill" style="width: ${percent}%"></div>
                </div>
                <span class="rating-count">${count}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); text-align: center;">
          <span style="color: var(--text-muted);">Всего отзывов: </span>
          <span style="font-size: 1.5rem; font-weight: 700; color: var(--warning);">${total}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Ошибка загрузки статистики отзывов:', error);
  }
}

/**
 * Загрузка статистики активности
 */
async function loadActivityStats() {
  try {
    // Параллельные запросы
    const [notesRes, moodsRes, reviewsRes, wishesRes] = await Promise.all([
      supabase.from('notes').select('created_at'),
      supabase.from('moods').select('created_at'),
      supabase.from('reviews').select('created_at'),
      supabase.from('wishes').select('created_at')
    ]);
    
    const allDates = [
      ...(notesRes.data || []),
      ...(moodsRes.data || []),
      ...(reviewsRes.data || []),
      ...(wishesRes.data || [])
    ].map(d => new Date(d.created_at));
    
    if (allDates.length === 0) {
      activityStatsContainer.innerHTML = '<p class="empty-state">Пока нет активности</p>';
      return;
    }
    
    const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    const months = {};
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      months[key] = {
        label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        count: 0
      };
    }
    
    allDates.forEach(date => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (months[key]) {
        months[key].count++;
      }
    });
    
    const maxCount = Math.max(...Object.values(months).map(m => m.count));
    
    activityStatsContainer.innerHTML = `
      <div class="activity-stats">
        <div style="display: flex; align-items: flex-end; gap: 10px; height: 200px; padding: 20px 0;">
          ${Object.values(months).map(month => {
            const height = maxCount > 0 ? (month.count / maxCount) * 100 : 0;
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${month.count}</div>
                <div style="flex: 1; width: 100%; display: flex; align-items: flex-end;">
                  <div 
                    class="activity-bar" 
                    style="width: 100%; height: ${height}%; background: linear-gradient(180deg, var(--accent-primary), var(--accent-secondary)); border-radius: 4px 4px 0 0; transition: height 0.3s ease;"
                  ></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); transform: rotate(-45deg); transform-origin: center;">${month.label}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); text-align: center;">
          <span style="color: var(--text-muted);">Всего событий: </span>
          <span style="font-size: 1.5rem; font-weight: 700; color: var(--accent-primary);">${allDates.length}</span>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Ошибка загрузки статистики активности:', error);
  }
}

// ========== Enter key for login ==========

adminPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginBtn.click();
  }
});

// ========== Edit Modal Event Listeners ==========
// Перенесено в initEventListeners()

// Закрытие модальных окон по клику на overlay
// Перенесено в initEventListeners()

console.log('🔐 Админ-панель запущена');

// ========== Admin Actions (Отправка от админа) ==========

/**
 * Инициализация звёздного рейтинга (админ)
 */
function initAdminStarRating() {
  if (!adminStarRating) {
    console.warn('⚠️ adminStarRating не найден');
    return;
  }
  
  const stars = adminStarRating.querySelectorAll('span');
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      adminSelectedRating = rating;
      
      stars.forEach((s, index) => {
        if (index < rating) {
          s.classList.add('active');
          s.textContent = '★';
        } else {
          s.classList.remove('active');
          s.textContent = '☆';
        }
      });
    });
    
    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.rating);
      stars.forEach((s, index) => {
        s.textContent = index < rating ? '★' : '☆';
      });
    });
    
    star.addEventListener('mouseleave', () => {
      stars.forEach((s, index) => {
        s.textContent = index < adminSelectedRating ? '★' : '☆';
      });
    });
  });
}

/**
 * Отправка отзыва от админа
 */
// Перенесено в sendAdminReview()

/**
 * Добавление желания от админа
 */
// Перенесено в sendAdminWish()

/**
 * Отправка настроения от админа
 */
// Перенесено в sendAdminMood()
    
/**
 * Инициализация drag-and-drop для желаний (админ)
 */
function initAdminImagePreview() {
  if (!adminWishImage || !adminWishDropZone || !adminRemoveImageBtn) {
    console.warn('⚠️ Элементы для drag-and-drop не найдены');
    return;
  }
  
  adminWishImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      adminSelectedImageFile = file;
      showAdminPreview(file);
    } else {
      adminSelectedImageFile = null;
      clearAdminPreview();
    }
  });
  
  adminRemoveImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeAdminImage();
  });
  
  adminWishDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    adminWishDropZone.classList.add('drag-over');
    adminDropZoneText.textContent = '📥 Отпустите файл';
  });
  
  adminWishDropZone.addEventListener('dragleave', () => {
    adminWishDropZone.classList.remove('drag-over');
    adminDropZoneText.textContent = 'или перетащите изображение сюда';
  });
  
  adminWishDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    adminWishDropZone.classList.remove('drag-over');
    adminDropZoneText.textContent = 'или перетащите изображение сюда';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        showToast('Только изображения!', 'warning');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Макс 5MB!', 'warning');
        return;
      }
      adminSelectedImageFile = file;
      showAdminPreview(file);
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      adminWishImage.files = dataTransfer.files;
    }
  });
}

function showAdminPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    adminWishPreview.src = e.target.result;
    adminImagePreviewContainer.style.display = 'inline-block';
    adminDropZoneText.textContent = '✅ ' + file.name;
    adminDropZoneText.style.color = 'var(--success)';
    adminWishDropZone.classList.add('has-file');
    adminRemoveImageBtn.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}
  
function removeAdminImage() {
  adminSelectedImageFile = null;
  adminWishImage.value = '';
  clearAdminPreview();
  showToast('Изображение удалено', 'success');
}

function clearAdminPreview() {
  adminImagePreviewContainer.style.display = 'none';
  adminWishPreview.src = '';
  adminDropZoneText.textContent = 'или перетащите изображение сюда';
  adminDropZoneText.style.color = 'var(--text-muted)';
  adminWishDropZone.classList.remove('has-file');
  adminRemoveImageBtn.style.display = 'none';
}

/**
 * Добавление желания от админа
 */
// Перенесено в sendAdminWish()

/**
 * Инициализация селектора настроения (админ)
 */
function initAdminMoodSelector() {
  if (!adminMoodSelector) {
    console.warn('⚠️ adminMoodSelector не найден');
    return;
  }
  
  const moodBtns = adminMoodSelector.querySelectorAll('.mood-btn');
  
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      adminMoodSelector.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      adminSelectedMood = btn.dataset.mood;
    });
  });
}

/**
 * Отправка настроения от админа
 */
// Перенесено в sendAdminMood()

/**
 * Получить emoji настроения
 */
function getMoodEmoji(mood) {
  const emojis = {
    excellent: '🤩',
    good: '😊',
    neutral: '😐',
    sad: '😢',
    angry: '😤'
  };
  return emojis[mood] || '😐';
}

/**
 * Получить текст настроения
 */
function getMoodText(mood) {
  const texts = {
    excellent: 'Отличное!',
    good: 'Хорошее',
    neutral: 'Нормальное',
    sad: 'Грустное',
    angry: 'Злюсь'
  };
  return texts[mood] || 'Неизвестно';
}

/**
 * Загрузка темы получателя
 */
async function loadRecipientTheme() {
  try {
    console.log('🎨 Загрузка темы получателя...');
    
    const { data: sessions, error } = await supabase
      .from('themes')
      .select('theme_name, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ Ошибка загрузки темы:', error);
      throw error;
    }
    
    console.log('📥 Тема получателя:', sessions);
    
    if (sessions && sessions.length > 0) {
      const theme = sessions[0];
      const themeNames = {
        classic: { name: 'Классическая', emoji: '💜', color: 'linear-gradient(135deg, #6b11cb, #a855f7)' },
        nature: { name: 'Природа', emoji: '🌿', color: 'linear-gradient(135deg, #16a34a, #22c55e)' },
        ocean: { name: 'Океан', emoji: '🌊', color: 'linear-gradient(135deg, #0284c7, #0ea5e9)' },
        dark: { name: 'Тёмная', emoji: '🌙', color: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)' },
        sunset: { name: 'Закат', emoji: '🌅', color: 'linear-gradient(135deg, #ea580c, #f97316)' }
      };
      
      const themeInfo = themeNames[theme.theme_name] || themeNames.classic;
      const lastUpdate = new Date(theme.updated_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      recipientThemeCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
          <div style="width: 80px; height: 80px; border-radius: var(--radius-md); background: ${themeInfo.color}; box-shadow: var(--shadow);"></div>
          <div style="flex: 1; min-width: 200px;">
            <div style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 5px;">
              ${themeInfo.emoji} ${themeInfo.name}
            </div>
            <div style="color: var(--text-muted); font-size: 0.9rem;">
              Обновлено: ${lastUpdate}
            </div>
          </div>
        </div>
      `;
      
      console.log('✅ Тема получателя загружена:', themeInfo.name);
    } else {
      recipientThemeCard.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎨</div>
          <p>Получатель ещё не выбрал тему</p>
        </div>
      `;
      console.log('⚠️ Тема получателя не найдена');
    }
  } catch (error) {
    console.error('Ошибка загрузки темы получателя:', error);
    recipientThemeCard.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>Ошибка загрузки темы</p>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 10px;">
          ${error.message || 'Неизвестная ошибка'}
        </p>
      </div>
    `;
  }
}
  
// Загрузка темы получателя при инициализации
// Перенесено в init()

// ========== Initialization ==========

function init() {
  console.log('🔐 Админ-панель запущена');
  
  // Инициализация админских функций (с проверками)
  if (typeof initAdminStarRating === 'function') {
    initAdminStarRating();
  }
  if (typeof initAdminImagePreview === 'function') {
    initAdminImagePreview();
  }
  if (typeof initAdminMoodSelector === 'function') {
    initAdminMoodSelector();
  }
  
  // Запуск системы тем
  if (typeof initThemeSystem === 'function') {
    initThemeSystem();
  }
  
  // Загрузка темы получателя
  if (typeof loadRecipientTheme === 'function') {
    loadRecipientTheme();
  }
}

// Обёрнем все event listeners в функцию
function initEventListeners() {
  console.log('🔧 initEventListeners вызвана');
  
  // Обработчики переключателя направления
  document.querySelectorAll('input[name="note-direction"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentNoteDirection = e.target.value;
      console.log('📭 Направление:', currentNoteDirection === 'admin_to_user' ? 'Вам → Получателю' : 'Получатель → Вам');
    });
  });
  
  // Login button
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  
  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Add note button
  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', handleAddNote);
  }
  
  // Preview note button
  if (previewNoteBtn) {
    previewNoteBtn.addEventListener('click', showNotePreview);
  }
  
  // Edit save button
  if (editSaveBtn) editSaveBtn.addEventListener('click', saveEditedNote);
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
  if (editPreviewBtn) editPreviewBtn.addEventListener('click', showEditPreview);
  if (editPreviewCloseBtn) editPreviewCloseBtn.addEventListener('click', () => editPreviewModal.classList.remove('active'));
  
  // Admin review button
  if (adminSubmitReviewBtn) adminSubmitReviewBtn.addEventListener('click', sendAdminReview);
  
  // Admin wish button
  if (adminAddWishBtn) adminAddWishBtn.addEventListener('click', sendAdminWish);
  
  // Admin mood button
  if (adminSubmitMoodBtn) adminSubmitMoodBtn.addEventListener('click', sendAdminMood);
  
  // Enter key for login
  if (adminPassword) {
    adminPassword.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && loginBtn) loginBtn.click();
    });
  }
  
  console.log('✅ initEventListeners завершена');
}

function showNotePreview() {
  const title = noteTitle.value.trim() || 'Без названия';
  const content = noteContent.value.trim() || 'Пусто...';
  const dateValue = noteDate.value;
  
  const date = dateValue 
    ? new Date(dateValue).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Сейчас';
  
  previewCard.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${escapeHtml(title)}</h3>
      <span class="card-date">${date}</span>
    </div>
    <div class="card-content">${parseMarkdown(content)}</div>
  `;
  
  previewSection.style.display = 'block';
  previewSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Обработчик входа
 */
async function handleLogin() {
  const email = adminEmail.value.trim();
  const password = adminPassword.value.trim();
  
  if (!email || !password) {
    showToast('Введите email и пароль', 'warning');
    return;
  }
  
  // Проверка что email совпадает с админским
  if (email !== ADMIN_EMAIL) {
    showToast('⛔ Доступ запрещён! Используйте email администратора.', 'error');
    console.warn('⚠️ Попытка входа с неправильным email:', email);
    return;
  }
  
  loginBtn.disabled = true;
  loginBtn.textContent = 'Вход...';
  
  try {
    console.log('🔐 Попытка входа:', email);
    const result = await signInWithEmail(email, password);
    console.log('✅ Успешный вход:', result.user);
    showToast(`Добро пожаловать, ${result.user?.email}!`, 'success');
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    let message = error.message || 'Ошибка входа';
    
    if (message.includes('Invalid login') || message.includes('credentials')) {
      message = 'Неверный email или пароль';
    } else if (message.includes('Email not confirmed')) {
      message = 'Подтвердите email (проверьте почту)';
    }
    
    showToast(message, 'error');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Войти';
  }
}

/**
 * Обработчик выхода
 */
async function handleLogout() {
  try {
    await signOut();
    showToast('Вы вышли из системы', 'success');
  } catch (error) {
    console.error('Ошибка выхода:', error);
    showToast('Ошибка выхода', 'error');
  }
}
  
/**
 * Обработчик добавления записки
 */
async function handleAddNote() {
  const title = noteTitle.value.trim();
  const content = noteContent.value.trim();
  
  if (!title) {
    showToast('Введите заголовок!', 'warning');
    return;
  }
  
  if (!content) {
    showToast('Введите текст записки!', 'warning');
    return;
  }
  
  addNoteBtn.disabled = true;
  addNoteBtn.textContent = 'Публикация...';
  
  try {
    const noteData = {
      title: title,
      content: content,
      direction: currentNoteDirection
    };
    
    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select('id, title, content, direction, created_at')
      .single();
    
    if (error) throw error;
    
    console.log('✅ Записка создана:', data);
    showToast('Записка опубликована! 💌', 'success');
    
    noteTitle.value = '';
    noteContent.value = '';
    previewSection.style.display = 'none';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    noteDate.value = now.toISOString().slice(0, 16);
    
    adminCache.notes = null;
    loadAdminNotes();
  } catch (error) {
    console.error('Ошибка добавления записки:', error);
    showToast('Ошибка публикации записки', 'error');
  } finally {
    addNoteBtn.disabled = false;
    addNoteBtn.textContent = '➕ Опубликовать записку';
  }
}

/**
 * Отправка отзыва от админа
 */
function sendAdminReview() {
  if (adminSelectedRating === 0) {
    showToast('Поставьте оценку!', 'warning');
    return;
  }
  
  const text = adminReviewText.value.trim();
  
  if (!text) {
    showToast('Напишите текст отзыва!', 'warning');
    return;
  }
  
  adminSubmitReviewBtn.disabled = true;
  adminSubmitReviewBtn.textContent = 'Отправка...';
  
  supabase.from('reviews').insert({
    rating: adminSelectedRating,
    text: text,
    direction: 'admin_to_user'
  }).then(({ data, error }) => {
    if (error) {
      console.error('Ошибка отправки отзыва:', error);
      showToast('Ошибка отправки отзыва', 'error');
      return;
    }
    
    showToast('Отзыв отправлен! 💌', 'success');
    adminReviewText.value = '';
    adminSelectedRating = 0;
    adminStarRating.querySelectorAll('span').forEach(s => {
      s.classList.remove('active');
      s.textContent = '☆';
    });
  }).finally(() => {
    adminSubmitReviewBtn.disabled = false;
    adminSubmitReviewBtn.textContent = '📤 Отправить отзыв';
  });
}

/**
 * Добавление желания от админа
 */
function sendAdminWish() {
  const title = adminWishTitle.value.trim();
  const description = adminWishDescription.value.trim();
  
  if (!title) {
    showToast('Введите название желания!', 'warning');
    return;
  }
  
  adminAddWishBtn.disabled = true;
  adminAddWishBtn.textContent = 'Добавление...';
  
  let imageUrl = null;
  
  const uploadImage = async () => {
    if (adminSelectedImageFile) {
      try {
        const fileName = `${Date.now()}_${adminSelectedImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('wishes')
          .upload(fileName, adminSelectedImageFile, { cacheControl: '3600' });
        
        if (uploadError) {
          console.error('Ошибка загрузки изображения:', uploadError);
          showToast('Без изображения', 'warning');
          return;
        }
        
        const { data: urlData } = supabase.storage.from('wishes').getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      } catch (err) {
        console.error('Ошибка загрузки изображения:', err);
        showToast('Без изображения', 'warning');
      }
    }
  };
  
  uploadImage().then(() => {
    return supabase.from('wishes').insert({
      title: title,
      description: description,
      image_url: imageUrl,
      direction: 'admin_to_user'
    });
  }).then(({ data, error }) => {
    if (error) {
      console.error('Ошибка добавления желания:', error);
      showToast('Ошибка добавления', 'error');
      return;
    }
    
    showToast('Желание добавлено! ✨', 'success');
    adminWishTitle.value = '';
    adminWishDescription.value = '';
    adminWishImage.value = '';
    clearAdminPreview();
    adminSelectedImageFile = null;
  }).finally(() => {
    adminAddWishBtn.disabled = false;
    adminAddWishBtn.textContent = '➕ Добавить желание';
  });
}

/**
 * Отправка настроения от админа
 */
function sendAdminMood() {
  if (!adminSelectedMood) {
    showToast('Выберите настроение!', 'warning');
    return;
  }
  
  const comment = adminMoodComment.value.trim();
  
  adminSubmitMoodBtn.disabled = true;
  adminSubmitMoodBtn.textContent = 'Отправка...';
  
  supabase.from('moods').insert({
    mood: adminSelectedMood,
    mood_emoji: getMoodEmoji(adminSelectedMood),
    mood_text: getMoodText(adminSelectedMood),
    comment: comment,
    direction: 'admin_to_user'
  }).then(({ data, error }) => {
    if (error) {
      console.error('Ошибка отправки настроения:', error);
      showToast('Ошибка отправки', 'error');
      return;
    }
    
    showToast('Настроение отправлено! 💕', 'success');
    adminMoodComment.value = '';
    adminSelectedMood = null;
    adminMoodSelector.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
  }).finally(() => {
    adminSubmitMoodBtn.disabled = false;
    adminSubmitMoodBtn.textContent = '💕 Отправить настроение';
  });
}

// Запуск после загрузки DOM
function initializeAdmin() {
  if (window.adminInitialized) {
    console.log('⚠️ Admin already initialized');
    return;
  }
  window.adminInitialized = true;
  
  console.log('🔧 Initializing admin...');
  initEventListeners();
  init();
  // Инициализация редактора тем уже в theme-creator.js (авто-инициализация)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
  initializeAdmin();
}

