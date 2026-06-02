export const memoryTypes = [
  'project_overview',
  'architecture',
  'module_boundary',
  'coding_rule',
  'risk',
  'decision',
  'handoff',
  'test_record',
  'known_issue',
  'do_not_touch',
  'extension_point',
  'command',
  'knowledge',
  'document'
] as const;

export type MemoryType = (typeof memoryTypes)[number];

export const memoryStatuses = ['active', 'archived'] as const;

export type MemoryStatus = (typeof memoryStatuses)[number];

export interface MemoryRecord {
  id: string;
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  summary: string | null;
  source: string;
  sourcePath: string | null;
  contentHash: string | null;
  tags: string[];
  status: MemoryStatus;
  importance: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface HandoffNoteRecord {
  id: string;
  projectId: string;
  taskTitle: string;
  changedFiles: string[];
  changedModules: string[];
  summary: string;
  verification: string;
  risks: string;
  nextSteps: string;
  createdAt: string;
}
