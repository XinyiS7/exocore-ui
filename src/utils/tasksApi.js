// src/utils/tasksApi.js
import { baseUrl, getCsrfToken } from './api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken(),
});

const jsonReq = (method, url, body) =>
  fetch(url, {
    method,
    headers: authHeaders(),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

export const fetchEntries = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${baseUrl}/api/tasks/entries/${qs ? '?' + qs : ''}`, {
    credentials: 'include',
  }).then(r => r.json());
};

export const createEntry  = (data)     => jsonReq('POST',   `${baseUrl}/api/tasks/entries/`,             data).then(r => r.json());
export const updateEntry  = (id, data) => jsonReq('PATCH',  `${baseUrl}/api/tasks/entries/${id}/`,       data).then(r => r.json());
export const deleteEntry  = (id)       => jsonReq('DELETE', `${baseUrl}/api/tasks/entries/${id}/`);
export const completeEntry= (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/complete/`, {}).then(r => r.json());
export const suspendEntry = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/suspend/`,  {}).then(r => r.json());
export const resumeEntry  = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/resume/`,   {}).then(r => r.json());
export const syncGcal     = (id)       => jsonReq('POST',   `${baseUrl}/api/tasks/entries/${id}/gcal/`,     {}).then(r => r.json());
export const unsyncGcal   = (id)       => jsonReq('DELETE', `${baseUrl}/api/tasks/entries/${id}/gcal/`);
export const fetchCompletions = (entryId) =>
  fetch(`${baseUrl}/api/tasks/completions/?entry=${entryId}`, { credentials: 'include' }).then(r => r.json());
