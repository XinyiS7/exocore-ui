const STORAGE_KEY = 'exo_msg_attachments';
const MAX_ENTRIES = 300;

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // localStorage 可能已满，尝试清理最早的条目后重试
    try {
      const keys = Object.keys(data);
      if (keys.length > 10) {
        const trimmed = {};
        keys.slice(-100).forEach(k => { trimmed[k] = data[k]; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
    } catch {
      console.warn('attachmentStorage: 存储失败，已达到容量上限');
    }
  }
}

/**
 * 将 File 对象数组转换为可持久化的附件数据。
 * 图片文件读取为 base64 data URL，其他文件只保存元数据。
 */
export async function filesToAttachmentData(files) {
  return Promise.all(
    files.map(f => new Promise(resolve => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => resolve({ name: f.name, type: f.type, dataUrl: e.target.result });
        reader.onerror = () => resolve({ name: f.name, type: f.type, dataUrl: null });
        reader.readAsDataURL(f);
      } else {
        resolve({ name: f.name, type: f.type, dataUrl: null });
      }
    }))
  );
}

/**
 * 将附件数据存入 localStorage，以 messageId 为键。
 */
export function saveAttachments(messageId, attachments) {
  if (!messageId || !attachments?.length) return;
  const all = loadAll();
  all[String(messageId)] = attachments.map(a => ({
    name: a.name,
    type: a.type,
    dataUrl: a.dataUrl || null,
  }));
  // 超出上限时裁剪最早的记录
  const keys = Object.keys(all);
  if (keys.length > MAX_ENTRIES) {
    keys.slice(0, keys.length - MAX_ENTRIES).forEach(k => delete all[k]);
  }
  saveAll(all);
}

/**
 * 读取 localStorage 中储存的附件数据，合并到消息数组中。
 * 仅对有 id 的用户消息生效，且优先使用已存储的数据（含 dataUrl）。
 */
export function enrichMessages(messages) {
  const all = loadAll();
  return messages.map(msg => {
    if (!msg.id || msg.role !== 'user') return msg;
    const stored = all[String(msg.id)];
    if (!stored) return msg;
    return {
      ...msg,
      attachments: stored.map(a => ({
        name: a.name,
        type: a.type,
        preview: a.dataUrl || null,
      })),
    };
  });
}
