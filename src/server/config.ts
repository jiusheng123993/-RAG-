import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export interface AppConfig {
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
  app: {
    host: string;
    port: number;
    jwtSecret: string;
    corsOrigins: string[];
  };
  mcp: {
    enabled: boolean;
    transport: string;
    port: number;
  };
}

export function loadAppConfig(): AppConfig {
  const configPath = path.join(process.cwd(), 'config.yaml');
  return YAML.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
}
