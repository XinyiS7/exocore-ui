/**
 * 获取 Agent Hub 的手动排序顺序
 */
export const getAgentHubOrder = () => {
  try {
    return JSON.parse(localStorage.getItem('agentHubOrder') || '{}');
  } catch {
    return {};
  }
};

/**
 * 根据手动排序顺序对 Presets 进行排序
 * 如果没有排序记录，则默认按 ID 升序（或者可以保持原序）
 */
export const sortPresets = (presets) => {
  if (!presets || !Array.isArray(presets)) return [];
  const order = getAgentHubOrder();
  
  return [...presets].sort((a, b) => {
    const orderA = order[a.id] !== undefined ? order[a.id] : a.id;
    const orderB = order[b.id] !== undefined ? order[b.id] : b.id;
    return orderA - orderB;
  });
};
