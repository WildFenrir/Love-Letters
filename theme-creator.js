// ========== THEME CREATOR SYSTEM ==========

let themeCreatorData = {
  name: '',
  colors: {
    bgPrimary: '#f5f3ff',
    bgCard: '#ffffff',
    textPrimary: '#1a0f2e',
    accentPrimary: '#6b11cb',
    accentSecondary: '#a855f7',
    border: '#d0c7e3'
  },
  texture: 'none',
  animations: {
    buttons: true,
    cards: false,
    cursor: false
  }
};

/**
 * Инициализация системы создания тем
 */
function initThemeCreator() {
  console.log('🎨 Theme Creator init - START');
  
  const createThemeBtn = document.getElementById('create-theme-btn');
  const themeCreatorOverlay = document.getElementById('theme-creator-overlay');
  const themeCreatorClose = document.getElementById('theme-creator-close');
  const themeCancelBtn = document.getElementById('theme-cancel-btn');
  const themeSaveBtn = document.getElementById('theme-save-btn');
  const themeTabs = document.querySelectorAll('.theme-tab');
  const themeTabContents = document.querySelectorAll('.theme-tab-content');
  
  console.log('🎨 Elements:', {
    createThemeBtn: !!createThemeBtn,
    themeCreatorOverlay: !!themeCreatorOverlay,
    themeTabs: themeTabs.length,
    themeTabContents: themeTabContents.length
  });
  
  if (!themeCreatorOverlay) {
    console.warn('⚠️ Theme creator overlay not found');
    return;
  }
  
  // Вкладки - инициализируем всегда если есть
  if (themeTabs.length > 0) {
    console.log('🎨 Initializing tabs...');
    themeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        console.log('🎨 Tab clicked:', tabId);
        
        // Переключение активной вкладки
        themeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Переключение контента
        if (themeTabContents.length > 0) {
          themeTabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
              content.classList.add('active');
              console.log('🎨 Content activated:', content.id);
            }
          });
        }
        
        // Загрузка кастомных тем
        if (tabId === 'custom-themes') {
          console.log('🎨 Loading custom themes...');
          loadCustomThemes();
        }
      });
    });
    console.log('✅ Theme tabs initialized');
  } else {
    console.warn('⚠️ No theme tabs found');
  }
  
  // Вкладки - инициализируем всегда если есть
  if (themeTabs.length > 0) {
    console.log('🎨 Initializing tabs...');
    themeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        console.log('🎨 Tab clicked:', tabId);
        
        // Переключение активной вкладки
        themeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Переключение контента
        if (themeTabContents.length > 0) {
          themeTabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tabId) {
              content.classList.add('active');
              console.log('🎨 Content activated:', content.id);
            }
          });
        }
        
        // Загрузка кастомных тем
        if (tabId === 'custom-themes') {
          console.log('🎨 Loading custom themes...');
          loadCustomThemes();
        }
      });
    });
    console.log('✅ Theme tabs initialized');
  } else {
    console.warn('⚠️ No theme tabs found');
  }
  
  if (!createThemeBtn) {
    console.log('ℹ️ Create theme button not found (normal for some pages)');
    return;
  }
  
  // Открытие редактора тем
  createThemeBtn.addEventListener('click', () => {
    console.log('🎨 Opening theme creator...');
    themeCreatorOverlay.classList.add('active');
    resetThemeCreator();
  });
  
  // Закрытие редактора
  if (themeCreatorClose) {
    themeCreatorClose.addEventListener('click', () => {
      themeCreatorOverlay.classList.remove('active');
    });
  }
  
  if (themeCancelBtn) {
    themeCancelBtn.addEventListener('click', () => {
      themeCreatorOverlay.classList.remove('active');
    });
  }
  
  themeCreatorOverlay.addEventListener('click', (e) => {
    if (e.target === themeCreatorOverlay) {
      themeCreatorOverlay.classList.remove('active');
    }
  });
  
  // Color pickers
  const colorPickers = document.querySelectorAll('.color-picker-item input[type="color"]');
  colorPickers.forEach(picker => {
    picker.addEventListener('input', () => {
      updateThemePreview();
    });
  });
  
  // Texture options
  const textureOptions = document.querySelectorAll('.texture-option');
  textureOptions.forEach(option => {
    option.addEventListener('click', () => {
      textureOptions.forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      themeCreatorData.texture = option.dataset.texture;
      updateThemePreview();
    });
  });
  
  // Animation checkboxes
  const animCheckboxes = document.querySelectorAll('.animation-option input[type="checkbox"]');
  animCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateThemePreview();
    });
  });
  
  // Сохранение темы
  if (themeSaveBtn) {
    themeSaveBtn.addEventListener('click', saveCustomTheme);
  }
  
  console.log('✅ Theme Creator initialized - END');
}

