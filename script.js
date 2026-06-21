/**
 * Секретные Записки - Основная логика (для получателя)
 * Работает с Supabase
 */

import { supabase, signInWithEmail, signOut, onAuthStateChanged, ADMIN_EMAIL } from './supabase-config.js';
const notesContainer = document.getElementById('notes-container');
const moodSelector = document.getElementById('mood-selector');
const moodComment = document.getElementById('mood-comment');
const submitMoodBtn = document.getElementById('submit-mood-btn');
const moodHistory = document.getElementById('mood-history');
const starRating = document.getElementById('star-rating');
const reviewText = document.getElementById('review-text');
const submitReviewBtn = document.getElementById('submit-review-btn');
const reviewsList = document.getElementById('reviews-list');
const wishTitle = document.getElementById('wish-title');
const wishDescription = document.getElementById('wish-description');
const wishImage = document.getElementById('wish-image');
const wishPreview = document.getElementById('wish-preview');
const addWishBtn = document.getElementById('add-wish-btn');
const wishesTableBody = document.getElementById('wishes-table-body');
const toastContainer = document.getElementById('toast-container');
const adminBackBtn = document.getElementById('admin-back-btn');

// ========== Auth Elements ==========
const loginModal = document.getElementById('login-modal');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');

// ========== State ==========
let isUserLoggedIn = false;
let latestNoteId = null;
const cache = {
  notes: null,
  moods: null,
  reviews: null,
  wishes: null
};

const cacheTimestamps = {};
const CACHE_DURATION = 30000; // 30 секунд

// Pagination state
const pagination = {
  moods: { page: 1, perPage: 10, total: 0 },
  reviews: { page: 1, perPage: 10, total: 0 },
  wishes: { page: 1, perPage: 10, total: 0 }
};

// Theme state
let currentTheme = 'classic';

// Каналы для очистки
let notesChannel = null;
let moodsChannel = null;
let reviewsChannel = null;
let wishesChannel = null;

/**
 * Проверка актуальности кэша
 */
function isCacheValid(type) {
  return cache[type] && (Date.now() - cacheTimestamps[type]) < CACHE_DURATION;
}

/**
 * Debounce для предотвращения частых запросов
 */
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
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Простой парсер markdown (базовая поддержка)
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
 * Вход в систему
 */
async function handleLogin() {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();
  
  if (!email || !password) {
    showToast('Введите email и пароль!', 'warning');
    return;
  }
  
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = 'Вход...';
  
  try {
    const result = await signInWithEmail(email, password);
    
    console.log('🔐 Результат входа:', result);
    
    // Supabase возвращает { user, session } или только { session }
    const user = result.user || result.session?.user;
    
    if (user) {
      showToast(`Добро пожаловать, ${user.email}!`, 'success');
      loginModal.classList.remove('active');
    } else {
      showToast('Вход выполнен', 'success');
      loginModal.classList.remove('active');
    }
  } catch (error) {
    console.error('Ошибка входа:', error);
    showToast('Ошибка входа: ' + error.message, 'error');
  } finally {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = 'Войти';
  }
}

/**
 * Выход из системы
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
 * Обновление UI в зависимости от авторизации
 */
function updateAuthUI(user) {
  if (user) {
    // Пользователь авторизован
    isUserLoggedIn = true;
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-flex';
    console.log('✅ Пользователь авторизован:', user.email);
  } else {
    // Пользователь не авторизован
    isUserLoggedIn = false;
    loginBtn.style.display = 'inline-flex';
    logoutBtn.style.display = 'none';
    console.log('⚠️ Пользователь не авторизован');
  }
}

/**
 * Проверка состояния авторизации
 */
onAuthStateChanged(async (user) => {
  console.log('🔍 Состояние авторизации:', user ? user.email : 'гость');
  updateAuthUI(user);
  checkAdminAuth(); // Проверяем нужно ли показать кнопку "Админка"
});

// ========== Notes Loading ==========

/**
 * Эмодзи для настроения
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
 * Текст для настроения
 */
