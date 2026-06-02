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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">诊断工具</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <Server className="text-blue-500" size={24} />
            <h2 className="text-lg font-semibold">服务状态</h2>
          </div>
          <p>版本: {diagnostics?.version ?? '-'}</p>
          <p>状态: <span className="text-green-500">{diagnostics?.status ?? '-'}</span></p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <Database className="text-green-500" size={24} />
            <h2 className="text-lg font-semibold">数据库</h2>
          </div>
          <p>状态: <span className={diagnostics?.database === 'connected' ? 'text-green-500' : 'text-red-500'}>{diagnostics?.database ?? '-'}</span></p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <Wrench className="text-orange-500" size={24} />
            <h2 className="text-lg font-semibold">MCP 工具</h2>
          </div>
          <p>状态: <span className="text-green-500">{diagnostics?.mcp.enabled ? '已启用' : '已禁用'}</span></p>
          <p>工具数量: {diagnostics?.mcp.tools ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center gap-3">
            <Activity className="text-purple-500" size={24} />
            <h2 className="text-lg font-semibold">统计</h2>
          </div>
          <p>项目数: {diagnostics?.stats.projects ?? 0}</p>
          <p>记忆数: {diagnostics?.stats.memories ?? 0}</p>
          <p>用户数: {diagnostics?.stats.users ?? 0}</p>
        </div>
      </div>
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">MCP 工具清单</h2>
        <div className="grid grid-cols-1 gap-3">
          {(diagnostics?.mcp.toolDefinitions ?? []).map((tool) => (
            <div key={tool.name} className="rounded border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-mono text-sm font-semibold text-gray-900">{tool.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{tool.description}</p>
                </div>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{tool.required.length} 必填</span>
              </div>
              {tool.required.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tool.required.map((field) => (
                    <span key={field} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{field}</span>
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