/**
 * Сброс редактора тем
 */
function resetThemeCreator() {
  document.getElementById('theme-name-input').value = '';
  document.getElementById('color-bg-primary').value = '#f5f3ff';
  document.getElementById('color-bg-card').value = '#ffffff';
  document.getElementById('color-text-primary').value = '#1a0f2e';
  document.getElementById('color-accent-primary').value = '#6b11cb';
  document.getElementById('color-accent-secondary').value = '#a855f7';
  document.getElementById('color-border').value = '#d0c7e3';
  
  document.querySelectorAll('.texture-option').forEach(o => o.classList.remove('selected'));
  document.querySelector('.texture-option[data-texture="none"]').classList.add('selected');
  
  document.getElementById('anim-buttons').checked = true;
  document.getElementById('anim-cards').checked = false;
  document.getElementById('anim-cursor').checked = false;
  
  themeCreatorData = {
    name: '',
    colors: {
      bgPrimary: '#f5f3ff',
      bgCard: '#ffffff',
      textPrimary: '#1a0f2e',
      accentPrimary: '#6b11cb',
      accentSecondary: '#a855f7',
      border: '#d0c7e3'
    },
    texture: 'none',
    animations: { buttons: true, cards: false, cursor: false }
  };
  
  updateThemePreview();
}

/**
 * Обновление предпросмотра
 */
function updateThemePreview() {
  const previewBox = document.getElementById('theme-preview-box');
  if (!previewBox) return;
  
  const colors = {
    bgPrimary: document.getElementById('color-bg-primary').value,
    bgCard: document.getElementById('color-bg-card').value,
    textPrimary: document.getElementById('color-text-primary').value,
    accentPrimary: document.getElementById('color-accent-primary').value,
    accentSecondary: document.getElementById('color-accent-secondary').value,
    border: document.getElementById('color-border').value
  };
  
  const texture = document.querySelector('.texture-option.selected')?.dataset.texture || 'none';
  
  // Применяем стили к предпросмотру
  previewBox.style.background = colors.bgPrimary;
  
  // Добавляем текстуру
  let pattern = 'none';
  if (texture === 'dots') {
    pattern = `radial-gradient(${colors.accentPrimary}33 1px, transparent 1px)`;
  } else if (texture === 'grid') {
    pattern = `linear-gradient(${colors.accentPrimary}33 1px, transparent 1px), linear-gradient(90deg, ${colors.accentPrimary}33 1px, transparent 1px)`;
  } else if (texture === 'carbon') {
    pattern = 'repeating-linear-gradient(45deg, #2a2a2a 0, #2a2a2a 2px, #1a1a1a 2px, #1a1a1a 4px)';
  } else if (texture === 'waves') {
    pattern = `repeating-linear-gradient(90deg, transparent, transparent 10px, ${colors.accentPrimary}1a 10px, ${colors.accentPrimary}1a 20px)`;
  }
  
  previewBox.style.backgroundImage = pattern !== 'none' ? pattern : 'none';
  if (pattern !== 'none') {
    previewBox.style.backgroundSize = texture === 'grid' ? '30px 30px' : '20px 20px';
  }
  
  // Обновляем карточку в предпросмотре
  const previewCard = previewBox.querySelector('.preview-card');
  if (previewCard) {
    previewCard.style.background = colors.bgCard;
    previewCard.style.border = `1px solid ${colors.border}`;
    previewCard.querySelector('h4').style.color = colors.textPrimary;
    previewCard.querySelector('p').style.color = colors.textPrimary + '99';
    
    const btn = previewCard.querySelector('.btn');
    btn.style.background = `linear-gradient(135deg, ${colors.accentPrimary}, ${colors.accentSecondary})`;
  }
}

/**
 * Сохранение кастомной темы
 */
