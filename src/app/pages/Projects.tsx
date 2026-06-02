import { FolderOpen, Plus } from 'lucide-react';
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">项目</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
          <Plus size={20} />
          新建项目
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg bg-white p-6 shadow">
          <input className="mb-4 w-full rounded border p-3" placeholder="项目名称" value={name} onChange={(event) => setName(event.target.value)} required />
          <textarea className="mb-4 w-full rounded border p-3" placeholder="项目描述" value={description} onChange={(event) => setDescription(event.target.value)} />
          <button className="rounded bg-blue-500 px-4 py-2 text-white" type="submit">创建</button>
        </form>
      )}
      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => (
          <button key={project.id} onClick={() => handleSelect(project)} className="rounded-lg bg-white p-6 text-left shadow hover:shadow-lg">
            <FolderOpen className="mb-4 text-blue-500" size={32} />
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="text-sm text-gray-500">{project.description ?? '暂无描述'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