function getMoodText(mood) {
  const texts = {
    excellent: 'Отлично',
    good: 'Хорошо',
    neutral: 'Нормально',
    sad: 'Грустно',
    angry: 'Злюсь'
  };
  return texts[mood] || 'Неизвестно';
}

// ========== Notes (Записки) ==========

/**
 * Подписка на записки в реальном времени
 */
function subscribeToNotes() {
  // Начальная загрузка
  loadNotes();
  
  // Очищаем старую подписку если есть
  if (notesChannel) {
    supabase.removeChannel(notesChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    cache.notes = null;
    loadNotes();
  }, 500);
  
  notesChannel = supabase
    .channel('notes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'notes' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Загрузка записок
 */
async function loadNotes() {
  // Проверка кэша
  if (isCacheValid('notes')) {
    renderNotes(cache.notes);
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
    cache.notes = data;
    cacheTimestamps.notes = Date.now();
    
    if (!data || data.length === 0) {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p>Пока нет записок</p>
          <p style="font-size: 0.9rem; margin-top: 10px;">Загляни позже!</p>
        </div>
      `;
      return;
    }
    
    // Сохраняем ID последней записки для отзывов
    latestNoteId = data[0].id;
    
    renderNotes(data);
  } catch (error) {
    console.error('Ошибка при загрузке записок:', error);
    notesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>Ошибка загрузки записок</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">Проверьте подключение к интернету</p>
      </div>
    `;
  }
}

/**
 * Отрисовка записок
 */
function renderNotes(notes) {
  notesContainer.innerHTML = notes.map((note, index) => `
    <div class="card fade-in" style="animation-delay: ${index * 0.1}s">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(note.title || 'Без названия')}</h3>
        <span class="card-date">${formatDate(note.created_at)}</span>
      </div>
      <div class="card-content">${parseMarkdown(note.content || '')}</div>
    </div>
  `).join('');
}

// ========== Mood (Настроение) ==========

/**
 * Инициализация селектора настроения
 */
function initMoodSelector() {
  const moodBtns = moodSelector.querySelectorAll('.mood-btn');
  
  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Сброс предыдущего выбора
      moodBtns.forEach(b => b.classList.remove('selected'));
      // Выбор текущего
      btn.classList.add('selected');
      selectedMood = btn.dataset.mood;
    });
  });
}
    
/**
 * Отправка настроения
 */
async function submitMood() {
  console.log('🎭 Отправка настроения...');
  console.log('Выбранное настроение:', selectedMood);
  
  if (!selectedMood) {
    console.warn('Настроение не выбрано');
    showToast('Выберите настроение!', 'warning');
    return;
  }
  
  const comment = moodComment.value.trim();
  console.log('Комментарий:', comment);
  
  // Блокировка кнопки на время отправки
  submitMoodBtn.disabled = true;
  submitMoodBtn.textContent = 'Отправка...';
  
  try {
    console.log('📤 Отправка в Supabase...');
    
    const moodData = {
      mood: selectedMood,
      mood_emoji: getMoodEmoji(selectedMood),
      mood_text: getMoodText(selectedMood),
      comment: comment
      // created_at установится автоматически (DEFAULT NOW())
    };
    
    console.log('Данные:', moodData);
    
    const { data, error } = await supabase.from('moods').insert(moodData).select();
    
    console.log('Ответ Supabase:', { data, error });
    
    if (error) {
      console.error('Ошибка от Supabase:', error);
      throw error;
    }
    
    console.log('✅ Настроение сохранено!');
    showToast('Настроение сохранено! 💕', 'success');
    moodComment.value = '';
    selectedMood = null;
    moodSelector.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    
    // Сброс кэша для немедленного обновления
    cache.moods = null;
    loadMoods();
  } catch (error) {
    console.error('❌ Ошибка отправки настроения:', error);
    showToast(`Ошибка: ${error.message}`, 'error');
  } finally {
    submitMoodBtn.disabled = false;
    submitMoodBtn.textContent = 'Отправить 💕';
  }
}

