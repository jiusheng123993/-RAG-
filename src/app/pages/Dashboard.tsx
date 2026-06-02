import { Activity, FileText, FolderOpen, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
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
    { label: '项目', value: stats?.stats.projects ?? 0, icon: FolderOpen, color: 'bg-blue-500' },
    { label: '记忆', value: stats?.stats.memories ?? 0, icon: FileText, color: 'bg-green-500' },
    { label: '用户', value: stats?.stats.users ?? 0, icon: Users, color: 'bg-purple-500' },
    { label: 'MCP 工具', value: stats?.mcp.tools ?? 0, icon: Activity, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">仪表盘</h1>
      <div className="grid grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg bg-white p-6 shadow">
            <div className={`${card.color} mb-4 flex h-12 w-12 items-center justify-center rounded-lg`}>
              <card.icon className="text-white" size={24} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">服务状态</h2>
        <div className="space-y-2">
          <p>版本: {stats?.version ?? '-'}</p>
          <p>状态: <span className="text-green-500">{stats?.status ?? '-'}</span></p>
          <p>数据库: <span className={stats?.database === 'connected' ? 'text-green-500' : 'text-red-500'}>{stats?.database ?? '-'}</span></p>
        </div>
      </div>
    </div>
  );
}
