/**
 * Love Letters - Main Application Script
 * Memory Book, Bucket List, Love Prompts, Calendar, Playlist, Challenges, Private Vault
 */

import { supabase } from './supabase-config.js';
import { 
  parseMarkdown, 
  formatDate, 
  showToast, 
  initTheme,
  setTheme,
  uploadToStorage,
  deleteFromStorage,
  extractYouTubeId,
  getYouTubeEmbedUrl,
  initDropZone,
  wishCategories,
  wishStatuses,
  generateUUID
} from './utils.js';

// ========== STATE ==========
let currentUser = null;
let currentSection = 'memory-book';
let calendarCurrentDate = new Date();
let uploadedImages = [];

// ========== DOM ELEMENTS ==========
const elements = {};

function cacheElements() {
  // Theme
  elements.themeToggleBtn = document.getElementById('theme-toggle-btn');
  elements.themeModalOverlay = document.getElementById('theme-modal-overlay');
  elements.themeModalClose = document.getElementById('theme-modal-close');
  elements.themeTabs = document.querySelectorAll('.theme-tab');
  elements.themeTabContents = document.querySelectorAll('.theme-tab-content');
  elements.themeOptions = document.querySelectorAll('.theme-option');
  
  // Navigation
  elements.sidebar = document.getElementById('sidebar');
  elements.mainContent = document.getElementById('main-content');
  elements.menuToggle = document.getElementById('menu-toggle');
  elements.navItems = document.querySelectorAll('.nav-item');
  
  // Auth
  elements.authBtn = document.getElementById('auth-btn');
  elements.adminLink = document.getElementById('admin-link');
  elements.authModal = document.getElementById('auth-modal');
  elements.authEmail = document.getElementById('auth-email');
  elements.authPassword = document.getElementById('auth-password');
  elements.authSubmitBtn = document.getElementById('auth-submit-btn');
  elements.authLogoutBtn = document.getElementById('auth-logout-btn');
  
  // Sections
  elements.sections = {
    'memory-book': document.getElementById('memory-book-section'),
    'bucket-list': document.getElementById('bucket-list-section'),
    'love-prompts': document.getElementById('love-prompts-section'),
    'calendar': document.getElementById('calendar-section'),
    'playlist': document.getElementById('playlist-section'),
    'challenges': document.getElementById('challenges-section'),
    'private-vault': document.getElementById('private-vault-section')
  };
  
  // Memory Book
  elements.memoriesContainer = document.getElementById('memories-container');
  elements.addMemoryBtn = document.getElementById('add-memory-btn');
  elements.memoryModal = document.getElementById('memory-modal');
  elements.memoryTitle = document.getElementById('memory-title');
  elements.memoryDate = document.getElementById('memory-date');
  elements.memoryContent = document.getElementById('memory-content');
  elements.memoryTags = document.getElementById('memory-tags');
  elements.memoryDropZone = document.getElementById('memory-drop-zone');
  elements.memoryImageInput = document.getElementById('memory-image');
  elements.memoryPreviewContainer = document.getElementById('memory-preview-container');
  elements.saveMemoryBtn = document.getElementById('save-memory-btn');
  elements.memoryYearFilter = document.getElementById('memory-year-filter');
  elements.memoryMonthFilter = document.getElementById('memory-month-filter');
  elements.memoryTagFilter = document.getElementById('memory-tag-filter');
  
  // Bucket List
  elements.wishesContainer = document.getElementById('wishes-container');
  elements.addWishBtn = document.getElementById('add-wish-btn');
  elements.wishModal = document.getElementById('wish-modal');
  elements.wishTitle = document.getElementById('wish-title');
  elements.wishDescription = document.getElementById('wish-description');
  elements.wishCategory = document.getElementById('wish-category');
  elements.wishStatus = document.getElementById('wish-status');
  elements.saveWishBtn = document.getElementById('save-wish-btn');
  elements.wishDropZone = document.getElementById('wish-drop-zone');
  elements.wishImageInput = document.getElementById('wish-image');
  elements.wishPreviewContainer = document.getElementById('wish-preview-container');
  elements.saveWishBtn = document.getElementById('save-wish-btn');
  elements.bucketStatusFilter = document.getElementById('bucket-status-filter');
  elements.bucketCategoryFilter = document.getElementById('bucket-category-filter');
  elements.bucketStats = {
    planned: document.getElementById('stat-planned'),
    inProgress: document.getElementById('stat-in-progress'),
    done: document.getElementById('stat-done')
  };
  
  // Calendar
  elements.calendarGrid = document.getElementById('calendar-grid');
  elements.calendarMonthYear = document.getElementById('calendar-month-year');
  elements.calendarPrev = document.getElementById('calendar-prev');
  elements.calendarNext = document.getElementById('calendar-next');
  elements.addEventBtn = document.getElementById('add-event-btn');
  elements.eventModal = document.getElementById('event-modal');
  elements.eventTitle = document.getElementById('event-title');
  elements.eventDate = document.getElementById('event-date');
  elements.eventDescription = document.getElementById('event-description');
  elements.eventGifts = document.getElementById('event-gifts');
  elements.eventPlans = document.getElementById('event-plans');
  elements.eventReminder = document.getElementById('event-reminder');
  elements.saveEventBtn = document.getElementById('save-event-btn');
  elements.upcomingEvents = document.getElementById('upcoming-events');
  
  // Playlist
  elements.playlistContainer = document.getElementById('playlist-container');
  elements.addSongBtn = document.getElementById('add-song-btn');
  elements.songModal = document.getElementById('song-modal');
  elements.songUrl = document.getElementById('song-url');
  elements.songTitle = document.getElementById('song-title');
  elements.saveSongBtn = document.getElementById('save-song-btn');
  
  // Challenges
  elements.challengesContainer = document.getElementById('challenges-container');
  elements.addChallengeBtn = document.getElementById('add-challenge-btn');
  elements.challengeModal = document.getElementById('challenge-modal');
  elements.challengeTitle = document.getElementById('challenge-title');
  elements.challengeDescription = document.getElementById('challenge-description');
  elements.challengeDueDate = document.getElementById('challenge-due-date');
  elements.challengeDropZone = document.getElementById('challenge-drop-zone');
  elements.challengeImageInput = document.getElementById('challenge-image');
  elements.challengePreviewContainer = document.getElementById('challenge-preview-container');
  elements.saveChallengeBtn = document.getElementById('save-challenge-btn');
  
  // Private Vault
  elements.vaultDropZone = document.getElementById('vault-drop-zone');
  elements.vaultFileInput = document.getElementById('vault-file-input');
  elements.vaultItems = document.getElementById('vault-items');
  elements.vaultTabs = document.querySelectorAll('.vault-tab');
  
  // Prompts
  elements.promptsContainer = document.getElementById('prompts-container');
  elements.addPromptBtn = document.getElementById('add-prompt-btn');
  elements.promptModal = document.getElementById('prompt-modal');
  elements.promptQuestion = document.getElementById('prompt-question');
  elements.promptTarget = document.getElementById('prompt-target');
  elements.savePromptBtn = document.getElementById('save-prompt-btn');
  
  // Modals
  elements.modalOverlays = document.querySelectorAll('.modal-overlay');
  elements.modalCloseButtons = document.querySelectorAll('.modal-close');
}