/**
 * Подписка на настроения
 */
function subscribeToMoods() {
  // Начальная загрузка
  loadMoods(1);
  
  // Очищаем старую подписку если есть
  if (moodsChannel) {
    supabase.removeChannel(moodsChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    loadMoods(pagination.moods.page);
  }, 500);
  
  moodsChannel = supabase
    .channel('moods')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'moods' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Подписка на отзывы
 */
function subscribeToReviews() {
  // Начальная загрузка
  loadReviews(1);
  
  // Очищаем старую подписку если есть
  if (reviewsChannel) {
    supabase.removeChannel(reviewsChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    loadReviews(pagination.reviews.page);
  }, 500);
  
  reviewsChannel = supabase
    .channel('reviews')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'reviews' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Подписка на желания
 */
function subscribeToWishes() {
  // Начальная загрузка
  loadWishes(1);
  
  // Очищаем старую подписку если есть
  if (wishesChannel) {
    supabase.removeChannel(wishesChannel);
  }
  
  // Realtime подписка с debouncing
  const debouncedLoad = debounce(() => {
    loadWishes(pagination.wishes.page);
  }, 500);
  
  wishesChannel = supabase
    .channel('wishes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'wishes' },
      debouncedLoad
    )
    .subscribe();
}

/**
 * Загрузка настроений
 */
async function loadMoods(page = 1) {
  pagination.moods.page = page;
  
  try {
    const from = (page - 1) * pagination.moods.perPage;
    const to = from + pagination.moods.perPage - 1;
    
    // Загружаем страницу с направлением user_to_admin
    const { data, error } = await supabase
      .from('moods')
      .select('id, mood_emoji, mood_text, comment, created_at, direction', { count: 'exact' })
      .eq('direction', 'user_to_admin')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) {
      console.error('❌ Ошибка Supabase:', error);
      throw error;
    }
    
    // Получаем count из ответа
    const count = data ? data.length : 0;
    const total = count > 0 ? count : 0;
    
    if (!data || data.length === 0) {
      moodHistory.innerHTML = '<p class="empty-state">Пока нет записей о настроении</p>';
      renderPagination('moods', 0);
      return;
    }
    
    renderMoodsList(data);
    renderPagination('moods', Math.ceil(total / pagination.moods.perPage));
  } catch (error) {
    console.error('Ошибка загрузки настроений:', error);
    moodHistory.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
    renderPagination('moods', 0);
  }
}

/**
 * Отрисовка пагинации
 */
function renderPagination(type, totalPages) {
  const container = document.getElementById(`${type}-pagination`);
  if (!container) return;
  
  const currentPage = pagination[type].page;
  
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = `
    <div class="pagination">
      <button 
        class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
        onclick="prevPage('${type}')"
        ${currentPage === 1 ? 'disabled' : ''}
      >
        ← Назад
      </button>
      <span class="pagination-info">
        Страница ${currentPage} из ${totalPages}
      </span>
      <button 
        class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
        onclick="nextPage('${type}')"
        ${currentPage === totalPages ? 'disabled' : ''}
      >
        Вперёд →
      </button>
    </div>
  `;
}

/**
 * Предыдущая страница
 */
function prevPage(type) {
  if (pagination[type].page > 1) {
    pagination[type].page--;
    if (type === 'moods') loadMoods(pagination[type].page);
    if (type === 'reviews') loadReviews(pagination[type].page);
    if (type === 'wishes') loadWishes(pagination[type].page);
  }
}

/**
 * Следующая страница
 */
function nextPage(type) {
  const totalPages = Math.ceil(pagination[type].total / pagination[type].perPage);
  if (pagination[type].page < totalPages) {
    pagination[type].page++;
    if (type === 'moods') loadMoods(pagination[type].page);
    if (type === 'reviews') loadReviews(pagination[type].page);
    if (type === 'wishes') loadWishes(pagination[type].page);
  }
}

// Делаем функции глобальными
window.prevPage = prevPage;
window.nextPage = nextPage;
/**
 * Отрисовка настроений
 */
function renderMoodsList(moods) {
  moodHistory.innerHTML = moods.map(mood => `
    <div class="review-item">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; background: ${mood.direction === 'admin_to_user' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'linear-gradient(135deg, var(--success), #22c55e)'}; color: white;">
          ${mood.direction === 'admin_to_user' ? '🎁 От Админа' : '📤 Вы'}
        </span>
      </div>
      <div style="font-size: 1.5rem; margin-bottom: 5px;">${mood.mood_emoji}</div>
      <div style="color: var(--accent-secondary); font-weight: 500;">${mood.mood_text}</div>
      ${mood.comment ? `<div class="review-text">${escapeHtml(mood.comment)}</div>` : ''}
      <div class="review-date">${formatDate(mood.created_at)}</div>
    </div>
  `).join('');
}

// ========== Reviews (Отзывы) ==========

/**
 * Инициализация звёздного рейтинга
 */
function initStarRating() {
  const stars = starRating.querySelectorAll('span');
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      selectedRating = rating;
      
      // Обновление отображения звёзд
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
    
    // Hover эффект
    star.addEventListener('mouseenter', () => {
      const rating = parseInt(star.dataset.rating);
      stars.forEach((s, index) => {
        s.textContent = index < rating ? '★' : '☆';
      });
    });
    
    star.addEventListener('mouseleave', () => {
      stars.forEach((s, index) => {
        s.textContent = index < selectedRating ? '★' : '☆';
      });
    });
  });
}

