import { FileText, Upload } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api.js';

interface PreviewItem {
  file_path: string;
  title: string;
  exists: boolean;
  status: string;
}

interface ImportResult {
  batchId: string;
  successCount: number;
  errorCount: number;
}

export default function ImportPage() {
  const { projectId } = useParams();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [message, setMessage] = useState('');

  async function handlePreview() {
    const data = await apiRequest<{ items: PreviewItem[] }>(`/projects/${projectId}/import/preview`, {
      method: 'POST',
      body: JSON.stringify({ filePaths }),
    });
    setPreview(data.items);
  }

  async function handleImport() {
    const data = await apiRequest<ImportResult>(`/projects/${projectId}/import/execute`, {
      method: 'POST',
      body: JSON.stringify({ items: preview }),
    });
    setMessage(`导入完成：成功 ${data.successCount}，失败 ${data.errorCount}`);
  }

  return (
    <div className="page-shell">
      <div>
        <p className="page-kicker">Knowledge Intake</p>
        <h1 className="page-title">知识导入</h1>
        <p className="page-subtitle">把 Markdown、文本资料和项目文档导入为可检索的长期记忆，供后续 Agent 接手时读取。</p>
      </div>

      {message && <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-700">{message}</div>}

      <div className="premium-card mt-6 p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <Upload size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-stone-950">选择本地文件</h2>
            <p className="text-sm text-stone-500">每行一个路径，预览确认后再写入项目记忆。</p>
          </div>
        </div>
        <textarea
          className="soft-input min-h-40"
          value={filePaths.join('\n')}
          onChange={(event) => setFilePaths(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
          placeholder="每行一个本地文件路径"
        />
        <div className="mt-5 flex justify-end">
          <button onClick={handlePreview} className="soft-button">生成预览</button>
        </div>
      </div>

      {preview.length > 0 && (
        <div className="premium-card mt-6 p-7">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="page-kicker">Preview</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">预览 {preview.length} 个文件</h2>
            </div>
            <button onClick={handleImport} className="soft-button">
              <Upload size={18} />
              开始导入
            </button>
          </div>
          <div className="space-y-3">
            {preview.map((item) => (
              <div key={item.file_path} className="flex items-center justify-between gap-4 rounded-3xl border border-stone-100 bg-white/62 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-50 text-stone-500">
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-800">{item.title}</p>
                    <p className="truncate text-xs text-stone-400">{item.file_path}</p>
                  </div>
                </div>
                <span className={item.exists ? 'rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700' : 'rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600'}>
                  {item.exists ? '存在' : '缺失'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