// ========== INITIALIZATION ==========

async function init() {
  cacheElements();
  // Load saved theme
  const currentTheme = localStorage.getItem('love_letters_theme') || 'classic';
  setTheme(currentTheme);
  setupEventListeners();
  await setupAuthListener();
  loadSection('memory-book');
}

function setupEventListeners() {
  // Theme Toggle
  elements.themeToggleBtn?.addEventListener('click', () => {
    elements.themeModalOverlay?.classList.add('active');
  });
  
  elements.themeModalClose?.addEventListener('click', () => {
    elements.themeModalOverlay?.classList.remove('active');
  });
  
  elements.themeModalOverlay?.addEventListener('click', (e) => {
    if (e.target === elements.themeModalOverlay) {
      elements.themeModalOverlay.classList.remove('active');
    }
  });
  
  // Theme Tabs
  elements.themeTabs?.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.themeTabs.forEach(t => t.classList.remove('active'));
      elements.themeTabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
  
  // Theme Options
  elements.themeOptions?.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      if (theme) {
        setTheme(theme);
        updateThemeSelection(theme);
      }
    });
  });
  
  // Navigation
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => loadSection(item.dataset.section));
  });
  
  // Mobile menu toggle
  elements.menuToggle?.addEventListener('click', () => {
    elements.sidebar.classList.toggle('active');
  });
  
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && 
        !elements.sidebar.contains(e.target) && 
        !elements.menuToggle?.contains(e.target)) {
      elements.sidebar.classList.remove('active');
    }
  });
  
  // Auth
  elements.authBtn?.addEventListener('click', () => openModal('auth-modal'));
  elements.authSubmitBtn?.addEventListener('click', handleAuth);
  elements.authLogoutBtn?.addEventListener('click', handleLogout);
  
  // Modal close
  elements.modalCloseButtons.forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  
  elements.modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
  
  // Memory Book
  elements.addMemoryBtn?.addEventListener('click', () => openMemoryModal());
  elements.saveMemoryBtn?.addEventListener('click', saveMemory);
  elements.memoryDropZone?.addEventListener('click', () => elements.memoryImageInput?.click());
  elements.memoryImageInput?.addEventListener('change', handleMemoryImageSelect);
  elements.memoryYearFilter?.addEventListener('change', loadMemories);
  elements.memoryMonthFilter?.addEventListener('change', loadMemories);
  elements.memoryTagFilter?.addEventListener('input', debounce(loadMemories, 500));
  initDropZone(elements.memoryDropZone, handleMemoryImageDrop);
  
  // Bucket List
  elements.addWishBtn?.addEventListener('click', () => openWishModal());
  elements.saveWishBtn?.addEventListener('click', saveWish);
  elements.wishDropZone?.addEventListener('click', () => elements.wishImageInput?.click());
  elements.wishImageInput?.addEventListener('change', handleWishImageSelect);
  elements.bucketStatusFilter?.addEventListener('change', loadWishes);
  elements.bucketCategoryFilter?.addEventListener('change', loadWishes);
  initDropZone(elements.wishDropZone, handleWishImageDrop);
  
  // Prompts
  elements.addPromptBtn?.addEventListener('click', () => openModal('prompt-modal'));
  elements.savePromptBtn?.addEventListener('click', savePrompt);
  
  // Calendar
  elements.calendarPrev?.addEventListener('click', () => changeMonth(-1));
  elements.calendarNext?.addEventListener('click', () => changeMonth(1));
  elements.saveEventBtn?.addEventListener('click', saveEvent);
  
  // Клик по дате календаря (делегирование событий)
  elements.calendarGrid?.addEventListener('click', (e) => {
    const dayElement = e.target.closest('.calendar-day:not(.other-month)');
    if (dayElement) {
      const date = dayElement.dataset.date;
      if (date) {
        openEventModal(date);
      }
    }
  });
  
  // Playlist
  elements.addSongBtn?.addEventListener('click', () => openModal('song-modal'));
  elements.saveSongBtn?.addEventListener('click', saveSong);
  
  // Challenges
  elements.addChallengeBtn?.addEventListener('click', () => openChallengeModal());
  elements.saveChallengeBtn?.addEventListener('click', saveChallenge);
  elements.challengeDropZone?.addEventListener('click', () => elements.challengeImageInput?.click());
  elements.challengeImageInput?.addEventListener('change', handleChallengeImageSelect);
  initDropZone(elements.challengeDropZone, handleChallengeImageDrop);
  
  // Private Vault
  elements.vaultDropZone?.addEventListener('click', () => elements.vaultFileInput?.click());
  elements.vaultFileInput?.addEventListener('change', handleVaultFileSelect);
  initDropZone(elements.vaultDropZone, handleVaultFileDrop);
  
  elements.vaultTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.vaultTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadVaultItems();
    });
  });
}

