import React from 'react';
import { MessageSquare, BrainCircuit, User, Settings } from 'lucide-react';
import CalendarWidget from './CalendarWidget';

const NAV_CARDS = [
  {
    tab: 'chat',
    icon: MessageSquare,
    label: '会话',
    desc: 'AI 对话 · 多代理协作',
  },
  {
    tab: 'agent_hub',
    icon: BrainCircuit,
    label: 'Agent 管理',
    desc: '预设 · 记忆 · 模型配置',
  },
  {
    tab: 'profile',
    icon: User,
    label: '时间线',
    desc: '活动记录 · 内部广播',
  },
  {
    tab: 'settings',
    icon: Settings,
    label: '系统设置',
    desc: '历史 · 记忆库 · 偏好',
  },
];

export default function HomePanel({ setCurrentTab }) {
  return (
    <div className="flex-1 h-full overflow-y-auto scrollbar-hide bg-exo-bg">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 flex flex-col gap-8">

        {/* 页头 */}
        <div>
          <div className="label-caps text-exo-gold/40 mb-2">ExoCore · 控制台</div>
          <h1 className="text-3xl text-exo-text/80" style={{ fontWeight: 200, letterSpacing: '0.06em' }}>
            OVERVIEW
          </h1>
        </div>

        {/* 快捷导航 */}
        <div>
          <div className="label-caps text-exo-muted/50 mb-3">快捷导航</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {NAV_CARDS.map(({ tab, icon: Icon, label, desc }) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className="group flex flex-col items-start gap-4 p-4 bg-exo-surface border border-exo-border/50 rounded-xl gold-line-top hover:border-exo-gold/25 hover:bg-exo-panel transition-all text-left"
              >
                <Icon
                  size={18}
                  className="text-exo-muted/50 group-hover:text-exo-gold transition-colors"
                />
                <div className="space-y-1">
                  <div className="text-sm text-exo-text/80 tracking-wide">{label}</div>
                  <div className="text-xs text-exo-muted/40 leading-relaxed">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-exo-border/40" />

        {/* 日历 & 任务 */}
        <div>
          <div className="label-caps text-exo-muted/50 mb-4">日程 & 任务</div>
          <CalendarWidget />
        </div>

      </div>
    </div>
  );
}
