import { ArrowRight, FolderOpen, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api.js';
import { type Project, useProjectStore } from '../stores/projectStore.js';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const navigate = useNavigate();
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);

  useEffect(() => {
    apiRequest<Project[]>('/projects').then(setProjects).catch(console.error);
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const project = await apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    setProjects([project, ...projects]);
    setShowForm(false);
    setName('');
    setDescription('');
  }

  function handleSelect(project: Project) {
    setCurrentProject(project);
    navigate(`/projects/${project.id}/memories`);
  }

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="page-kicker">Project Spaces</p>
          <h1 className="page-title">项目空间</h1>
          <p className="page-subtitle">每个项目都是独立的记忆容器，用来沉淀规则、架构、测试记录、交接和知识导入。</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="soft-button">
          <Plus size={18} />
          新建项目
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="premium-card mt-6 p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">项目名称</span>
              <input className="soft-input" placeholder="例如：个人本地知识库" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-stone-700">项目描述</span>
              <textarea className="soft-input min-h-[3rem]" placeholder="这个项目解决什么问题" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <button className="soft-button" type="submit">创建</button>
          </div>
        </form>
      )}

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <button key={project.id} onClick={() => handleSelect(project)} className="premium-card premium-card-hover group overflow-hidden p-6 text-left">
            <div className="mb-7 flex items-start justify-between gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700">
                <FolderOpen size={24} />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-stone-400 group-hover:bg-stone-950 group-hover:text-white">
                <ArrowRight size={18} />
              </span>
            </div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">{project.name}</h3>
            <p className="mt-3 min-h-[3rem] text-sm leading-6 text-stone-500">{project.description ?? '暂无描述，点击进入管理这个项目的长期记忆。'}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="soft-badge">记忆空间</span>
              <span className="soft-badge">本地优先</span>
            </div>
          </button>
        ))}
        {projects.length === 0 && (
          <div className="premium-card col-span-full p-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-700">
              <FolderOpen size={28} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-stone-950">还没有项目空间</h2>
            <p className="mt-2 text-sm text-stone-500">创建第一个项目后，就可以导入知识、记录 handoff 和管理长期记忆。</p>
          </div>
        )}
      </div>
    </div>
  );
}
