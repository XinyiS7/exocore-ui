import React from 'react';
import { 
  MessageSquare, BrainCircuit, User, Settings, 
  Plus, Sparkles, LayoutGrid, Users, FolderOpen,
  ArrowRight
} from 'lucide-react';

const QUICK_ACTIONS = [
  {
    tab: 'chat',
    icon: MessageSquare,
    label: '启动新会话',
    desc: '与 AI 节点建立即时链路',
    color: 'text-exo-accent'
  },
  {
    tab: 'project',
    icon: FolderOpen,
    label: '浏览工程项',
    desc: '查看已归档的知识存储',
    color: 'text-blue-400'
  },
  {
    tab: 'council',
    icon: Users,
    label: '召集议会',
    desc: '启动多代理决策流程',
    color: 'text-purple-400'
  },
  {
    tab: 'agent_hub',
    icon: BrainCircuit,
    label: '配置 Agent',
    desc: '调整代理预设与认知模型',
    color: 'text-exo-accent'
  },
];

export default function HomePanel({ setCurrentTab }) {
  const userNick = localStorage.getItem('exo_user_nick') || 'Exo User';

  return (
    <div className="flex-1 h-full overflow-y-auto bg-noise">
      <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col gap-12">

        {/* Hero Section */}
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-exo-accent/40" />
            <div className="label-caps text-exo-accent/60 tracking-[0.4em]">ExoCore Neural Link</div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-extralight tracking-tight text-exo-text">
              Welcome back, <span className="text-exo-accent font-normal">{userNick.toUpperCase()}</span>
            </h1>
            <p className="text-lg text-exo-muted/60 max-w-2xl font-light leading-relaxed">
              您的个人 AI 协作中枢已就绪。所有子系统运行正常，链路延迟 2ms。
            </p>
          </div>
        </div>

        {/* Main Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {QUICK_ACTIONS.map(({ tab, icon: Icon, label, desc, color }) => (
            <button
              key={tab}
              onClick={() => setCurrentTab(tab)}
              className="group relative flex items-center gap-6 p-8 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-exo-accent/[0.03] hover:border-exo-accent/30 transition-all text-left overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                <Icon size={120} />
              </div>

              <div className={`p-4 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                <Icon size={28} />
              </div>

              <div className="flex-1 space-y-1 relative z-10">
                <div className="text-xl font-light tracking-wide text-exo-text group-hover:text-exo-accent transition-colors">{label}</div>
                <div className="text-sm text-exo-muted/50">{desc}</div>
              </div>

              <ArrowRight className="text-exo-muted/20 group-hover:text-exo-accent transition-colors" size={20} />
            </button>
          ))}
        </div>

        {/* System Stats / Bottom Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-t border-white/5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="space-y-1">
            <div className="text-[10px] text-exo-muted/40 uppercase tracking-widest">Active Nodes</div>
            <div className="text-2xl font-light font-mono text-exo-accent">12</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-exo-muted/40 uppercase tracking-widest">Memory Link</div>
            <div className="text-2xl font-light font-mono text-exo-accent">Stable</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-exo-muted/40 uppercase tracking-widest">Core Version</div>
            <div className="text-2xl font-light font-mono text-exo-accent">2.1.92</div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] text-exo-muted/40 uppercase tracking-widest">Uptime</div>
            <div className="text-2xl font-light font-mono text-exo-accent">99.9%</div>
          </div>
        </div>

      </div>
    </div>
  );
}