// ========== NAVIGATION ==========

function loadSection(sectionName) {
  currentSection = sectionName;
  
  elements.navItems.forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionName);
  });
  
  Object.entries(elements.sections).forEach(([name, section]) => {
    if (section) section.style.display = name === sectionName ? 'block' : 'none';
  });
  
  switch (sectionName) {
    case 'memory-book': loadMemories(); break;
    case 'bucket-list': loadWishes(); break;
    case 'love-prompts': loadPrompts(); break;
    case 'calendar': renderCalendar(); loadImportantDates(); break;
    case 'playlist': loadPlaylist(); break;
    case 'challenges': loadChallenges(); break;
    case 'private-vault': loadVaultItems(); break;
  }
  
  if (window.innerWidth <= 1024) elements.sidebar.classList.remove('active');
}

// ========== AUTH ==========

async function setupAuthListener() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  updateAuthUI();
  
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    updateAuthUI();
  });
}

function updateAuthUI() {
  if (currentUser) {
    elements.authBtn.textContent = '👤 ' + (currentUser.email?.split('@')[0] || 'Профиль');
    elements.authLogoutBtn.style.display = 'block';
    elements.authSubmitBtn.style.display = 'none';
    elements.adminLink.style.display = 'inline-flex';
  } else {
    elements.authBtn.textContent = '🔐 Войти';
    elements.authLogoutBtn.style.display = 'none';
    elements.authSubmitBtn.style.display = 'block';
    elements.adminLink.style.display = 'none';
  }
}

