export interface ProjectIdentity {
  id: string;
  name: string;
  workspacePath: string;
  gitRemote: string | null;
  gitBranch: string | null;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt: string;
}

export interface ResolvedProjectInput {
  name: string;
  workspacePath: string;
  gitRemote: string | null;
  gitBranch: string | null;
  fingerprint: string;
}
