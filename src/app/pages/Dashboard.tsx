import { Activity, ArrowUpRight, CheckCircle2, Database, FileText, FolderOpen, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api.js';

interface DiagnosticsData {
  version: string;
  status: string;
  database: string;
  stats: { memories: number; projects: number; users: number };
  mcp: { enabled: boolean; tools: number };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DiagnosticsData | null>(null);

  useEffect(() => {
    apiRequest<DiagnosticsData>('/diagnostics').then(setStats).catch(console.error);
  }, []);

  const cards = [
    { label: '项目空间', value: stats?.stats.projects ?? 0, icon: FolderOpen, tint: 'from-blue-50 to-cyan-50 text-blue-600', meta: '已接入的工作区' },
    { label: '长期记忆', value: stats?.stats.memories ?? 0, icon: FileText, tint: 'from-emerald-50 to-lime-50 text-emerald-600', meta: '可检索上下文' },
    { label: '本地用户', value: stats?.stats.users ?? 0, icon: Users, tint: 'from-violet-50 to-fuchsia-50 text-violet-600', meta: '授权访问身份' },
    { label: 'MCP 工具', value: stats?.mcp.tools ?? 0, icon: Activity, tint: 'from-amber-50 to-orange-50 text-amber-700', meta: 'Agent 可调用能力' },
  ];

  return (
    <div className="page-shell">
      <section className="premium-card relative overflow-hidden p-8 lg:p-10">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-end">
          <div>
            <p className="page-kicker">Memory Operating System</p>
            <h1 className="page-title">把每一次项目推进，都沉淀成可接手的长期记忆。</h1>
            <p className="page-subtitle">本地优先的项目记忆管理台，统一管理项目、知识导入、MCP 工具诊断和 Agent 交接记录。</p>
          </div>
          <div className="rounded-[1.75rem] border border-white/80 bg-white/62 p-5 shadow-inner shadow-white/60">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={22} />
              </span>
              <div>
                <p className="text-sm font-semibold text-stone-950">服务状态</p>
                <p className="text-xs text-stone-500">版本 {stats?.version ?? '-'}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-stone-50/85 p-3">
                <p className="text-xs text-stone-400">运行</p>
                <p className="mt-1 font-semibold text-emerald-600">{stats?.status ?? '-'}</p>
              </div>
              <div className="rounded-2xl bg-stone-50/85 p-3">
                <p className="text-xs text-stone-400">数据库</p>
                <p className={stats?.database === 'connected' ? 'mt-1 font-semibold text-emerald-600' : 'mt-1 font-semibold text-rose-500'}>{stats?.database ?? '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="premium-card premium-card-hover p-6">
            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br ${card.tint}`}>
              <card.icon size={24} />
            </div>
            <p className="text-4xl font-semibold tracking-[-0.05em] text-stone-950">{card.value}</p>
            <div className="mt-3">
              <p className="font-semibold text-stone-700">{card.label}</p>
              <p className="mt-1 text-sm text-stone-400">{card.meta}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="premium-card p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="page-kicker">Next Action</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-stone-950">继续整理项目记忆空间</h2>
              <p className="mt-2 text-sm leading-6 text-stone-500">进入项目列表选择工作区，查看长期记忆、导入文档，或把当前阶段交接写成可检索记录。</p>
            </div>
            <Link to="/projects" className="soft-button shrink-0">
              打开项目
              <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {['项目 brief', '知识导入', 'handoff 交接'].map((item) => (
              <div key={item} className="rounded-3xl border border-stone-100 bg-stone-50/70 p-4 text-sm font-medium text-stone-600">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="premium-card p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-white">
              <Database size={20} />
            </span>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">本地数据底座</h2>
              <p className="text-sm text-stone-500">项目记忆、导入批次、工具诊断统一归档。</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {['本地优先存储', 'MCP 工具可视化', '多项目记忆隔离'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/62 p-3 text-sm text-stone-600">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
