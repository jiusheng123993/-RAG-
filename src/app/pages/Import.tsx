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
    <div>
      <h1 className="mb-6 text-2xl font-bold">知识导入</h1>
      {message && <div className="mb-4 rounded bg-green-50 p-3 text-green-700">{message}</div>}
      <div className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 font-semibold">选择文件</h2>
        <textarea
          className="mb-4 h-32 w-full rounded border p-3"
          value={filePaths.join('\n')}
          onChange={(event) => setFilePaths(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
          placeholder="每行一个本地文件路径"
        />
        <button onClick={handlePreview} className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">预览</button>
      </div>
      {preview.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 font-semibold">预览 ({preview.length} 个文件)</h2>
          <div className="mb-4 space-y-2">
            {preview.map((item) => (
              <div key={item.file_path} className="flex items-center gap-2 rounded bg-gray-50 p-2">
                <FileText size={16} />
                <span>{item.title}</span>
                <span className={item.exists ? 'text-green-600' : 'text-red-600'}>{item.exists ? '存在' : '缺失'}</span>
              </div>
            ))}
          </div>
          <button onClick={handleImport} className="flex items-center gap-2 rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600">
            <Upload size={20} />
            开始导入
          </button>
        </div>
      )}
    </div>
  );
}
