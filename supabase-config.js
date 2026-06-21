/**
 * Supabase Configuration
 * 
 * ИНСТРУКЦИЯ ПО НАСТРОЙКЕ:
 * 1. Создайте проект на https://supabase.com
 * 2. В Settings → API скопируйте URL и anon key
 * 3. Замените значения ниже
 * 4. Создайте таблицы в SQL Editor (см. README)
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://xflededzclvjukddrrhs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmbGVkZWR6Y2x2anVrZGRycmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDI2NjcsImV4cCI6MjA5NjkxODY2N30.VXBNCdeljN56E7Rh5Rt7aEE21uAZRtLJUyA0-PZUa-Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ========== Admin Config ==========
export const ADMIN_EMAIL = 'roman34827@gmail.com'; // Email админа

// ========== Auth Helpers ==========

/**
 * Вход по email/password
 */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  
  // Возвращаем user и session
  return {
    user: data.user,
    session: data.session
  };
}

/**
 * Выход из системы
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Проверка состояния авторизации
 * Сразу проверяет текущую сессию и подписывается на изменения
 */
export async function onAuthStateChanged(callback) {
  // Сначала проверяем текущую сессию
  const { data: { session } } = await supabase.auth.getSession();
  callback(session?.user ?? null);
  
  // Затем подписываемся на изменения
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
    callback(newSession?.user ?? null);
  });
  
  return subscription;
}

/**
 * Получение текущего пользователя
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// В supabase-config.js добавьте retry логику
async function queryWithRetry(query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await query;
      if (result.error) throw result.error;
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}