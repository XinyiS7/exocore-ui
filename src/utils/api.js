import { API_BASE_URL } from '../config';

export const baseUrl = API_BASE_URL.replace(/\/+$/, '');

export const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] ?? '';

export const MODEL_REGISTRY = [
  { id: 'gemini-3-flash-preview',          label: 'Gemini 3 Flash',        color: '#d36c34', platform: 'gemini' },
  { id: 'gemini-3.1-pro-preview',          label: 'Gemini 3.1 Pro',        color: '#ffbe00', platform: 'gemini' },
  { id: 'gemini-3.5-flash',                label: 'Gemini 3.5 Flash',      color: '#50c30c', platform: 'gemini' },
  { id: 'deepseek-v4-flash',               label: 'DeepSeek V4 Flash',     color: '#0c3ca3', platform: 'deepseek' },
  { id: 'deepseek-v4-pro',                 label: 'DeepSeek V4 Pro',       color: '#ae4fff', platform: 'deepseek' },
];

export const AVAILABLE_MODELS = MODEL_REGISTRY.map(m => m.id);