/**
 * Отправка отзыва о дне
 */
async function submitReview() {
  if (selectedRating === 0) {
    showToast('Поставьте оценку дня!', 'warning');
    return;
  }
  
  const text = reviewText.value.trim();
  
  if (!text) {
    showToast('Напишите хоть пару слов о дне!', 'warning');
    return;
  }
  
  // Блокировка кнопки
  submitReviewBtn.disabled = true;
  submitReviewBtn.textContent = 'Отправка...';
  
  try {
    const { error } = await supabase.from('reviews').insert({
      rating: selectedRating,
      text: text,
      direction: 'user_to_admin'  // Получатель → Админ
      // note_id больше не нужен
      // created_at установится автоматически
    });
    
    if (error) throw error;
    
    showToast('Отзыв отправлен! 💌', 'success');
    reviewText.value = '';
    selectedRating = 0;
    starRating.querySelectorAll('span').forEach(s => {
      s.classList.remove('active');
      s.textContent = '☆';
    });
    
    // Сброс кэша
    cache.reviews = null;
    loadReviews();
  } catch (error) {
    console.error('Ошибка отправки отзыва:', error);
    showToast('Ошибка отправки отзыва', 'error');
  } finally {
    submitReviewBtn.disabled = false;
    submitReviewBtn.textContent = 'Отправить отзыв 💌';
  }
}

/**
 * Загрузка отзывов
 */
async function loadReviews(page = 1) {
  pagination.reviews.page = page;
  
  try {
    const from = (page - 1) * pagination.reviews.perPage;
    const to = from + pagination.reviews.perPage - 1;
    
    // Получаем общее количество
    const { count, error: countError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'user_to_admin');
    
    if (countError) throw countError;
    pagination.reviews.total = count || 0;
    
    // Загружаем страницу
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, text, created_at, direction')
      .eq('direction', 'user_to_admin')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      reviewsList.innerHTML = '<p class="empty-state">Пока нет отзывов</p>';
      renderPagination('reviews', 0);
      return;
    }
    
    renderReviewsList(data);
    renderPagination('reviews', Math.ceil(count / pagination.reviews.perPage));
  } catch (error) {
    console.error('Ошибка загрузки отзывов:', error);
    reviewsList.innerHTML = '<p class="empty-state">Ошибка загрузки</p>';
  }
}

/**
 * Отрисовка отзывов
 */
