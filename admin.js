/**
 * Love Letters - Admin Panel Script
 * Full CRUD management for all sections
 */

import { supabase, ADMIN_EMAIL } from './supabase-config.js';
import { 
  parseMarkdown, 
  formatDate, 
  showToast, 
  initTheme,
  wishCategories,
  wishStatuses,
  generateUUID,
  extractYouTubeId
} from './utils.js';

// ========== STATE ==========
let currentUser = null;
let currentSection = 'dashboard';
let adminUploadedImages = [];

// ========== INITIALIZATION ==========

async function init() {
  // Load theme
  const currentTheme = localStorage.getItem('love_letters_theme') || 'classic';
  document.body.setAttribute('data-theme', currentTheme);
  
  await checkAuth();
  setupEventListeners();
  loadDashboard();
}

async function checkAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user ?? null;
  
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }
  
  document.getElementById('admin-user-info').textContent = `${currentUser.email} | ${currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}`;
  updateUserInfo();
}

function updateUserInfo() {
  const avatar = document.getElementById('current-user-avatar');
  const email = document.getElementById('current-user-email');
  const role = document.getElementById('current-user-role');
  
  if (avatar && email && role) {
    const initial = currentUser.email?.charAt(0).toUpperCase() || '?';
    avatar.textContent = initial;
    email.textContent = currentUser.email;
    role.textContent = `Роль: ${currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}`;
  }
}

function setupEventListeners() {
  // Theme
  document.getElementById('admin-theme-btn')?.addEventListener('click', () => {
    document.getElementById('admin-theme-modal').classList.add('active');
  });
  
  // Theme tabs
  document.querySelectorAll('#admin-theme-modal .theme-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#admin-theme-modal .theme-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#admin-theme-modal .theme-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
  
  // Theme options
  document.querySelectorAll('#admin-theme-modal .theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      if (theme) {
        localStorage.setItem('love_letters_theme', theme);
        document.body.setAttribute('data-theme', theme);
        showToast(`Тема "${theme}" применена`, 'success');
        document.querySelectorAll('#admin-theme-modal .theme-option').forEach(o => {
          o.classList.toggle('selected', o.dataset.theme === theme);
          const checkmark = o.querySelector('.theme-checkmark');
          if (checkmark) checkmark.style.opacity = o.dataset.theme === theme ? '1' : '0';
        });
      }
    });
  });
  
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      switchSection(item.dataset.section);
    });
  });
  
  // Mobile menu toggle
  document.getElementById('menu-toggle-admin')?.addEventListener('click', () => {
    document.getElementById('admin-sidebar').classList.toggle('active');
  });
  
  // Logout
  document.getElementById('admin-logout-btn')?.addEventListener('click', handleLogout);
  
  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.modal;
      document.getElementById(modalId).classList.remove('active');
    });
  });
  
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
  
  // Save buttons
  document.getElementById('admin-save-memory-btn')?.addEventListener('click', saveAdminMemory);
  document.getElementById('admin-save-wish-btn')?.addEventListener('click', saveAdminWish);
  document.getElementById('admin-save-prompt-btn')?.addEventListener('click', saveAdminPrompt);
  document.getElementById('admin-save-event-btn')?.addEventListener('click', saveAdminEvent);
  document.getElementById('admin-save-song-btn')?.addEventListener('click', saveAdminSong);
  document.getElementById('admin-save-challenge-btn')?.addEventListener('click', saveAdminChallenge);
  
  // Search/Filter
  document.getElementById('memories-search')?.addEventListener('input', debounce(loadMemories, 500));
  document.getElementById('memories-year-filter')?.addEventListener('change', loadMemories);
  document.getElementById('memories-month-filter')?.addEventListener('change', loadMemories);
  document.getElementById('wishes-search')?.addEventListener('input', debounce(loadWishes, 500));
  document.getElementById('wishes-status-filter')?.addEventListener('change', loadWishes);
  document.getElementById('wishes-category-filter')?.addEventListener('change', loadWishes);
  document.getElementById('prompts-target-filter')?.addEventListener('change', loadPrompts);
  document.getElementById('challenges-status-filter')?.addEventListener('change', loadChallenges);
  
  // Memory Image Upload (Drag & Drop)
  const dropZone = document.getElementById('admin-memory-drop-zone');
  const imageInput = document.getElementById('admin-memory-image-input');
  
  if (dropZone && imageInput) {
    dropZone.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => handleAdminMemoryImageSelect(e));
    initDropZone(dropZone, handleAdminMemoryImageDrop);
  }
  
  // Wish Image Upload (Drag & Drop)
  const wishDropZone = document.getElementById('admin-wish-drop-zone');
  const wishImageInput = document.getElementById('admin-wish-image-input');
  
  if (wishDropZone && wishImageInput) {
    wishDropZone.addEventListener('click', () => wishImageInput.click());
    wishImageInput.addEventListener('change', (e) => handleAdminWishImageSelect(e));
    initDropZone(wishDropZone, handleAdminWishImageDrop);
  }
}

// ========== NAVIGATION ==========

window.switchSection = function(sectionName) {
  currentSection = sectionName;
  
  document.querySelectorAll('.admin-section').forEach(section => {
    section.classList.remove('active');
  });
  
  document.getElementById(`${sectionName}-section`)?.classList.add('active');
  
  // Load section data
  switch (sectionName) {
    case 'dashboard': loadDashboard(); break;
    case 'memories': loadMemories(); break;
    case 'wishes': loadWishes(); break;
    case 'prompts': loadPrompts(); break;
    case 'calendar': loadEvents(); break;
    case 'playlist': loadPlaylist(); break;
    case 'challenges': loadChallenges(); break;
    case 'vault': loadVault(); break;
  }
  
  // Close mobile sidebar
  if (window.innerWidth <= 1024) {
    document.getElementById('admin-sidebar').classList.remove('active');
  }
};

