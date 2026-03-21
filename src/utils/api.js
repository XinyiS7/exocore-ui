import { API_BASE_URL } from '../config';

export const baseUrl = API_BASE_URL.replace(/\/+$/, '');

export const getCsrfToken = () =>
  document.cookie.split('; ').find(r => r.startsWith('csrftoken='))?.split('=')[1] ?? '';

export const AVAILABLE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'deepseek-reasoner',
  'deepseek-chat',
];