async function handleAuth() {
  const email = elements.authEmail.value.trim();
  const password = elements.authPassword.value;
  
  if (!email || !password) {
    showToast('Введите email и пароль', 'error');
    return;
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    currentUser = data.user;
    updateAuthUI();
    closeModal('auth-modal');
    showToast('Добро пожаловать! 💕', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleLogout() {
  try {
    await supabase.auth.signOut();
    currentUser = null;
    updateAuthUI();
    showToast('Вы вышли из системы', 'info');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ========== MODAL HELPERS ==========

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    uploadedImages = [];
    [elements.memoryPreviewContainer, elements.wishPreviewContainer, elements.challengePreviewContainer]
      .forEach(el => { if (el) el.innerHTML = ''; });
  }
}

// ========== MEMORY BOOK ==========

async function loadMemories() {
  if (!elements.memoriesContainer) return;
  
  elements.memoriesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    let query = supabase.from('memories').select('*').order('memory_date', { ascending: false });
    
    const year = elements.memoryYearFilter?.value;
    const month = elements.memoryMonthFilter?.value;
    const tag = elements.memoryTagFilter?.value?.trim();
    
    if (year && year !== 'all') {
      query = query.gte('memory_date', `${year}-01-01`).lte('memory_date', `${year}-12-31`);
    }
    
    if (month && month !== 'all') {
      const y = year !== 'all' ? year : new Date().getFullYear();
      query = query.gte('memory_date', `${y}-${month.padStart(2, '0')}-01`)
                   .lte('memory_date', `${y}-${month.padStart(2, '0')}-31`);
    }
    
    if (tag) query = query.contains('tags', [tag.toLowerCase()]);
    
    const { data, error } = await query;
    if (error) throw error;
    
    updateYearFilter(data);
    
    if (!data || data.length === 0) {
      elements.memoriesContainer.innerHTML = `
        <div class="empty-state"><div class="empty-state-icon">📖</div><p>Пока нет воспоминаний</p></div>`;
      return;
    }
    
    elements.memoriesContainer.innerHTML = data.map(createMemoryCard).join('');
  } catch (error) {
    console.error('Error loading memories:', error);
    elements.memoriesContainer.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка загрузки</p></div>';
  }
}

function createMemoryCard(memory) {
  const tags = memory.tags || [];
  const images = memory.image_urls || [];
  
  let imageHtml = '';
  if (images.length === 1) {
    imageHtml = `<img src="${images[0]}" alt="${memory.title}" class="memory-image" onclick="openImageModal('${images[0]}')">`;
  } else if (images.length > 1) {
    imageHtml = `<div class="memory-images-grid">${images.slice(0, 4).map(img => `<img src="${img}" onclick="openImageModal('${img}')" />`).join('')}</div>`;
  }
  
  return `
    <div class="memory-card fade-in">
      ${imageHtml}
      <div class="memory-content">
        <h3 class="memory-title">${escapeHtml(memory.title)}</h3>
        <div class="memory-date">📅 ${formatDate(memory.memory_date, 'full', 'ru')}</div>
        <div class="memory-text">${parseMarkdown(memory.content)}</div>
        ${tags.length > 0 ? `<div class="memory-tags">${tags.map(tag => `<span class="memory-tag">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>
    </div>
  `;
}

function updateYearFilter(memories) {
  if (!elements.memoryYearFilter) return;
  const years = [...new Set(memories.map(m => new Date(m.memory_date).getFullYear()))].sort((a, b) => b - a);
  const current = elements.memoryYearFilter.value;
  elements.memoryYearFilter.innerHTML = '<option value="all">Все годы</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
  if (years.includes(parseInt(current))) elements.memoryYearFilter.value = current;
}

function openMemoryModal() {
  if (!currentUser) { showToast('Войдите чтобы добавлять воспоминания', 'warning'); openModal('auth-modal'); return; }
  uploadedImages = [];
  elements.memoryPreviewContainer.innerHTML = '';
  document.getElementById('memory-modal-title').textContent = '📖 Добавить воспоминание';
  elements.memoryTitle.value = '';
  elements.memoryDate.value = new Date().toISOString().split('T')[0];
  elements.memoryContent.value = '';
  elements.memoryTags.value = '';
  openModal('memory-modal');
}

function handleMemoryImageSelect(e) {
  Array.from(e.target.files).forEach(file => previewImage(file, elements.memoryPreviewContainer));
}

function handleMemoryImageDrop(file) {
  previewImage(file, elements.memoryPreviewContainer);
}

async function saveMemory() {
  if (!currentUser) { showToast('Войдите чтобы сохранять', 'warning'); return; }
  
  const title = elements.memoryTitle.value.trim();
  const content = elements.memoryContent.value.trim();
  const memoryDate = elements.memoryDate.value;
  
  if (!title || !content || !memoryDate) { showToast('Заполните обязательные поля', 'error'); return; }
  
  const tags = elements.memoryTags.value.trim().split(',').map(t => t.trim().toLowerCase()).filter(t => t);
  
  try {
    let imageUrls = [];
    for (const img of uploadedImages) {
      const path = `memories/${generateUUID()}_${img.file.name}`;
      imageUrls.push(await uploadToStorage('memories', img.file, path));
    }
    
    const { error } = await supabase.from('memories').insert([{
      title, content, memory_date: memoryDate, tags, image_urls: imageUrls, created_by: 'user'
    }]);
    
    if (error) throw error;
    
    showToast('Воспоминание сохранено! 💕', 'success');
    closeModal('memory-modal');
    loadMemories();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== BUCKET LIST ==========

async function loadWishes() {
  if (!elements.wishesContainer) return;
  elements.wishesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    let query = supabase.from('wishes').select('*').order('created_at', { ascending: false });
    
    const status = elements.bucketStatusFilter?.value;
    const category = elements.bucketCategoryFilter?.value;
    
    if (status && status !== 'all') query = query.eq('status', status);
    if (category && category !== 'all') query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    
    updateBucketStats(data);
    
    if (!data || data.length === 0) {
      elements.wishesContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💫</div><p>Пока нет желаний</p></div>';
      return;
    }
    
    elements.wishesContainer.innerHTML = data.map(createWishCard).join('');
  } catch (error) {
    elements.wishesContainer.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка</p></div>';
  }
}

function updateBucketStats(wishes) {
  if (!elements.bucketStats) return;
  elements.bucketStats.planned.textContent = wishes.filter(w => w.status === 'planned').length;
  elements.bucketStats.inProgress.textContent = wishes.filter(w => w.status === 'in_progress').length;
  elements.bucketStats.done.textContent = wishes.filter(w => w.status === 'done').length;
}

function createWishCard(wish) {
  const cat = wishCategories[wish.category] || wishCategories.other;
  const stat = wishStatuses[wish.status] || wishStatuses.planned;
  
  return `
    <div class="wish-card fade-in">
      <div class="wish-header"><h3 class="wish-title">${escapeHtml(wish.title)}</h3><span class="wish-category" title="${cat.name}">${cat.icon}</span></div>
      ${wish.description ? `<p class="wish-description">${escapeHtml(wish.description)}</p>` : ''}
      ${wish.image_url ? `<img src="${wish.image_url}" class="wish-image">` : ''}
      <div class="wish-meta">
        <span class="wish-status ${wish.status}">${stat.icon} ${stat.name}</span>
        <div class="wish-actions">
          ${currentUser ? `<button class="btn btn-secondary btn-sm" onclick="editWish('${wish.id}')" title="Редактировать">✏️</button>` : ''}
          ${currentUser ? `<button class="btn btn-danger btn-sm" onclick="deleteWish('${wish.id}')">🗑️</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function openWishModal() {
  if (!currentUser) { showToast('Войдите чтобы добавлять желания', 'warning'); openModal('auth-modal'); return; }
  uploadedImages = [];
  elements.wishPreviewContainer.innerHTML = '';
  document.getElementById('wish-modal-title').textContent = '💫 Добавить желание';
  document.getElementById('wish-id').value = '';
  document.getElementById('wish-title').value = '';
  document.getElementById('wish-description').value = '';
  document.getElementById('wish-category').value = 'other';
  document.getElementById('wish-status').value = 'planned';
  openModal('wish-modal');
}

window.editWish = async function(wishId) {
  if (!currentUser) { showToast('Войдите чтобы редактировать', 'warning'); openModal('auth-modal'); return; }
  
  try {
    const { data, error } = await supabase.from('wishes').select('*').eq('id', wishId).single();
    if (error) throw error;
    
    document.getElementById('wish-modal-title').textContent = '✏️ Редактировать желание';
    document.getElementById('wish-id').value = data.id;
    document.getElementById('wish-title').value = data.title;
    document.getElementById('wish-description').value = data.description || '';
    document.getElementById('wish-category').value = data.category || 'other';
    document.getElementById('wish-status').value = data.status || 'planned';
    
    uploadedImages = [];
    elements.wishPreviewContainer.innerHTML = '';
    
    // Show existing image
    if (data.image_url) {
      addExistingWishImageToPreview(data.image_url);
    }
    
    openModal('wish-modal');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

function addExistingWishImageToPreview(url) {
  const preview = elements.wishPreviewContainer;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:relative;display:inline-block;';
  
  const img = document.createElement('img');
  img.src = url;
  img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border-color);';
  
  const btn = document.createElement('button');
  btn.className = 'btn-remove-image';
  btn.innerHTML = '✕';
  btn.style.cssText = 'position:absolute;top:2px;right:2px;width:24px;height:24px;border-radius:50%;background:rgba(220,38,38,0.9);color:white;border:none;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  btn.onclick = () => {
    wrapper.remove();
    if (!uploadedImages.toRemove) uploadedImages.toRemove = [];
    uploadedImages.toRemove.push(url);
  };
  
  wrapper.appendChild(img);
  wrapper.appendChild(btn);
  preview.appendChild(wrapper);
}

function handleWishImageSelect(e) {
  if (e.target.files[0]) previewImage(e.target.files[0], elements.wishPreviewContainer);
}

function handleWishImageDrop(file) {
  previewImage(file, elements.wishPreviewContainer);
}

async function saveWish() {
  if (!currentUser) { showToast('Войдите чтобы сохранять', 'warning'); return; }
  const title = elements.wishTitle.value.trim();
  if (!title) { showToast('Введите название желания', 'error'); return; }
  
  const wishId = document.getElementById('wish-id').value;
  
  try {
    let imageUrl = null;
    
    // Upload new image
    if (uploadedImages.length > 0 && uploadedImages[0].file) {
      const img = uploadedImages[0];
      const safeFileName = img.file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      
      const path = `wishes/${generateUUID()}_${safeFileName}`;
      imageUrl = await uploadToStorage('wishes', img.file, path);
    }
    
    // Get existing image if not removed
    if (wishId && !imageUrl) {
      const { data: existing } = await supabase.from('wishes').select('image_url').eq('id', wishId).single();
      if (existing?.image_url) {
        const toRemove = uploadedImages.toRemove || [];
        if (!toRemove.includes(existing.image_url)) {
          imageUrl = existing.image_url;
        }
      }
    }
    
    const wishData = {
      title,
      description: document.getElementById('wish-description').value.trim() || null,
      category: document.getElementById('wish-category').value,
      status: document.getElementById('wish-status').value,
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    };
    
    let error;
    if (wishId) {
      ({ error } = await supabase.from('wishes').update(wishData).eq('id', wishId));
    } else {
      wishData.created_by = 'user';
      wishData.created_at = new Date().toISOString();
      ({ error } = await supabase.from('wishes').insert([wishData]));
    }
    
    if (error) throw error;
    
    showToast('Желание сохранено! 💫', 'success');
    closeModal('wish-modal');
    loadWishes();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

async function deleteWish(wishId) {
  if (!currentUser || !confirm('Удалить?')) return;
  try {
    await supabase.from('wishes').delete().eq('id', wishId);
    showToast('Удалено', 'success');
    loadWishes();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== LOVE PROMPTS ==========

async function loadPrompts() {
  if (!elements.promptsContainer) return;
  elements.promptsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const { data, error } = await supabase.from('prompts').select('*, responses:prompt_responses(*)').order('created_at', { ascending: false });
    if (error) throw error;
    
    if (!data || data.length === 0) {
      elements.promptsContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💭</div><p>Пока нет вопросов</p></div>';
      return;
    }
    
    elements.promptsContainer.innerHTML = data.map(createPromptCard).join('');
  } catch (error) {
    elements.promptsContainer.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка</p></div>';
  }
}

function createPromptCard(prompt) {
  const responses = prompt.responses || [];
  const targets = { him: 'Для него', her: 'Для неё', both: 'Общий' };
  
  return `
    <div class="prompt-card fade-in">
      <div class="prompt-question">${escapeHtml(prompt.question)}</div>
      <div class="prompt-responses">
        ${responses.map(r => `<div class="prompt-response prompt-response-${r.answered_by}"><div class="response-text">${escapeHtml(r.answer)}</div><div class="response-date">${formatDate(r.answered_at, 'datetime', 'ru')}</div></div>`).join('')}
        ${responses.length === 0 ? '<p style="color: var(--text-muted);">Нет ответов</p>' : ''}
      </div>
      <div class="prompt-meta">
        <span class="prompt-target">${targets[prompt.target] || 'Общий'}</span>
        ${currentUser && !responses.find(r => r.answered_by === 'user') ? `<button class="btn btn-primary btn-sm" onclick="answerPrompt('${prompt.id}')">💬 Ответить</button>` : ''}
      </div>
    </div>
  `;
}

async function answerPrompt(promptId) {
  if (!currentUser) { showToast('Войдите чтобы отвечать', 'warning'); return; }
  const answer = prompt('Ваш ответ:');
  if (!answer?.trim()) return;
  try {
    await supabase.from('prompt_responses').insert([{ prompt_id: promptId, answer: answer.trim(), answered_by: 'user' }]);
    showToast('Ответ сохранён! 💕', 'success');
    loadPrompts();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

async function savePrompt() {
  if (!currentUser) { showToast('Войдите чтобы добавлять', 'warning'); return; }
  const question = elements.promptQuestion.value.trim();
  if (!question) { showToast('Введите вопрос', 'error'); return; }
  try {
    await supabase.from('prompts').insert([{ question, target: elements.promptTarget.value, is_custom: true, created_by: 'user' }]);
    showToast('Вопрос добавлен! 💭', 'success');
    closeModal('prompt-modal');
    loadPrompts();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== CALENDAR ==========

function renderCalendar() {
  if (!elements.calendarGrid) return;
  const year = calendarCurrentDate.getFullYear();
  const month = calendarCurrentDate.getMonth();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  
  elements.calendarMonthYear.textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const startIndex = firstDay === 0 ? 6 : firstDay - 1;
  
  let html = dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');
  
  for (let i = startIndex - 1; i >= 0; i--) html += `<div class="calendar-day other-month"><span class="calendar-day-number">${daysInPrev - i}</span></div>`;
  
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const isToday = date.toDateString() === today.toDateString();
    const dateStr = date.toISOString().split('T')[0];
    html += `<div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}" title="Нажмите чтобы добавить событие"><span class="calendar-day-number">${d}</span><div class="calendar-events" id="events-${dateStr}"></div></div>`;
  }
  
  const remaining = Math.ceil((daysInMonth + startIndex) / 7) * 7 - (startIndex + daysInMonth);
  for (let i = 1; i <= remaining; i++) html += `<div class="calendar-day other-month"><span class="calendar-day-number">${i}</span></div>`;
  
  elements.calendarGrid.innerHTML = html;
}

function changeMonth(delta) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
  renderCalendar();
  loadImportantDates();
}

async function loadImportantDates() {
  if (!elements.upcomingEvents) return;
  try {
    const { data, error } = await supabase.from('important_dates').select('*').gte('event_date', new Date().toISOString().split('T')[0]).order('event_date', { ascending: true }).limit(5);
    if (error) throw error;
    
    if (!data?.length) {
      elements.upcomingEvents.innerHTML = '<p class="empty-state">Нет предстоящих событий</p>';
      return;
    }
    
    elements.upcomingEvents.innerHTML = data.map(e => `
      <div class="card" style="padding: 15px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div><strong style="color: var(--accent-secondary);">${escapeHtml(e.title)}</strong><div style="color: var(--text-muted); font-size: 0.85rem;">${formatDate(e.event_date, 'DMY', 'ru')}</div></div>
          ${currentUser ? `<button class="btn btn-secondary btn-sm" onclick="editEvent('${e.id}')">✏️</button>` : ''}
        </div>
      </div>
    `).join('');
    
    data.forEach(e => {
      const day = document.querySelector(`.calendar-day[data-date="${e.event_date}"]`);
      if (day && !day.querySelector('.calendar-event-indicator')) {
        day.innerHTML += '<div class="calendar-event-indicator"></div>';
        day.classList.add('has-event');
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function openEventModal(selectedDate = null) {
  if (!currentUser) { showToast('Войдите чтобы добавлять', 'warning'); openModal('auth-modal'); return; }
  
  const dateToUse = selectedDate || new Date().toISOString().split('T')[0];
  const isToday = dateToUse === new Date().toISOString().split('T')[0];
  
  document.getElementById('event-modal-title').textContent = isToday 
    ? '📅 Событие сегодня' 
    : `📅 Событие ${formatDate(dateToUse, 'DMY', 'ru')}`;
  
  elements.eventTitle.value = '';
  elements.eventDate.value = dateToUse;
  elements.eventDescription.value = '';
  elements.eventGifts.value = '';
  elements.eventPlans.value = '';
  elements.eventReminder.value = 3;
  openModal('event-modal');
}

async function saveEvent() {
  if (!currentUser) { showToast('Войдите чтобы сохранять', 'warning'); return; }
  const title = elements.eventTitle.value.trim();
  const date = elements.eventDate.value;
  if (!title || !date) { showToast('Заполните название и дату', 'error'); return; }
  
  const gifts = elements.eventGifts.value.trim().split(',').map(g => g.trim()).filter(g => g);
  
  try {
    await supabase.from('important_dates').insert([{
      title, event_date: date, description: elements.eventDescription.value.trim() || null,
      gift_ideas: gifts, plans: elements.eventPlans.value.trim() || null,
      reminder_days_before: parseInt(elements.eventReminder.value) || 3, created_by: 'user'
    }]);
    showToast('Событие добавлено! 📅', 'success');
    closeModal('event-modal');
    renderCalendar();
    loadImportantDates();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== PLAYLIST ==========

async function loadPlaylist() {
  if (!elements.playlistContainer) return;
  elements.playlistContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const { data, error } = await supabase.from('playlist').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    if (!data?.length) {
      elements.playlistContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎵</div><p>Пока нет треков</p></div>';
      return;
    }
    
    elements.playlistContainer.innerHTML = data.map(createSongCard).join('');
  } catch (error) {
    elements.playlistContainer.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка</p></div>';
  }
}

function createSongCard(song) {
  const embedUrl = getYouTubeEmbedUrl(song.youtube_url);
  const thumb = `https://img.youtube.com/vi/${song.youtube_id}/mqdefault.jpg`;
  
  return `
    <div class="song-card fade-in">
      <div class="song-thumbnail"><img src="${thumb}"></div>
      <div class="song-info">
        <div class="song-title">${escapeHtml(song.title || 'Без названия')}</div>
        <div class="song-added">Добавлено ${formatDate(song.created_at, 'relative', 'ru')}</div>
      </div>
      <div class="song-actions">
        <button class="btn btn-primary btn-sm" onclick="playSong('${embedUrl}')">▶️</button>
        ${currentUser ? `<button class="btn btn-danger btn-sm" onclick="deleteSong('${song.id}')">🗑️</button>` : ''}
      </div>
    </div>
  `;
}

function playSong(embedUrl) {
  if (!embedUrl) return;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `<div class="modal modal-large" style="background: #000;"><button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button><div style="padding-top: 56.25%; position: relative;"><iframe src="${embedUrl}?autoplay=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function saveSong() {
  if (!currentUser) { showToast('Войдите чтобы добавлять', 'warning'); return; }
  const url = elements.songUrl.value.trim();
  const videoId = extractYouTubeId(url);
  if (!videoId) { showToast('Неверная YouTube ссылка', 'error'); return; }
  
  try {
    await supabase.from('playlist').insert([{ youtube_url: url, youtube_id: videoId, title: elements.songTitle.value.trim() || null, added_by: 'user' }]);
    showToast('Трек добавлен! 🎵', 'success');
    closeModal('song-modal');
    loadPlaylist();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

async function deleteSong(songId) {
  if (!currentUser || !confirm('Удалить?')) return;
  try {
    await supabase.from('playlist').delete().eq('id', songId);
    showToast('Удалено', 'success');
    loadPlaylist();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== CHALLENGES ==========

async function loadChallenges() {
  if (!elements.challengesContainer) return;
  elements.challengesContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    if (!data?.length) {
      elements.challengesContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div><p>Пока нет квестов</p></div>';
      return;
    }
    
    elements.challengesContainer.innerHTML = data.map(createChallengeCard).join('');
  } catch (error) {
    elements.challengesContainer.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка</p></div>';
  }
}

function createChallengeCard(c) {
  const labels = { pending: 'Ожидает', in_progress: 'В процессе', completed: 'Выполнен' };
  return `
    <div class="challenge-card fade-in">
      <div class="challenge-header"><h3 class="challenge-title">${escapeHtml(c.title)}</h3><span class="challenge-status ${c.status}">${labels[c.status]}</span></div>
      <p class="challenge-description">${escapeHtml(c.description)}</p>
      ${c.proof_image_url ? `<div class="challenge-proof"><img src="${c.proof_image_url}"></div>` : ''}
      <div class="challenge-footer">
        ${c.due_date ? `<span class="challenge-due">📅 До: ${formatDate(c.due_date, 'DMY', 'ru')}</span>` : ''}
        ${currentUser && c.status !== 'completed' ? `<button class="btn btn-primary btn-sm" onclick="updateChallengeStatus('${c.id}', '${c.status}')">${c.status === 'pending' ? '▶️ Начать' : '✓ Завершить'}</button>` : ''}
      </div>
    </div>
  `;
}

function openChallengeModal() {
  if (!currentUser) { showToast('Войдите чтобы добавлять', 'warning'); openModal('auth-modal'); return; }
  uploadedImages = [];
  elements.challengePreviewContainer.innerHTML = '';
  document.getElementById('challenge-modal-title').textContent = '🎯 Добавить квест';
  elements.challengeTitle.value = '';
  elements.challengeDescription.value = '';
  elements.challengeDueDate.value = '';
  openModal('challenge-modal');
}

function handleChallengeImageSelect(e) {
  if (e.target.files[0]) previewImage(e.target.files[0], elements.challengePreviewContainer);
}

function handleChallengeImageDrop(file) {
  previewImage(file, elements.challengePreviewContainer);
}

async function saveChallenge() {
  if (!currentUser) { showToast('Войдите чтобы сохранять', 'warning'); return; }
  const title = elements.challengeTitle.value.trim();
  const desc = elements.challengeDescription.value.trim();
  if (!title || !desc) { showToast('Заполните поля', 'error'); return; }
  
  try {
    let proofUrl = null;
    if (uploadedImages.length > 0) {
      const path = `challenges/${generateUUID()}_${uploadedImages[0].file.name}`;
      proofUrl = await uploadToStorage('challenges', uploadedImages[0].file, path);
    }
    
    await supabase.from('challenges').insert([{
      title, description: desc, due_date: elements.challengeDueDate.value || null,
      proof_image_url: proofUrl, status: 'pending', created_by: 'user'
    }]);
    
    showToast('Квест добавлен! 🎯', 'success');
    closeModal('challenge-modal');
    loadChallenges();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

async function updateChallengeStatus(id, current) {
  if (!currentUser) { showToast('Войдите чтобы изменять', 'warning'); return; }
  const newStatus = current === 'pending' ? 'in_progress' : 'completed';
  try {
    await supabase.from('challenges').update({ status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }).eq('id', id);
    showToast('Статус обновлён!', 'success');
    loadChallenges();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

// ========== PRIVATE VAULT ==========

async function loadVaultItems() {
  if (!elements.vaultItems) return;
  elements.vaultItems.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    const { data, error } = await supabase.storage.from('private_vault').list('', { limit: 100 });
    if (error) throw error;
    
    if (!data?.length) {
      elements.vaultItems.innerHTML = '<p class="empty-state">Пока пусто</p>';
      return;
    }
    
    const activeTab = document.querySelector('.vault-tab.active')?.dataset.tab || 'photos';
    const isPhotos = activeTab === 'photos';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
    
    const filtered = data.filter(item => {
      const ext = item.name.split('.').pop().toLowerCase();
      return isPhotos ? imageExts.includes(ext) : audioExts.includes(ext);
    });
    
    if (!filtered.length) {
      elements.vaultItems.innerHTML = `<p class="empty-state">${isPhotos ? 'Нет фото' : 'Нет аудио'}</p>`;
      return;
    }
    
    elements.vaultItems.innerHTML = filtered.map(item => {
      const { data: { publicUrl } } = supabase.storage.from('private_vault').getPublicUrl(item.name);
      const ext = item.name.split('.').pop().toLowerCase();
      const isImage = imageExts.includes(ext);
      
      if (isImage) {
        return `<div class="vault-item"><img src="${publicUrl}"><div class="vault-item-actions"><button onclick="downloadFile('${publicUrl}', '${item.name}')">⬇️</button><button onclick="deleteVaultItem('${item.name}')">🗑️</button></div></div>`;
      }
      return `<div class="vault-item" style="display:flex;align-items:center;justify-content:center;background:var(--bg-input);"><audio controls src="${publicUrl}" style="width:100%"></audio><div class="vault-item-actions"><button onclick="downloadFile('${publicUrl}', '${item.name}')">⬇️</button><button onclick="deleteVaultItem('${item.name}')">🗑️</button></div></div>`;
    }).join('');
  } catch (error) {
    elements.vaultItems.innerHTML = '<p class="empty-state" style="color: var(--error);">Ошибка</p>';
  }
}

function handleVaultFileSelect(e) {
  Array.from(e.target.files).forEach(uploadVaultFile);
}

function handleVaultFileDrop(file) {
  uploadVaultFile(file);
}

async function uploadVaultFile(file) {
  if (!currentUser) { showToast('Войдите чтобы загружать', 'warning'); return; }
  try {
    await supabase.storage.from('private_vault').upload(`vault/${generateUUID()}_${file.name}`, file);
    showToast('Файл загружен! 🔐', 'success');
    loadVaultItems();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

async function deleteVaultItem(name) {
  if (!currentUser || !confirm('Удалить?')) return;
  try {
    await supabase.storage.from('private_vault').remove([name]);
    showToast('Удалено', 'success');
    loadVaultItems();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

function downloadFile(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}

// ========== THEME FUNCTIONS ==========

function updateThemeSelection(themeName) {
  const currentTheme = localStorage.getItem('love_letters_theme') || 'classic';
  document.body.setAttribute('data-theme', currentTheme);
  updateThemeSelection(currentTheme);
}

// ========== UTILS ==========

function previewImage(file, container) {
  if (!file.type.startsWith('image/')) { showToast('Выберите изображение', 'error'); return; }
  
  const id = generateUUID();
  uploadedImages.push({ file, id });
  
  const reader = new FileReader();
  reader.onload = e => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;display:inline-block;';
    
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border-color);';
    
    const btn = document.createElement('button');
    btn.className = 'btn-remove-image';
    btn.innerHTML = '✕';
    btn.onclick = () => {
      uploadedImages = uploadedImages.filter(i => i.id !== id);
      wrapper.remove();
    };
    
    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  };
  reader.readAsDataURL(file);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ========== GLOBAL HANDLERS ==========

window.openImageModal = src => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay active';
  modal.innerHTML = `<div class="modal" style="max-width:90%;padding:20px;"><button class="modal-close" style="position:absolute;top:10px;right:10px;" onclick="this.closest('.modal-overlay').remove()">×</button><img src="${src}" style="max-width:100%;max-height:80vh;border-radius:var(--radius-md);"></div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.deleteWish = deleteWish;
window.editWish = editWish;
window.answerPrompt = answerPrompt;
window.playSong = playSong;
window.deleteSong = deleteSong;
window.updateChallengeStatus = updateChallengeStatus;
window.deleteVaultItem = deleteVaultItem;
window.downloadFile = downloadFile;
window.openModal = openModal;
window.closeModal = closeModal;
window.editEvent = id => { showToast('Редактирование событий в разработке', 'info'); };

// ========== START ==========

document.addEventListener('DOMContentLoaded', init);
