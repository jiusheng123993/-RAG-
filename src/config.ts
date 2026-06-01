import os from 'node:os';
import path from 'node:path';

export interface AppConfig {
  dataHome: string;
  databasePath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const dataHome = env.LOCAL_PROJECT_MEMORY_HOME || path.join(os.homedir(), '.local-project-memory');
  return {
    dataHome,
    databasePath: path.join(dataHome, 'memory.db')
  };
}