async function handleLogout() {
  try {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  } catch (error) {
    showToast('Ошибка выхода: ' + error.message, 'error');
  }
}

// ========== DASHBOARD ==========

async function loadDashboard() {
  try {
    // Load all stats in parallel
    const [memories, wishes, prompts, events, songs, challenges] = await Promise.all([
      supabase.from('memories').select('id', { count: 'exact' }),
      supabase.from('wishes').select('id', { count: 'exact' }),
      supabase.from('prompts').select('id', { count: 'exact' }),
      supabase.from('important_dates').select('id', { count: 'exact' }),
      supabase.from('playlist').select('id', { count: 'exact' }),
      supabase.from('challenges').select('id', { count: 'exact' })
    ]);
    
    document.getElementById('stat-memories').textContent = memories.count || 0;
    document.getElementById('stat-wishes').textContent = wishes.count || 0;
    document.getElementById('stat-prompts').textContent = prompts.count || 0;
    document.getElementById('stat-events').textContent = events.count || 0;
    document.getElementById('stat-songs').textContent = songs.count || 0;
    document.getElementById('stat-challenges').textContent = challenges.count || 0;
    
    // Load activity chart (last 7 days)
    loadActivityChart();
    
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

async function loadActivityChart() {
  const container = document.getElementById('activity-chart');
  if (!container) return;
  
  const days = 7;
  const chartData = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    chartData.push({ date: dateStr, count: 0, day: date.toLocaleDateString('ru', { weekday: 'short' }) });
  }
  
  // Get activities from all tables
  const tables = ['memories', 'wishes', 'playlist', 'challenges'];
  
  for (const table of tables) {
    const { data } = await supabase
      .from(table)
      .select('created_at')
      .gte('created_at', chartData[0].date);
    
    if (data) {
      data.forEach(item => {
        const itemDate = item.created_at.split('T')[0];
        const found = chartData.find(d => d.date === itemDate);
        if (found) found.count++;
      });
    }
  }
  
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  
  container.innerHTML = chartData.map(d => {
    const height = (d.count / maxCount) * 100;
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
        <div style="width: 100%; background: var(--bg-secondary); border-radius: 4px; height: 150px; position: relative; display: flex; align-items: flex-end;">
          <div style="width: 100%; height: ${height}%; background: linear-gradient(to top, var(--accent-primary), var(--accent-secondary)); border-radius: 4px 4px 0 0; transition: height 0.5s;"></div>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${d.day}</span>
        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 600;">${d.count}</span>
      </div>
    `;
  }).join('');
}

// ========== MEMORIES ==========

async function loadMemories() {
  const container = document.getElementById('admin-memories-container');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    let query = supabase.from('memories').select('*').order('memory_date', { ascending: false });
    
    const search = document.getElementById('memories-search')?.value?.trim();
    const year = document.getElementById('memories-year-filter')?.value;
    const month = document.getElementById('memories-month-filter')?.value;
    
    // Поиск по названию ИЛИ тегам
    if (search) {
      const { data: allMemories, error: searchError } = await query;
      if (searchError) throw searchError;
      
      const filtered = allMemories.filter(m => {
        const searchLower = search.toLowerCase();
        const titleMatch = m.title.toLowerCase().includes(searchLower);
        const tagMatch = (m.tags || []).some(tag => tag.toLowerCase().includes(searchLower));
        return titleMatch || tagMatch;
      });
      
      // Применяем фильтры года и месяца
      let result = filtered;
      if (year && year !== 'all') {
        result = result.filter(m => new Date(m.memory_date).getFullYear().toString() === year);
      }
      if (month && month !== 'all') {
        result = result.filter(m => (new Date(m.memory_date).getMonth() + 1).toString() === month);
      }
      
      // Update year filter
      const years = [...new Set(filtered.map(m => new Date(m.memory_date).getFullYear()))].sort((a, b) => b - a);
      const yearFilter = document.getElementById('memories-year-filter');
      if (yearFilter) {
        yearFilter.innerHTML = '<option value="all">Все годы</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        if (year) yearFilter.value = year;
      }
      
      if (!result || result.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📖</div><p>Нет воспоминаний</p></div>';
        return;
      }
      
      container.innerHTML = result.map(m => createAdminMemoryCard(m)).join('');
      return;
    }
    
    // Без поиска - используем обычный запрос
    if (year && year !== 'all') {
      query = query.gte('memory_date', `${year}-01-01`).lte('memory_date', `${year}-12-31`);
    }
    if (month && month !== 'all') {
      query = query.filter('memory_date', 'like', `${year || '%'}-${month.padStart(2, '0')}-%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Update year filter
    const years = [...new Set(data.map(m => new Date(m.memory_date).getFullYear()))].sort((a, b) => b - a);
    const yearFilter = document.getElementById('memories-year-filter');
    if (yearFilter) {
      yearFilter.innerHTML = '<option value="all">Все годы</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
      if (year) yearFilter.value = year;
    }
    
    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📖</div><p>Нет воспоминаний</p></div>';
      return;
    }
    
    container.innerHTML = data.map(m => createAdminMemoryCard(m)).join('');
    
  } catch (error) {
    console.error('Error loading memories:', error);
    container.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка загрузки</p></div>';
  }
}

function createAdminMemoryCard(memory) {
  const images = memory.image_urls || [];
  const tags = memory.tags || [];
  
  let imageHtml = '';
  if (images.length === 1) {
    imageHtml = `<img src="${images[0]}" alt="${escapeHtml(memory.title)}" class="memory-image" onclick="openImageGallery(['${images.join("','")}'], '${escapeHtml(memory.title)}')">`;
  } else if (images.length > 1) {
    imageHtml = `<div class="memory-images-grid">${images.slice(0, 4).map(img => `<img src="${img}" onclick="openImageGallery(['${images.join("','")}'], '${escapeHtml(memory.title)}')">`).join('')}</div>`;
  }
  
  const imageCount = images.length;
  
  return `
    <div class="memory-card fade-in">
      ${imageHtml}
      <div class="memory-content">
        <h3 class="memory-title">${escapeHtml(memory.title)}</h3>
        <div class="memory-date">📅 ${formatDate(memory.memory_date, 'full', 'ru')}</div>
        <div class="memory-text">${parseMarkdown(memory.content)}</div>
        ${tags.length > 0 ? `<div class="memory-tags">${tags.map(tag => `<span class="memory-tag">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="memory-actions">
        <button class="btn btn-secondary" onclick="editMemory('${memory.id}')">✏️ Редактировать</button>
        <button class="btn btn-danger" onclick="deleteMemory('${memory.id}')">🗑️ Удалить</button>
      </div>
    </div>
  `;
}

window.openAdminMemoryModal = function() {
  document.getElementById('admin-memory-modal-title').textContent = '📖 Добавить воспоминание';
  document.getElementById('admin-memory-id').value = '';
  document.getElementById('admin-memory-title').value = '';
  document.getElementById('admin-memory-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('admin-memory-content').value = '';
  document.getElementById('admin-memory-tags').value = '';
  adminUploadedImages = [];
  document.getElementById('admin-memory-preview').innerHTML = '';
  document.getElementById('admin-memory-modal').classList.add('active');
};

window.editMemory = async function(id) {
  try {
    const { data, error } = await supabase.from('memories').select('*').eq('id', id).single();
    if (error) throw error;
    
    document.getElementById('admin-memory-modal-title').textContent = '✏️ Редактировать воспоминание';
    document.getElementById('admin-memory-id').value = data.id;
    document.getElementById('admin-memory-title').value = data.title;
    document.getElementById('admin-memory-date').value = data.memory_date;
    document.getElementById('admin-memory-content').value = data.content;
    document.getElementById('admin-memory-tags').value = (data.tags || []).join(', ');
    adminUploadedImages = [];
    document.getElementById('admin-memory-preview').innerHTML = '';
    
    // Show existing images
    if (data.image_urls && data.image_urls.length > 0) {
      data.image_urls.forEach((url, index) => {
        addExistingImageToPreview(url, index);
      });
    }
    
    document.getElementById('admin-memory-modal').classList.add('active');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

function addExistingImageToPreview(url, index) {
  const preview = document.getElementById('admin-memory-preview');
  const wrapper = document.createElement('div');
  wrapper.className = 'memory-image-preview';
  wrapper.innerHTML = `
    <img src="${url}" alt="Memory image">
    <button class="remove-btn" onclick="removeExistingImage('${url}', event)">×</button>
  `;
  preview.appendChild(wrapper);
}

window.removeExistingImage = function(url, event) {
  event.stopPropagation();
  const preview = document.getElementById('admin-memory-preview');
  const images = preview.querySelectorAll('.memory-image-preview img');
  images.forEach(img => {
    if (img.src === url) {
      img.parentElement.remove();
    }
  });
  // Mark for removal
  if (!adminUploadedImages.toRemove) adminUploadedImages.toRemove = [];
  adminUploadedImages.toRemove.push(url);
};

async function saveAdminMemory() {
  const id = document.getElementById('admin-memory-id').value;
  const title = document.getElementById('admin-memory-title').value.trim();
  const content = document.getElementById('admin-memory-content').value.trim();
  const memoryDate = document.getElementById('admin-memory-date').value;
  const tagsInput = document.getElementById('admin-memory-tags').value.trim();
  
  if (!title || !content || !memoryDate) {
    showToast('Заполните обязательные поля', 'error');
    return;
  }
  
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
  
  try {
    // Upload new images
    let imageUrls = [];
    for (const img of adminUploadedImages) {
      // Очищаем имя файла от недопустимых символов
      const safeFileName = img.file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      
      const path = `memories/${generateUUID()}_${safeFileName}`;
      const url = await uploadToStorage('memories', img.file, path);
      imageUrls.push(url);
    }
    
    // Get existing images (not removed)
    if (id) {
      const { data: existing } = await supabase.from('memories').select('image_urls').eq('id', id).single();
      if (existing?.image_urls) {
        const toRemove = adminUploadedImages.toRemove || [];
        const remainingImages = existing.image_urls.filter(url => !toRemove.includes(url));
        imageUrls = [...remainingImages, ...imageUrls];
      }
    }
    
    const memoryData = {
      title,
      content,
      memory_date: memoryDate,
      tags,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      created_by: 'admin',
      updated_at: new Date().toISOString()
    };
    
    let error;
    if (id) {
      ({ error } = await supabase.from('memories').update(memoryData).eq('id', id));
    } else {
      memoryData.created_at = new Date().toISOString();
      ({ error } = await supabase.from('memories').insert([memoryData]));
    }
    
    if (error) throw error;
    
    showToast('Сохранено! 💕', 'success');
    document.getElementById('admin-memory-modal').classList.remove('active');
    loadMemories();
    loadDashboard();
    
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deleteMemory = async function(id) {
  if (!confirm('Удалить воспоминание?')) return;
  
  try {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) throw error;
    
    showToast('Удалено', 'success');
    loadMemories();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== WISHES ==========

async function loadWishes() {
  const container = document.getElementById('admin-wishes-container');
  if (!container) return;
  
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  try {
    let query = supabase.from('wishes').select('*').order('created_at', { ascending: false });
    
    const search = document.getElementById('wishes-search')?.value?.trim();
    const status = document.getElementById('wishes-status-filter')?.value;
    const category = document.getElementById('wishes-category-filter')?.value;
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Фильтрация на клиенте
    let filtered = data || [];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(w => 
        w.title.toLowerCase().includes(searchLower) || 
        (w.description && w.description.toLowerCase().includes(searchLower))
      );
    }
    
    if (status && status !== 'all') {
      filtered = filtered.filter(w => w.status === status);
    }
    
    if (category && category !== 'all') {
      filtered = filtered.filter(w => w.category === category);
    }
    
    // Update stats
    updateAdminWishStats(filtered);
    
    if (!filtered || filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💫</div><p>Нет желаний</p></div>';
      return;
    }
    
    container.innerHTML = filtered.map(w => createAdminWishCard(w)).join('');
    
  } catch (error) {
    console.error('Error loading wishes:', error);
    container.innerHTML = '<div class="empty-state"><p style="color: var(--error);">Ошибка</p></div>';
  }
}

function updateAdminWishStats(wishes) {
  const planned = wishes.filter(w => w.status === 'planned').length;
  const inProgress = wishes.filter(w => w.status === 'in_progress').length;
  const done = wishes.filter(w => w.status === 'done').length;
  
  document.getElementById('admin-stat-planned').textContent = planned;
  document.getElementById('admin-stat-in-progress').textContent = inProgress;
  document.getElementById('admin-stat-done').textContent = done;
}

function createAdminWishCard(wish) {
  const cat = wishCategories[wish.category] || wishCategories.other;
  const stat = wishStatuses[wish.status] || wishStatuses.planned;
  
  return `
    <div class="wish-card fade-in">
      <div class="wish-header">
        <h3 class="wish-title">${escapeHtml(wish.title)}</h3>
        <span class="wish-category" title="${cat.name}">${cat.icon}</span>
      </div>
      ${wish.description ? `<p class="wish-description">${escapeHtml(wish.description)}</p>` : ''}
      ${wish.image_url ? `<img src="${wish.image_url}" alt="${escapeHtml(wish.title)}" class="wish-image">` : ''}
      <div class="wish-meta">
        <span class="wish-status ${wish.status}" onclick="toggleWishStatus('${wish.id}')" title="Клик для смены статуса">
          ${stat.icon} ${stat.name}
        </span>
        <div class="wish-actions">
          <button class="btn btn-secondary" onclick="editWish('${wish.id}')" title="Редактировать">✏️</button>
          <button class="btn btn-danger" onclick="deleteWish('${wish.id}')" title="Удалить">🗑️</button>
        </div>
      </div>
    </div>
  `;
}

window.openAdminWishModal = function() {
  document.getElementById('admin-wish-modal-title').textContent = '✨ Добавить цель';
  document.getElementById('admin-wish-id').value = '';
  document.getElementById('admin-wish-title').value = '';
  document.getElementById('admin-wish-description').value = '';
  document.getElementById('admin-wish-category').value = 'other';
  document.getElementById('admin-wish-status').value = 'planned';
  adminUploadedImages = [];
  document.getElementById('admin-wish-preview').innerHTML = '';
  document.getElementById('admin-wish-modal').classList.add('active');
};

window.editWish = async function(id) {
  try {
    const { data, error } = await supabase.from('wishes').select('*').eq('id', id).single();
    if (error) throw error;
    
    document.getElementById('admin-wish-modal-title').textContent = '✏️ Редактировать цель';
    document.getElementById('admin-wish-id').value = data.id;
    document.getElementById('admin-wish-title').value = data.title;
    document.getElementById('admin-wish-description').value = data.description || '';
    document.getElementById('admin-wish-category').value = data.category || 'other';
    document.getElementById('admin-wish-status').value = data.status || 'planned';
    adminUploadedImages = [];
    document.getElementById('admin-wish-preview').innerHTML = '';
    
    // Show existing image
    if (data.image_url) {
      addExistingWishImageToPreview(data.image_url);
    }
    
    document.getElementById('admin-wish-modal').classList.add('active');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

function addExistingWishImageToPreview(url) {
  const preview = document.getElementById('admin-wish-preview');
  const wrapper = document.createElement('div');
  wrapper.className = 'memory-image-preview';
  wrapper.innerHTML = `
    <img src="${url}" alt="Wish image">
    <button class="remove-btn" onclick="removeExistingWishImage('${url}', event)">×</button>
  `;
  preview.appendChild(wrapper);
}

window.removeExistingWishImage = function(url, event) {
  event.stopPropagation();
  const preview = document.getElementById('admin-wish-preview');
  const images = preview.querySelectorAll('.memory-image-preview img');
  images.forEach(img => {
    if (img.src === url) {
      img.parentElement.remove();
    }
  });
  // Mark for removal
  if (!adminUploadedImages.toRemove) adminUploadedImages.toRemove = [];
  adminUploadedImages.toRemove.push(url);
};

async function saveAdminWish() {
  const id = document.getElementById('admin-wish-id').value;
  const title = document.getElementById('admin-wish-title').value.trim();
  
  if (!title) {
    showToast('Введите название', 'error');
    return;
  }
  
  try {
    let imageUrl = null;
    
    // Upload new image
    if (adminUploadedImages.length > 0 && adminUploadedImages[0].file) {
      const img = adminUploadedImages[0];
      const safeFileName = img.file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .toLowerCase();
      
      const path = `wishes/${generateUUID()}_${safeFileName}`;
      imageUrl = await uploadToStorage('wishes', img.file, path);
    }
    
    // Get existing image if not removed
    if (id && !imageUrl) {
      const { data: existing } = await supabase.from('wishes').select('image_url').eq('id', id).single();
      if (existing?.image_url) {
        const toRemove = adminUploadedImages.toRemove || [];
        if (!toRemove.includes(existing.image_url)) {
          imageUrl = existing.image_url;
        }
      }
    }
    
    const wishData = {
      title,
      description: document.getElementById('admin-wish-description').value.trim() || null,
      category: document.getElementById('admin-wish-category').value,
      status: document.getElementById('admin-wish-status').value,
      image_url: imageUrl,
      created_by: 'admin',
      updated_at: new Date().toISOString()
    };
    
    let error;
    if (id) {
      ({ error } = await supabase.from('wishes').update(wishData).eq('id', id));
    } else {
      wishData.created_at = new Date().toISOString();
      ({ error } = await supabase.from('wishes').insert([wishData]));
    }
    
    if (error) throw error;
    
    showToast('Сохранено! ✨', 'success');
    document.getElementById('admin-wish-modal').classList.remove('active');
    loadWishes();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deleteWish = async function(id) {
  if (!confirm('Удалить цель?')) return;
  try {
    await supabase.from('wishes').delete().eq('id', id);
    showToast('Удалено', 'success');
    loadWishes();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// Быстрое переключение статуса (циклически)
window.toggleWishStatus = async function(id) {
  try {
    const { data: [wish], error } = await supabase.from('wishes').select('status').eq('id', id).single();
    if (error) throw error;
    
    // Цикл: planned → in_progress → done → planned
    const statusOrder = ['planned', 'in_progress', 'done'];
    const currentIndex = statusOrder.indexOf(wish.status);
    const newStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    
    const { error: updateError } = await supabase
      .from('wishes')
      .update({ 
        status: newStatus, 
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (updateError) throw updateError;
    
    const newStat = wishStatuses[newStatus];
    showToast(`Статус: ${newStat.icon} ${newStat.name}`, 'success');
    loadWishes();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== PROMPTS ==========

async function loadPrompts() {
  const tbody = document.getElementById('prompts-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Загрузка...</td></tr>';
  
  try {
    let query = supabase.from('prompts').select(`
      *,
      responses:prompt_responses(id)
    `).order('created_at', { ascending: false });
    
    const target = document.getElementById('prompts-target-filter')?.value;
    if (target && target !== 'all') query = query.eq('target', target);
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет вопросов</td></tr>';
      return;
    }
    
    const targetLabels = { him: 'Для него', her: 'Для неё', both: 'Общий' };
    
    tbody.innerHTML = data.map(p => `
      <tr>
        <td><div class="content-preview">${escapeHtml(p.question)}</div></td>
        <td><span class="status-badge">${targetLabels[p.target] || p.target}</span></td>
        <td>${p.category || 'general'}</td>
        <td>${p.responses?.length || 0}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon edit" onclick="editPrompt('${p.id}')" title="Редактировать">✏️</button>
            <button class="btn-icon delete" onclick="deletePrompt('${p.id}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading prompts:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Ошибка</td></tr>';
  }
}

window.openAdminPromptModal = function() {
  document.getElementById('admin-prompt-modal-title').textContent = '💭 Добавить вопрос';
  document.getElementById('admin-prompt-id').value = '';
  document.getElementById('admin-prompt-question').value = '';
  document.getElementById('admin-prompt-target').value = 'both';
  document.getElementById('admin-prompt-category').value = 'general';
  document.getElementById('admin-prompt-modal').classList.add('active');
};

window.editPrompt = async function(id) {
  try {
    const { data, error } = await supabase.from('prompts').select('*').eq('id', id).single();
    if (error) throw error;
    
    document.getElementById('admin-prompt-modal-title').textContent = '✏️ Редактировать вопрос';
    document.getElementById('admin-prompt-id').value = data.id;
    document.getElementById('admin-prompt-question').value = data.question;
    document.getElementById('admin-prompt-target').value = data.target || 'both';
    document.getElementById('admin-prompt-category').value = data.category || 'general';
    document.getElementById('admin-prompt-modal').classList.add('active');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

async function saveAdminPrompt() {
  const id = document.getElementById('admin-prompt-id').value;
  const question = document.getElementById('admin-prompt-question').value.trim();
  
  if (!question) {
    showToast('Введите вопрос', 'error');
    return;
  }
  
  try {
    const promptData = {
      question,
      target: document.getElementById('admin-prompt-target').value,
      category: document.getElementById('admin-prompt-category').value.trim() || 'general',
      is_custom: true,
      created_by: 'admin'
    };
    
    let error;
    if (id) {
      ({ error } = await supabase.from('prompts').update(promptData).eq('id', id));
    } else {
      ({ error } = await supabase.from('prompts').insert([promptData]));
    }
    
    if (error) throw error;
    
    showToast('Сохранено! 💭', 'success');
    document.getElementById('admin-prompt-modal').classList.remove('active');
    loadPrompts();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deletePrompt = async function(id) {
  if (!confirm('Удалить вопрос?')) return;
  try {
    await supabase.from('prompts').delete().eq('id', id);
    showToast('Удалено', 'success');
    loadPrompts();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== EVENTS (CALENDAR) ==========

async function loadEvents() {
  const tbody = document.getElementById('events-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Загрузка...</td></tr>';
  
  try {
    const { data, error } = await supabase.from('important_dates').select('*').order('event_date', { ascending: true });
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет событий</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(e => `
      <tr>
        <td>${formatDate(e.event_date, 'DMY', 'ru')}</td>
        <td><strong>${escapeHtml(e.title)}</strong>${e.description ? `<br><small style="color: var(--text-muted);">${escapeHtml(e.description.substring(0, 50))}...</small>` : ''}</td>
        <td>${(e.gift_ideas || []).slice(0, 2).join(', ') || '—'}</td>
        <td>За ${e.reminder_days_before || 3} дн.</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon edit" onclick="editEvent('${e.id}')" title="Редактировать">✏️</button>
            <button class="btn-icon delete" onclick="deleteEvent('${e.id}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading events:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Ошибка</td></tr>';
  }
}

window.openAdminEventModal = function() {
  document.getElementById('admin-event-modal-title').textContent = '📅 Добавить событие';
  document.getElementById('admin-event-id').value = '';
  document.getElementById('admin-event-title').value = '';
  document.getElementById('admin-event-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('admin-event-description').value = '';
  document.getElementById('admin-event-gifts').value = '';
  document.getElementById('admin-event-plans').value = '';
  document.getElementById('admin-event-reminder').value = '3';
  document.getElementById('admin-event-modal').classList.add('active');
};

window.editEvent = async function(id) {
  try {
    const { data, error } = await supabase.from('important_dates').select('*').eq('id', id).single();
    if (error) throw error;
    
    document.getElementById('admin-event-modal-title').textContent = '✏️ Редактировать событие';
    document.getElementById('admin-event-id').value = data.id;
    document.getElementById('admin-event-title').value = data.title;
    document.getElementById('admin-event-date').value = data.event_date;
    document.getElementById('admin-event-description').value = data.description || '';
    document.getElementById('admin-event-gifts').value = (data.gift_ideas || []).join(', ');
    document.getElementById('admin-event-plans').value = data.plans || '';
    document.getElementById('admin-event-reminder').value = data.reminder_days_before || 3;
    document.getElementById('admin-event-modal').classList.add('active');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

async function saveAdminEvent() {
  const id = document.getElementById('admin-event-id').value;
  const title = document.getElementById('admin-event-title').value.trim();
  const eventDate = document.getElementById('admin-event-date').value;
  
  if (!title || !eventDate) {
    showToast('Заполните название и дату', 'error');
    return;
  }
  
  const giftsInput = document.getElementById('admin-event-gifts').value.trim();
  const giftIdeas = giftsInput ? giftsInput.split(',').map(g => g.trim()).filter(g => g) : [];
  
  try {
    const eventData = {
      title,
      event_date: eventDate,
      description: document.getElementById('admin-event-description').value.trim() || null,
      gift_ideas: giftIdeas,
      plans: document.getElementById('admin-event-plans').value.trim() || null,
      reminder_days_before: parseInt(document.getElementById('admin-event-reminder').value) || 3,
      created_by: 'admin',
      updated_at: new Date().toISOString()
    };
    
    let error;
    if (id) {
      ({ error } = await supabase.from('important_dates').update(eventData).eq('id', id));
    } else {
      ({ error } = await supabase.from('important_dates').insert([eventData]));
    }
    
    if (error) throw error;
    
    showToast('Сохранено! 📅', 'success');
    document.getElementById('admin-event-modal').classList.remove('active');
    loadEvents();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deleteEvent = async function(id) {
  if (!confirm('Удалить событие?')) return;
  try {
    await supabase.from('important_dates').delete().eq('id', id);
    showToast('Удалено', 'success');
    loadEvents();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== PLAYLIST ==========

async function loadPlaylist() {
  const tbody = document.getElementById('playlist-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Загрузка...</td></tr>';
  
  try {
    const { data, error } = await supabase.from('playlist').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет треков</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(s => `
      <tr>
        <td><img src="https://img.youtube.com/vi/${s.youtube_id}/default.jpg" alt="Thumbnail"></td>
        <td>${escapeHtml(s.title || 'Без названия')}</td>
        <td>${s.added_by === 'admin' ? '👤 Админ' : '👤 Пользователь'}</td>
        <td>${formatDate(s.created_at, 'DMY', 'ru')}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon delete" onclick="deleteSong('${s.id}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading playlist:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Ошибка</td></tr>';
  }
}

window.openAdminSongModal = function() {
  document.getElementById('admin-song-modal-title').textContent = '🎵 Добавить трек';
  document.getElementById('admin-song-id').value = '';
  document.getElementById('admin-song-url').value = '';
  document.getElementById('admin-song-title').value = '';
  document.getElementById('admin-song-modal').classList.add('active');
};

async function saveAdminSong() {
  const url = document.getElementById('admin-song-url').value.trim();
  const videoId = extractYouTubeId(url);
  
  if (!videoId) {
    showToast('Неверная YouTube ссылка', 'error');
    return;
  }
  
  try {
    const songData = {
      youtube_url: url,
      youtube_id: videoId,
      title: document.getElementById('admin-song-title').value.trim() || null,
      added_by: 'admin'
    };
    
    const { error } = await supabase.from('playlist').insert([songData]);
    if (error) throw error;
    
    showToast('Сохранено! 🎵', 'success');
    document.getElementById('admin-song-modal').classList.remove('active');
    loadPlaylist();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deleteSong = async function(id) {
  if (!confirm('Удалить трек?')) return;
  try {
    await supabase.from('playlist').delete().eq('id', id);
    showToast('Удалено', 'success');
    loadPlaylist();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== CHALLENGES ==========

async function loadChallenges() {
  const tbody = document.getElementById('challenges-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Загрузка...</td></tr>';
  
  try {
    let query = supabase.from('challenges').select('*').order('created_at', { ascending: false });
    
    const status = document.getElementById('challenges-status-filter')?.value;
    if (status && status !== 'all') query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Нет квестов</td></tr>';
      return;
    }
    
    const statusLabels = { pending: 'Ожидает', in_progress: 'В процессе', completed: 'Выполнен' };
    
    tbody.innerHTML = data.map(c => `
      <tr>
        <td><span class="status-badge ${c.status}">${statusLabels[c.status] || c.status}</span></td>
        <td><div class="content-preview">${escapeHtml(c.title)}</div></td>
        <td>${c.due_date ? formatDate(c.due_date, 'DMY', 'ru') : '—'}</td>
        <td>${c.proof_image_url ? '🖼️' : '—'}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon edit" onclick="editChallenge('${c.id}')" title="Редактировать">✏️</button>
            <button class="btn-icon delete" onclick="deleteChallenge('${c.id}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading challenges:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Ошибка</td></tr>';
  }
}

window.openAdminChallengeModal = function() {
  document.getElementById('admin-challenge-modal-title').textContent = '🎯 Добавить квест';
  document.getElementById('admin-challenge-id').value = '';
  document.getElementById('admin-challenge-title').value = '';
  document.getElementById('admin-challenge-description').value = '';
  document.getElementById('admin-challenge-status').value = 'pending';
  document.getElementById('admin-challenge-due-date').value = '';
  document.getElementById('admin-challenge-modal').classList.add('active');
};

window.editChallenge = async function(id) {
  try {
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
    if (error) throw error;
    
    document.getElementById('admin-challenge-modal-title').textContent = '✏️ Редактировать квест';
    document.getElementById('admin-challenge-id').value = data.id;
    document.getElementById('admin-challenge-title').value = data.title;
    document.getElementById('admin-challenge-description').value = data.description;
    document.getElementById('admin-challenge-status').value = data.status || 'pending';
    document.getElementById('admin-challenge-due-date').value = data.due_date || '';
    document.getElementById('admin-challenge-modal').classList.add('active');
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

async function saveAdminChallenge() {
  const id = document.getElementById('admin-challenge-id').value;
  const title = document.getElementById('admin-challenge-title').value.trim();
  const description = document.getElementById('admin-challenge-description').value.trim();
  
  if (!title || !description) {
    showToast('Заполните название и описание', 'error');
    return;
  }
  
  try {
    const challengeData = {
      title,
      description,
      status: document.getElementById('admin-challenge-status').value,
      due_date: document.getElementById('admin-challenge-due-date').value || null,
      created_by: 'admin',
      updated_at: new Date().toISOString()
    };
    
    let error;
    if (id) {
      ({ error } = await supabase.from('challenges').update(challengeData).eq('id', id));
    } else {
      ({ error } = await supabase.from('challenges').insert([challengeData]));
    }
    
    if (error) throw error;
    
    showToast('Сохранено! 🎯', 'success');
    document.getElementById('admin-challenge-modal').classList.remove('active');
    loadChallenges();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
}

window.deleteChallenge = async function(id) {
  if (!confirm('Удалить квест?')) return;
  try {
    await supabase.from('challenges').delete().eq('id', id);
    showToast('Удалено', 'success');
    loadChallenges();
    loadDashboard();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== VAULT (PRIVATE STORAGE) ==========

async function loadVault() {
  const tbody = document.getElementById('vault-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Загрузка...</td></tr>';
  
  try {
    const { data, error } = await supabase.storage.from('private_vault').list('', { limit: 100 });
    if (error) throw error;
    
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
    
    const files = data?.map(f => ({
      ...f,
      type: imageExts.includes(f.name.split('.').pop().toLowerCase()) ? 'photo' : 
            audioExts.includes(f.name.split('.').pop().toLowerCase()) ? 'audio' : 'other'
    })) || [];
    
    // Update stats
    const photos = files.filter(f => f.type === 'photo').length;
    const audio = files.filter(f => f.type === 'audio').length;
    document.getElementById('stat-vault-photos').textContent = photos;
    document.getElementById('stat-vault-audio').textContent = audio;
    
    if (!files.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Пусто</td></tr>';
      return;
    }
    
    tbody.innerHTML = files.map(f => `
      <tr>
        <td>${f.type === 'photo' ? '📷' : f.type === 'audio' ? '🎤' : '📄'}</td>
        <td><div class="content-preview">${escapeHtml(f.name)}</div></td>
        <td>${(f.metadata?.size / 1024).toFixed(1)} KB</td>
        <td>${formatDate(f.created_at, 'DMY', 'ru')}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-icon edit" onclick="downloadVaultFile('${f.name}')" title="Скачать">⬇️</button>
            <button class="btn-icon delete" onclick="deleteVaultFile('${f.name}')" title="Удалить">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading vault:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="color: var(--error);">Ошибка</td></tr>';
  }
}

window.downloadVaultFile = async function(name) {
  const { data: { publicUrl } } = supabase.storage.from('private_vault').getPublicUrl(name);
  const a = document.createElement('a');
  a.href = publicUrl;
  a.download = name;
  a.click();
};

window.deleteVaultFile = async function(name) {
  if (!confirm('Удалить файл?')) return;
  try {
    await supabase.storage.from('private_vault').remove([name]);
    showToast('Удалено', 'success');
    loadVault();
  } catch (error) {
    showToast('Ошибка: ' + error.message, 'error');
  }
};

// ========== USER STATS ==========

async function loadUserStats() {
  const container = document.getElementById('user-stats');
  if (!container) return;
  
  try {
    const [memories, wishes, responses, events, songs, challenges] = await Promise.all([
      supabase.from('memories').select('created_by'),
      supabase.from('wishes').select('created_by'),
      supabase.from('prompt_responses').select('answered_by'),
      supabase.from('important_dates').select('created_by'),
      supabase.from('playlist').select('added_by'),
      supabase.from('challenges').select('created_by')
    ]);
    
    const adminCount = [
      ...(memories.data || []).filter(m => m.created_by === 'admin').length,
      ...(wishes.data || []).filter(w => w.created_by === 'admin').length,
      ...(responses.data || []).filter(r => r.answered_by === 'admin').length,
      ...(events.data || []).filter(e => e.created_by === 'admin').length,
      ...(songs.data || []).filter(s => s.added_by === 'admin').length,
      ...(challenges.data || []).filter(c => c.created_by === 'admin').length
    ].reduce((a, b) => a + b, 0);
    
    const userCount = [
      ...(memories.data || []).filter(m => m.created_by === 'user').length,
      ...(wishes.data || []).filter(w => w.created_by === 'user').length,
      ...(responses.data || []).filter(r => r.answered_by === 'user').length,
      ...(events.data || []).filter(e => e.created_by === 'user').length,
      ...(songs.data || []).filter(s => s.added_by === 'user').length,
      ...(challenges.data || []).filter(c => c.created_by === 'user').length
    ].reduce((a, b) => a + b, 0);
    
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div class="card" style="text-align: center;">
          <div style="font-size: 2.5rem; color: var(--accent-primary); font-weight: 700;">${adminCount}</div>
          <div style="color: var(--text-secondary);">Действий админа</div>
        </div>
        <div class="card" style="text-align: center;">
          <div style="font-size: 2.5rem; color: var(--success); font-weight: 700;">${userCount}</div>
          <div style="color: var(--text-secondary);">Действий пользователя</div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error loading user stats:', error);
    container.innerHTML = '<p class="empty-state" style="color: var(--error);">Ошибка загрузки</p>';
  }
}

// ========== IMAGE UPLOAD HELPERS ==========

function handleAdminMemoryImageSelect(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    
    const id = generateUUID();
    adminUploadedImages.push({ file, id });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('admin-memory-preview');
      const wrapper = document.createElement('div');
      wrapper.className = 'memory-image-preview';
      wrapper.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="remove-btn" type="button">×</button>
      `;
      
      const removeBtn = wrapper.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => {
        adminUploadedImages = adminUploadedImages.filter(img => img.id !== id);
        wrapper.remove();
      });
      
      preview.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
  
  e.target.value = '';
}

function handleAdminMemoryImageDrop(e, dropZone) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;
  
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    
    const id = generateUUID();
    adminUploadedImages.push({ file, id });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('admin-memory-preview');
      const wrapper = document.createElement('div');
      wrapper.className = 'memory-image-preview';
      wrapper.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <button class="remove-btn" type="button">×</button>
      `;
      
      const removeBtn = wrapper.querySelector('.remove-btn');
      removeBtn.addEventListener('click', () => {
        adminUploadedImages = adminUploadedImages.filter(img => img.id !== id);
        wrapper.remove();
      });
      
      preview.appendChild(wrapper);
    };
    reader.readAsDataURL(file);
  });
}

function handleAdminWishImageSelect(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  
  // Only allow one image for wishes
  const file = files[0];
  if (!file.type.startsWith('image/')) return;
  
  const id = generateUUID();
  adminUploadedImages = [{ file, id }]; // Replace any existing
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('admin-wish-preview');
    preview.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'memory-image-preview';
    wrapper.innerHTML = `
      <img src="${e.target.result}" alt="Preview">
      <button class="remove-btn" type="button">×</button>
    `;
    
    const removeBtn = wrapper.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      adminUploadedImages = [];
      wrapper.remove();
    });
    
    preview.appendChild(wrapper);
  };
  reader.readAsDataURL(file);
  
  e.target.value = '';
}

function handleAdminWishImageDrop(e, dropZone) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;
  
  // Only allow one image for wishes
  const file = files[0];
  if (!file.type.startsWith('image/')) return;
  
  const id = generateUUID();
  adminUploadedImages = [{ file, id }]; // Replace any existing
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('admin-wish-preview');
    preview.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'memory-image-preview';
    wrapper.innerHTML = `
      <img src="${e.target.result}" alt="Preview">
      <button class="remove-btn" type="button">×</button>
    `;
    
    const removeBtn = wrapper.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      adminUploadedImages = [];
      wrapper.remove();
    });
    
    preview.appendChild(wrapper);
  };
  reader.readAsDataURL(file);
}

function initDropZone(dropZone, onDrop) {
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
  
  dropZone.addEventListener('drop', (e) => onDrop(e, dropZone), false);
}

async function uploadToStorage(bucket, file, path) {
  // Очищаем имя файла от недопустимых символов
  const safeFileName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // Заменяем все недопустимые символы на _
    .replace(/_{2,}/g, '_')            // Убираем множественные _
    .toLowerCase();                    // Приводим к нижнему регистру
  
  const safePath = path.substring(0, path.lastIndexOf('/')) + '/' + safeFileName;
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(safePath, file, { upsert: true });
  
  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(safePath);
  
  return publicUrl;
}

// ========== IMAGE GALLERY ==========

let currentGalleryImages = [];
let currentGalleryIndex = 0;

window.openImageGallery = function(imageUrls, title) {
  if (!imageUrls || imageUrls.length === 0) return;
  
  currentGalleryImages = imageUrls;
  currentGalleryIndex = 0;
  
  const modal = document.getElementById('admin-image-gallery-modal');
  const currentImg = document.getElementById('gallery-current-image');
  const counter = document.getElementById('gallery-counter');
  const titleEl = document.getElementById('gallery-title');
  const thumbnails = document.getElementById('gallery-thumbnails');
  
  // Set title
  titleEl.textContent = title || 'Воспоминание';
  
  // Show first image
  updateGalleryImage();
  
  // Create thumbnails
  thumbnails.innerHTML = imageUrls.map((url, idx) => `
    <img src="${url}" 
         class="gallery-thumbnail ${idx === 0 ? 'active' : ''}"
         onclick="goToImage(${idx})"
         alt="Thumbnail ${idx + 1}">
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  
  // Block body scroll
  document.body.style.overflow = 'hidden';
};

window.closeImageGallery = function() {
  const modal = document.getElementById('admin-image-gallery-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
};

window.navigateGallery = function(direction) {
  currentGalleryIndex += direction;
  
  if (currentGalleryIndex < 0) {
    currentGalleryIndex = currentGalleryImages.length - 1;
  } else if (currentGalleryIndex >= currentGalleryImages.length) {
    currentGalleryIndex = 0;
  }
  
  updateGalleryImage();
};

window.goToImage = function(index) {
  currentGalleryIndex = index;
  updateGalleryImage();
};

function updateGalleryImage() {
  const currentImg = document.getElementById('gallery-current-image');
  const counter = document.getElementById('gallery-counter');
  const thumbnails = document.querySelectorAll('.gallery-thumbnail');
  
  currentImg.src = currentGalleryImages[currentGalleryIndex];
  counter.textContent = `${currentGalleryIndex + 1} / ${currentGalleryImages.length}`;
  
  // Update active thumbnail
  thumbnails.forEach((thumb, idx) => {
    thumb.classList.toggle('active', idx === currentGalleryIndex);
  });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('admin-image-gallery-modal');
  if (!modal.classList.contains('active')) return;
  
  if (e.key === 'Escape') {
    closeImageGallery();
  } else if (e.key === 'ArrowLeft') {
    navigateGallery(-1);
  } else if (e.key === 'ArrowRight') {
    navigateGallery(1);
  }
});

// ========== UTILS ==========

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

// ========== START ==========

document.addEventListener('DOMContentLoaded', init);
