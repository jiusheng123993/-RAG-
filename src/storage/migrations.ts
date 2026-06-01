export const migrations = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    workspace_path TEXT NOT NULL,
    git_remote TEXT,
    git_branch TEXT,
    fingerprint TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_accessed_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    source TEXT NOT NULL,
    tags TEXT NOT NULL,
    status TEXT NOT NULL,
    importance INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS handoff_notes (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    task_title TEXT NOT NULL,
    changed_files TEXT NOT NULL,
    changed_modules TEXT NOT NULL,
    summary TEXT NOT NULL,
    verification TEXT NOT NULL,
    risks TEXT NOT NULL,
    next_steps TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id)
  )`,
  `CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    memory_id UNINDEXED,
    project_id UNINDEXED,
    title,
    content,
    summary,
    tags
  )`,
  `CREATE INDEX IF NOT EXISTS idx_memories_project_status ON memories(project_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_memories_project_type ON memories(project_id, type)`,
  `CREATE INDEX IF NOT EXISTS idx_handoff_project_created ON handoff_notes(project_id, created_at)`
];