function renderReviewsList(reviews) {
  reviewsList.innerHTML = reviews.map(review => `
    <div class="review-item">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
        <span style="font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; background: ${review.direction === 'admin_to_user' ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' : 'linear-gradient(135deg, var(--success), #22c55e)'}; color: white;">
          ${review.direction === 'admin_to_user' ? '🎁 От Админа' : '📤 Вы → Админу'}
        </span>
      </div>
      <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
      ${review.text ? `<div class="review-text">${escapeHtml(review.text)}</div>` : ''}
      <div class="review-date">${formatDate(review.created_at)}</div>
    </div>
  `).join('');
}

// ========== Wishes (Желания) ==========

const wishDropZone = document.getElementById('wish-drop-zone');
const dropZoneText = document.getElementById('drop-zone-text');
const imagePreviewContainer = document.getElementById('image-preview-container');
const removeImageBtn = document.getElementById('remove-image-btn');

/**
 * Предпросмотр изображения
 */
function initImagePreview() {
  wishImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    
    if (file) {
      selectedImageFile = file;
      showPreview(file);
    } else {
      selectedImageFile = null;
      clearPreview();
    }
  });
  
  // Кнопка удаления изображения
  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeImage();
  });
  
  // Drag and Drop обработчики
  wishDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    wishDropZone.classList.add('drag-over');
    dropZoneText.textContent = '📥 Отпустите файл для загрузки';
  });
  
  wishDropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    wishDropZone.classList.remove('drag-over');
    dropZoneText.textContent = 'или перетащите изображение сюда';
  });
  
  wishDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    wishDropZone.classList.remove('drag-over');
    dropZoneText.textContent = 'или перетащите изображение сюда';
    
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
      const file = files[0];
      
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        showToast('Пожалуйста, выберите изображение!', 'warning');
        return;
      }
      
      // Проверка размера (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс 5MB)', 'warning');
        return;
      }
      
      selectedImageFile = file;
      showPreview(file);
      
      // Обновляем input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      wishImage.files = dataTransfer.files;
      
      console.log('🖼️ Файл перетащен:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  });
  
  // Сброс при уходе курсора
  wishDropZone.addEventListener('dragend', () => {
    wishDropZone.classList.remove('drag-over');
    dropZoneText.textContent = 'или перетащите изображение сюда';
  });
}

/**
 * Показ предпросмотра
 */
function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    wishPreview.src = e.target.result;
    imagePreviewContainer.style.display = 'inline-block';
    dropZoneText.textContent = '✅ Изображение выбрано: ' + file.name;
    dropZoneText.style.color = 'var(--success)';
    wishDropZone.classList.add('has-file');
    removeImageBtn.style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

/**
 * Удаление изображения
 */
function removeImage() {
  console.log('🗑️ Удаление изображения');
  
  selectedImageFile = null;
  wishImage.value = '';
  clearPreview();
  
  showToast('Изображение удалено', 'success');
}

/**
 * Сброс предпросмотра
 */
function clearPreview() {
  imagePreviewContainer.style.display = 'none';
  wishPreview.src = '';
  dropZoneText.textContent = 'или перетащите изображение сюда';
  dropZoneText.style.color = 'var(--text-muted)';
  wishDropZone.classList.remove('has-file');
  removeImageBtn.style.display = 'none';
}

/**
 * Конвертация изображения в Base64
 */
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Загрузка изображения в Supabase Storage
 */
