import { Activity, Database, Server, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../api.js';

interface ToolDefinition {
  name: string;
  description: string;
  required: string[];
}

interface DiagnosticsData {
  version: string;
  status: string;
  database: string;
  stats: { memories: number; projects: number; users: number };
  mcp: { enabled: boolean; tools: number; toolDefinitions: ToolDefinition[] };
}

export default function Diagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);

  useEffect(() => {
    apiRequest<DiagnosticsData>('/diagnostics').then(setDiagnostics).catch(console.error);
  }, []);

  const cards = [
    { title: '服务状态', value: diagnostics?.status ?? '-', icon: Server, tone: 'text-blue-600 bg-blue-50', detail: `版本 ${diagnostics?.version ?? '-'}` },
    { title: '数据库', value: diagnostics?.database ?? '-', icon: Database, tone: diagnostics?.database === 'connected' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50', detail: '本地持久化连接' },
    { title: 'MCP 工具', value: diagnostics?.mcp.enabled ? '已启用' : '已禁用', icon: Wrench, tone: 'text-amber-700 bg-amber-50', detail: `${diagnostics?.mcp.tools ?? 0} 个工具` },
    { title: '统计', value: `${diagnostics?.stats.memories ?? 0} 条记忆`, icon: Activity, tone: 'text-violet-600 bg-violet-50', detail: `${diagnostics?.stats.projects ?? 0} 项目 / ${diagnostics?.stats.users ?? 0} 用户` },
  ];

  return (
    <div className="page-shell">
      <div>
        <p className="page-kicker">System Diagnostics</p>
        <h1 className="page-title">诊断工具</h1>
        <p className="page-subtitle">检查服务、数据库、MCP 工具清单和本地项目记忆运行状态。</p>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="premium-card p-6">
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-3xl ${card.tone}`}>
              <card.icon size={22} />
            </div>
            <p className="text-sm font-medium text-stone-400">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-stone-950">{card.value}</p>
            <p className="mt-2 text-sm text-stone-500">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="premium-card mt-6 p-7">
        <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-kicker">MCP Surface</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">工具清单</h2>
          </div>
          <span className="soft-badge">{diagnostics?.mcp.toolDefinitions.length ?? 0} tools</span>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {(diagnostics?.mcp.toolDefinitions ?? []).map((tool) => (
            <div key={tool.name} className="rounded-3xl border border-stone-100 bg-white/64 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-stone-950">{tool.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-500">{tool.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-500">{tool.required.length} 必填</span>
              </div>
              {tool.required.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tool.required.map((field) => (
                    <span key={field} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">{field}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
