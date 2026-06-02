import { Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api.js';

interface MemoryItem {
  id: string;
  type: string;
  title: string;
  content: string;
  summary: string | null;
  tags: string[] | null;
}

export default function Memories() {
  const { projectId } = useParams();
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    if (projectId) {
      apiRequest<MemoryItem[]>(`/projects/${projectId}/memories`).then(setMemories).catch(console.error);
    }
  }, [projectId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">记忆列表</h1>
        <div className="flex gap-2">
          <Link to={`/projects/${projectId}/import`} className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
            <Upload size={20} />
            导入
          </Link>
          <button className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
            <Download size={20} />
            导出
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {memories.map((memory) => (
          <div key={memory.id} className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold">{memory.title}</h3>
            <p className="mt-2 text-gray-600">{memory.summary ?? memory.content.slice(0, 200)}</p>
            <div className="mt-3 flex gap-2">
              <span className="rounded bg-gray-100 px-2 py-1 text-sm">{memory.type}</span>
              {(memory.tags ?? []).map((tag) => (
                <span key={tag} className="rounded bg-blue-100 px-2 py-1 text-sm text-blue-700">{tag}</span>
              ))}
            </div>
          </div>
        ))}
        {memories.length === 0 && <div className="rounded-lg bg-white p-6 text-gray-500 shadow">暂无记忆，请先导入或创建。</div>}
      </div>
    </div>
  );
}
