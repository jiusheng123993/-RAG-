import { Download, Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (projectId) {
      apiRequest<MemoryItem[]>(`/projects/${projectId}/memories`).then(setMemories).catch(console.error);
    }
  }, [projectId]);

  const filteredMemories = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return memories;
    }
    return memories.filter((memory) => {
      const haystack = [memory.title, memory.summary, memory.content, memory.type, ...(memory.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [memories, query]);

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-kicker">Memory Library</p>
          <h1 className="page-title">记忆列表</h1>
          <p className="page-subtitle">查看当前项目沉淀的长期记忆、任务交接、风险记录与知识导入结果。</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={`/projects/${projectId}/import`} className="soft-button">
            <Upload size={18} />
            导入知识
          </Link>
          <button className="soft-button-secondary">
            <Download size={18} />
            导出
          </button>
        </div>
      </div>

      <div className="premium-card mt-6 p-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input className="soft-input pl-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、摘要、标签或类型" />
        </label>
      </div>

      <div className="mt-6 space-y-4">
        {filteredMemories.map((memory) => (
          <article key={memory.id} className="premium-card premium-card-hover p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="soft-badge bg-stone-950 text-white">{memory.type}</span>
                  {(memory.tags ?? []).slice(0, 5).map((tag) => (
                    <span key={tag} className="soft-badge">{tag}</span>
                  ))}
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">{memory.title}</h3>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-stone-500">{memory.summary ?? memory.content.slice(0, 220)}</p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">已归档上下文</span>
            </div>
          </article>
        ))}
        {filteredMemories.length === 0 && (
          <div className="premium-card p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-stone-50 text-stone-400">
              <Search size={26} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-stone-950">暂无匹配记忆</h2>
            <p className="mt-2 text-sm text-stone-500">可以调整搜索词，或先导入项目文档生成长期记忆。</p>
          </div>
        )}
      </div>
    </div>
  );
}
