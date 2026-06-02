export type ImportItemStatus = 'imported' | 'skipped' | 'failed';

export type ImportBatchStatus = 'completed' | 'failed' | 'partial';

export interface ImportBatchRecord {
  id: string;
  projectId: string;
  rootPath: string;
  status: ImportBatchStatus;
  totalFiles: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  options: Record<string, unknown>;
  createdAt: string;
}

export interface ImportItemRecord {
  id: string;
  batchId: string;
  memoryId: string | null;
  filePath: string;
  status: ImportItemStatus;
  reason: string | null;
  contentHash: string | null;
  createdAt: string;
}