async function saveCustomTheme() {
  const themeName = document.getElementById('theme-name-input').value.trim();
  
  if (!themeName) {
    showToast('Введите название темы!', 'warning');
    return;
  }
  
  const customTheme = {
    id: 'custom_' + Date.now(),
    name: themeName,
    colors: {
      bgPrimary: document.getElementById('color-bg-primary').value,
      bgCard: document.getElementById('color-bg-card').value,
      textPrimary: document.getElementById('color-text-primary').value,
      accentPrimary: document.getElementById('color-accent-primary').value,
      accentSecondary: document.getElementById('color-accent-secondary').value,
      border: document.getElementById('color-border').value
    },
    texture: document.querySelector('.texture-option.selected')?.dataset.texture || 'none',
    animations: {
      buttons: document.getElementById('anim-buttons').checked,
      cards: document.getElementById('anim-cards').checked,
      cursor: document.getElementById('anim-cursor').checked
    },
    createdAt: new Date().toISOString()
  };
  
  // Сохраняем в localStorage
  const customThemes = JSON.parse(localStorage.getItem('customThemes') || '[]');
  customThemes.push(customTheme);
  localStorage.setItem('customThemes', JSON.stringify(customThemes));
  
  showToast('Тема сохранена! 🎨', 'success');
  
  // Закрываем редактор
  document.getElementById('theme-creator-overlay').classList.remove('active');
  
  // Обновляем список кастомных тем
  loadCustomThemes();
}

/**
 * Загрузка кастомных тем
 */
function loadCustomThemes() {
  const container = document.getElementById('custom-themes-list');
  if (!container) return;
  
  const customThemes = JSON.parse(localStorage.getItem('customThemes') || '[]');
  
  if (customThemes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; padding: 30px;">
        <div class="empty-state-icon">🎨</div>
        <p>Пока нет своих тем</p>
        <p style="font-size: 0.85rem; margin-top: 10px;">Создайте первую тему!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = customThemes.map(theme => `
    <div class="theme-option custom-theme" data-theme-id="${theme.id}" data-theme-name="${theme.name}">
      <div class="theme-option-preview" style="background: ${theme.colors.bgPrimary};"></div>
      <div class="theme-option-name">${escapeHtml(theme.name)}</div>
      <div class="theme-option-desc">Ваша тема</div>
      <div class="theme-checkmark">✓</div>
    </div>
  `).join('');
  
  // Добавляем обработчики кликов
  container.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
      const themeId = option.dataset.themeId;
      applyCustomTheme(themeId);
    });
  });
}

/**
 * Применение кастомной темы
 */
function applyCustomTheme(themeId) {
  const customThemes = JSON.parse(localStorage.getItem('customThemes') || '[]');
  const theme = customThemes.find(t => t.id === themeId);
  
  if (!theme) return;
  
  // Создаём CSS переменные для темы
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', theme.colors.bgPrimary);
  root.style.setProperty('--bg-card', theme.colors.bgCard);
  root.style.setProperty('--text-primary', theme.colors.textPrimary);
  root.style.setProperty('--accent-primary', theme.colors.accentPrimary);
  root.style.setProperty('--accent-secondary', theme.colors.accentSecondary);
  root.style.setProperty('--border-color', theme.colors.border);
  
  // Применяем текстуру
  if (theme.texture !== 'none') {
    let pattern = 'none';
    if (theme.texture === 'dots') {
      pattern = `radial-gradient(${theme.colors.accentPrimary}33 1px, transparent 1px)`;
      root.style.setProperty('--bg-pattern', pattern);
      root.style.setProperty('--bg-pattern-size', '20px 20px');
    } else if (theme.texture === 'grid') {
      pattern = `linear-gradient(${theme.colors.accentPrimary}33 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.accentPrimary}33 1px, transparent 1px)`;
      root.style.setProperty('--bg-pattern', pattern);
      root.style.setProperty('--bg-pattern-size', '30px 30px');
    }
  }
  
  // Применяем анимации
  if (theme.animations.buttons) {
    root.style.setProperty('--btn-animation', 'transform 0.2s, box-shadow 0.2s');
  }
  
  localStorage.setItem('userTheme', themeId);
  showToast('Тема применена! 🎨', 'success');
}

/**
 * Экспорт темы в CSS
 */
function exportThemeToCSS(theme) {
  return `
:root[data-theme="${theme.id}"] {
  --bg-primary: ${theme.colors.bgPrimary};
  --bg-card: ${theme.colors.bgCard};
  --text-primary: ${theme.colors.textPrimary};
  --accent-primary: ${theme.colors.accentPrimary};
  --accent-secondary: ${theme.colors.accentSecondary};
  --border-color: ${theme.colors.border};
}`;
}

/**
 * Экспорт в глобальную область
 */
window.initThemeCreator = initThemeCreator;
window.applyCustomTheme = applyCustomTheme;
window.loadCustomThemes = loadCustomThemes;

console.log('🎨 Theme Creator module loaded');

// Авто-инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎨 DOM loaded - auto init theme creator');
  setTimeout(() => initThemeCreator(), 100);
});

