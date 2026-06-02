import os from 'node:os';
import path from 'node:path';

export interface AppConfig {
  dataHome: string;
  databasePath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  let dataHome = env.LOCAL_PROJECT_MEMORY_HOME;
  if (!dataHome) {
    dataHome = path.join(os.homedir(), '.local-project-memory');
  }
  if (!path.isAbsolute(dataHome)) {
    dataHome = path.resolve(process.cwd(), dataHome);
  }
  return {
    dataHome,
    databasePath: path.join(dataHome, 'memory.db')
  };
}