async function uploadImage(file, path) {
  console.log('📤 Загрузка изображения:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    path: path
  });
  
  try {
    // Проверка размера файла (макс 5MB для free тарифа)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Файл слишком большой (макс 5MB)');
    }
    
    // Таймаут 10 секунд
    const uploadPromise = supabase.storage
      .from('wishes')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Таймаут загрузки (10 сек)')), 10000)
    );
    
    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log('📥 Результат загрузки:', { data, error });
    
    if (error) {
      console.error('❌ Ошибка загрузки:', error);
      
      // Альтернатива: конвертируем в Base64
      console.log('🔄 Пробуем Base64...');
      const base64 = await imageToBase64(file);
      return base64; // Возвращаем Base64 вместо URL
    }
    
    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from('wishes')
      .getPublicUrl(path);
    
    console.log('✅ Публичный URL:', urlData?.publicUrl);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('❌ Ошибка uploadImage:', error);
    
    // Фолбэк: Base64
    try {
      console.log('🔄 Фолбэк на Base64...');
      const base64 = await imageToBase64(file);
      return base64;
    } catch (e) {
      console.error('❌ Base64 тоже не сработал:', e);
      return null;
    }
  }
}

/**
 * Добавление желания
 */
async function addWish() {
  const title = wishTitle.value.trim();
  const description = wishDescription.value.trim();
  
  if (!title) {
    showToast('Введите название желания!', 'warning');
    return;
  }
  
  // Блокировка кнопки
  addWishBtn.disabled = true;
  addWishBtn.textContent = 'Добавление...';
  
  try {
    let imageUrl = null;
    
    // Загрузка изображения если выбрано (с таймаутом)
    if (selectedImageFile) {
      console.log('🖼️ Попытка загрузки изображения...');
      try {
        const fileName = `${Date.now()}_${selectedImageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        console.log('Имя файла:', fileName);
        
        // Таймаут 10 секунд для загрузки изображения
        const uploadPromise = uploadImage(selectedImageFile, fileName);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Таймаут загрузки изображения')), 10000)
        );
        
        imageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        console.log('✅ Изображение загружено:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Не удалось загрузить изображение:', uploadError);
        showToast('Изображение не загружено, но желание сохранено', 'warning');
        // Продолжаем без изображения
      }
    }
    
    console.log('📝 Сохранение желания в базу...');
    
    // Таймаут 15 секунд для сохранения в базу
    const savePromise = supabase.from('wishes').insert({
      title: title,
      description: description,
      image_url: imageUrl,
      direction: 'user_to_admin'
    });
    
    const timeoutSavePromise = new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Таймаут сохранения (15 сек)')), 15000);
    });
    
    const { data, error } = await Promise.race([savePromise, timeoutSavePromise]);
    
    console.log('📥 Результат сохранения:', { data, error });
    
    if (error) {
      console.error('❌ Ошибка сохранения:', error);
      throw error;
    }
    
    console.log('✅ Желание сохранено!');
    showToast('Желание добавлено! ✨', 'success');
    
    // Очистка формы
    wishTitle.value = '';
    wishDescription.value = '';
    wishImage.value = '';
    clearPreview();
    selectedImageFile = null;
    
    // Сброс кэша
    cache.wishes = null;
    loadWishes();
  } catch (error) {
    console.error('Ошибка добавления желания:', error);
    const message = error.message.includes('Таймаут') 
      ? 'Проблема соединения. Попробуйте ещё раз...' 
      : 'Ошибка добавления желания';
    showToast(message, 'error');
  } finally {
    addWishBtn.disabled = false;
    addWishBtn.textContent = '➕ Добавить желание';
  }
}

/**
 * Загрузка желаний
 */
async function loadWishes(page = 1) {
  pagination.wishes.page = page;
  
  try {
    const from = (page - 1) * pagination.wishes.perPage;
    const to = from + pagination.wishes.perPage - 1;
    
    // Получаем общее количество
    const { count, error: countError } = await supabase
      .from('wishes')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'admin_to_user');
    
    if (countError) throw countError;
    pagination.wishes.total = count || 0;
    
    // Загружаем страницу
    const { data, error } = await supabase
      .from('wishes')
      .select('id, title, description, image_url, created_at, direction')
      .eq('direction', 'admin_to_user')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      wishesTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <div class="empty-state-icon">✨</div>
            Пока нет желаний
          </td>
        </tr>
      `;
      renderPagination('wishes', 0);
      return;
    }
    
    renderWishesTable(data);
    renderPagination('wishes', Math.ceil(count / pagination.wishes.perPage));
  } catch (error) {
    console.error('Ошибка загрузки желаний:', error);
  }
}

/**
 * Отрисовка желаний
 */
function renderWishesTable(wishes) {
  wishesTableBody.innerHTML = wishes.map(wish => `
    <tr>
      <td>
        <strong>${escapeHtml(wish.title)}</strong>
      </td>
      <td>${wish.description ? escapeHtml(wish.description) : '—'}</td>
      <td>
        ${wish.image_url 
          ? `<img src="${wish.image_url}" alt="${escapeHtml(wish.title)}" loading="lazy" style="max-width: 100px; max-height: 80px; border-radius: var(--radius-sm); object-fit: cover;">`
          : '—'
        }
      </td>
      <td>${formatDate(wish.created_at)}</td>
    </tr>
  `).join('');
}

// ========== Event Listeners ==========

submitMoodBtn.addEventListener('click', submitMood);
submitReviewBtn.addEventListener('click', submitReview);
addWishBtn.addEventListener('click', addWish);

// Auth event listeners
loginBtn.addEventListener('click', () => {
  loginModal.classList.add('active');
});

loginSubmitBtn.addEventListener('click', handleLogin);

loginModal.addEventListener('click', (e) => {
  if (e.target === loginModal) {
    loginModal.classList.remove('active');
  }
});

logoutBtn.addEventListener('click', handleLogout);

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
  
  // Theme state
  let currentTheme = 'classic';
  
  /**
   * Сохранение темы в базу
   */
  async function saveTheme(themeName) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🎨 Сохранение темы:', {
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
        
        console.log('🎨 Существующая тема:', existing);
        
        if (existing) {
          await supabase
            .from('themes')
            .update({ theme_name: themeName, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id);
          console.log('🎨 Тема обновлена для user_id:', session.user.id);
        } else {
          await supabase
            .from('themes')
            .insert({ 
              user_id: session.user.id, 
              theme_name: themeName 
            });
          console.log('🎨 Тема создана для user_id:', session.user.id);
        }
      }
      
      // Всегда сохраняем в localStorage
      localStorage.setItem('userTheme', themeName);
      console.log('✅ Тема сохранена в localStorage:', themeName);
    } catch (error) {
      console.error('❌ Ошибка сохранения темы:', error);
      localStorage.setItem('userTheme', themeName);
    }
  }
  
  /**
   * Загрузка темы пользователя
   */
  async function loadUserTheme() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🎨 Загрузка темы:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (session?.user) {
        // Авторизованный - загружаем из базы
        const { data, error } = await supabase
          .from('themes')
          .select('theme_name, user_id')
          .eq('user_id', session.user.id)
          .single();
        
        console.log('🎨 Данные темы из базы:', { data, error });
        
        if (data && !error) {
          currentTheme = data.theme_name;
          console.log('🎨 Тема загружена из базы:', currentTheme, 'для user_id:', data.user_id);
        } else {
          console.log('⚠️ Тема не найдена в базе, используем localStorage');
          const savedTheme = localStorage.getItem('userTheme');
          if (savedTheme) {
            currentTheme = savedTheme;
          }
        }
      } else {
        // Для неавторизованных - из localStorage
        console.log('🎨 Пользователь не авторизован, используем localStorage');
        const savedTheme = localStorage.getItem('userTheme');
        if (savedTheme) {
          currentTheme = savedTheme;
          console.log('🎨 Тема загружена из localStorage:', currentTheme);
        }
      }
      
      applyTheme(currentTheme);
      updateThemeSelector();
    } catch (error) {
      console.error('❌ Ошибка загрузки темы:', error);
    }
  }
  
  /**
   * Применение темы
   */
  function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('userTheme', themeName);
    currentTheme = themeName;
    console.log('🎨 Тема применена:', themeName);
  }
  
  /**
   * Сохранение темы в базу
   */
  async function saveTheme(themeName) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Авторизованный пользователь - сохраняем в базу
        const { data: existing } = await supabase
          .from('themes')
          .select('id')
          .eq('user_id', session.user.id)
          .single();
        
        if (existing) {
          await supabase
            .from('themes')
            .update({ theme_name: themeName, updated_at: new Date().toISOString() })
            .eq('user_id', session.user.id);
        } else {
          await supabase
            .from('themes')
            .insert({ 
              user_id: session.user.id, 
              theme_name: themeName 
            });
        }
        showToast('Тема сохранена! 🎨', 'success');
      }
      
      // Всегда сохраняем в localStorage
      localStorage.setItem('userTheme', themeName);
      console.log('✅ Тема сохранена:', themeName);
    } catch (error) {
      console.error('Ошибка сохранения темы:', error);
      // Всё равно сохраняем в localStorage
      localStorage.setItem('userTheme', themeName);
    }
  }
  
  /**
   * Обновление селектора тем
   */
  function updateThemeSelector() {
    themeOptions.forEach(option => {
      if (option.dataset.theme === currentTheme) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
  
  /**
   * Открытие модального окна тем
   */
  function openThemeModal() {
    themeModalOverlay.classList.add('active');
    updateThemeSelector();
  }
  
  /**
   * Закрытие модального окна тем
   */
  function closeThemeModal() {
    themeModalOverlay.classList.remove('active');
  }
  
  // Event listeners для тем
  themeToggleBtn.addEventListener('click', openThemeModal);
  themeModalClose.addEventListener('click', closeThemeModal);
  
  themeModalOverlay.addEventListener('click', (e) => {
    if (e.target === themeModalOverlay) {
      closeThemeModal();
    }
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
  
  // Загрузка темы при инициализации
  loadUserTheme();
}

// Инициализация системы тем
// Вызывается в init()

// ========== Admin Button ==========

/**
 * Проверка авторизации админа для показа кнопки "Назад"
 */
async function checkAdminAuth() {
  try {
    console.log('🔍 checkAdminAuth вызвана');
    console.log('🔍 ADMIN_EMAIL:', ADMIN_EMAIL);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    console.log('🔍 Сессия:', session ? 'есть' : 'нет');
    console.log('🔍 Email сессии:', session?.user?.email);
    console.log('🔍 Совпадение email:', session?.user?.email === ADMIN_EMAIL);
    
    // Скрываем кнопку по умолчанию (убираем класс show)
    adminBackBtn.classList.remove('show');
    console.log('🔍 Кнопка скрыта (класс show удалён)');
    
    if (session?.user && session.user.email === ADMIN_EMAIL) {
      adminBackBtn.classList.add('show');
      console.log('✅ Кнопка "Админка" показана (admin:', session.user.email, ')');
    } else {
      console.log('⚠️ Кнопка скрыта - не админ или не авторизован');
      console.log('   session?.user:', !!session?.user);
      console.log('   session.user.email:', session?.user?.email);
      console.log('   ADMIN_EMAIL:', ADMIN_EMAIL);
    }
  } catch (error) {
    console.error('❌ Ошибка проверки авторизации:', error);
    adminBackBtn.classList.remove('show');
  }
}

// ========== Initialization ==========

function init() {
  console.log('🚀 Секретные Записки запущены');
  
  // Сначала загружаем тему из localStorage
  const savedTheme = localStorage.getItem('userTheme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('🎨 Тема загружена из localStorage:', savedTheme);
  }
  
  initMoodSelector();
  initStarRating();
  initImagePreview();
  
  subscribeToNotes();
  subscribeToMoods();
  subscribeToReviews();
  subscribeToWishes();
  
  // Загрузка темы пользователя из базы (после localStorage)
  if (typeof initThemeSystem === 'function') {
    initThemeSystem();
  }
  
  // Инициализация редактора тем уже в theme-creator.js
  
  // Проверяем авторизацию админа СРАЗУ при загрузке
  console.log('🔍 Вызов checkAdminAuth() при загрузке...');
  checkAdminAuth();
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

