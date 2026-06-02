# Web + Electron 可视化应用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将本地项目记忆 MCP 服务器扩展为 Web + Electron 可视化应用，支持一键启动

**Architecture:** Electron 主进程运行 Express 后端 + MCP 服务器，Renderer 进程运行 React UI，通过 IPC 通信

**Tech Stack:** Electron 33+, React 18, TypeScript, Express, PostgreSQL, Vite, electron-builder

---

## 文件结构规划

```
e:\个人本地知识库\
├── package.json                 # 更新依赖和脚本
├── electron/
│   ├── main.ts                  # Electron 主进程入口
│   ├── preload.ts               # 预加载脚本
│   └── ipc-handlers.ts          # IPC 处理器
├── src/
│   ├── app/                     # React 应用
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Memories.tsx
│   │   │   ├── Import.tsx
│   │   │   └── Diagnostics.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   └── stores/
│   │       └── authStore.ts
│   ├── server/                  # Express 后端
│   │   ├── index.ts             # 后端入口
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   ├── memories.ts
│   │   │   ├── import.ts
│   │   │   └── diagnostics.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── db/
│   │       ├── postgres-adapter.ts
│   │       └── migrations.ts
│   ├── mcp/                     # 保留原有 MCP
│   └── ...
├── config.yaml                  # 配置文件
├── vite.config.ts               # Vite 配置
├── electron-builder.json         # 打包配置
└── ...
```

---

## 实施任务

### Task 1: 项目初始化与依赖安装

**Files:**
- Modify: `package.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`
- Create: `tsconfig.electron.json`

- [ ] **Step 1: 更新 package.json 添加 Electron 和前端依赖**

```json
{
  "name": "local-project-memory",
  "version": "0.2.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "npm run build:renderer && npm run build:electron",
    "build:renderer": "vite build",
    "build:electron": "tsc -p tsconfig.electron.json",
    "app": "npm run build && electron .",
    "dist": "npm run build && electron-builder",
    "start": "node dist/server/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "express": "^4.21.0",
    "zod": "latest",
    "pg": "^8.11.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "yaml": "^2.3.0"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "lucide-react": "^0.300.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/app',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/app'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

- [ ] **Step 3: 创建 electron-builder.json**

```json
{
  "appId": "com.localprojectmemory.app",
  "productName": "Local Project Memory",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

- [ ] **Step 4: 创建 tsconfig.electron.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist-electron",
    "rootDir": "electron",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["electron/**/*"]
}
```

- [ ] **Step 5: 安装依赖**

Run: `npm install`
Expected: 所有依赖安装完成

---

### Task 2: Electron 主进程

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`
- Create: `electron/ipc-handlers.ts`

- [ ] **Step 1: 创建 electron/main.ts**

```typescript
import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  const iconPath = isDev 
    ? path.join(__dirname, '../build/icon.png')
    : path.join(process.resourcesPath, 'icon.png');
  
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示', click: () => mainWindow?.show() },
    { label: '退出', click: () => { tray = null; app.quit(); } }
  ]);

  tray.setToolTip('Local Project Memory');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => mainWindow?.show());
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

- [ ] **Step 2: 创建 electron/preload.ts**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args));
  },
});
```

- [ ] **Step 3: 创建 electron/ipc-handlers.ts**

```typescript
import { ipcMain } from 'electron';

export function setupIpcHandlers() {
  ipcMain.handle('get-app-version', () => {
    const { app } = require('electron');
    return app.getVersion();
  });

  ipcMain.handle('get-user-data-path', () => {
    const { app } = require('electron');
    return app.getPath('userData');
  });
}
```

---

### Task 3: Express 后端服务

**Files:**
- Create: `src/server/index.ts`
- Create: `src/server/routes/auth.ts`
- Create: `src/server/routes/projects.ts`
- Create: `src/server/routes/memories.ts`
- Create: `src/server/routes/import.ts`
- Create: `src/server/routes/diagnostics.ts`
- Create: `src/server/middleware/auth.ts`
- Create: `src/server/db/postgres-adapter.ts`
- Create: `src/server/db/migrations.ts`
- Create: `config.yaml`

- [ ] **Step 1: 创建 config.yaml**

```yaml
database:
  host: localhost
  port: 5432
  username: postgres
  password: postgres
  name: local_project_memory

app:
  host: 0.0.0.0
  port: 3000
  jwtSecret: dev-secret-change-in-production
  corsOrigins:
    - http://localhost:5173
    - http://localhost:3000
    - electron://localhost

mcp:
  enabled: true
  transport: http
  port: 3001
```

- [ ] **Step 2: 创建 src/server/db/postgres-adapter.ts**

```typescript
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const configPath = path.join(process.cwd(), 'config.yaml');
const config = YAML.parse(fs.readFileSync(configPath, 'utf-8'));

const pool = new pg.Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.username,
  password: config.database.password,
  database: config.database.name,
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
```

- [ ] **Step 3: 创建 src/server/db/migrations.ts**

```typescript
import { query } from './postgres-adapter.js';

const migrations = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  summary VARCHAR(1000),
  tags TEXT[],
  importance INTEGER DEFAULT 3,
  source VARCHAR(255),
  source_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'active',
  content_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES import_batches(id) ON DELETE CASCADE,
  file_path VARCHAR(1000) NOT NULL,
  title VARCHAR(500),
  content TEXT,
  summary VARCHAR(1000),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

export async function runMigrations() {
  console.log('Running database migrations...');
  const statements = migrations.split(';').filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      await query(stmt);
    }
  }
  console.log('Migrations completed.');
}
```

- [ ] **Step 4: 创建 src/server/middleware/auth.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const configPath = path.join(process.cwd(), 'config.yaml');
const config = YAML.parse(fs.readFileSync(configPath, 'utf-8'));

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.app.jwtSecret) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
```

- [ ] **Step 5: 创建 src/server/routes/auth.ts**

```typescript
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const configPath = path.join(process.cwd(), 'config.yaml');
const config = YAML.parse(fs.readFileSync(configPath, 'utf-8'));

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await query(
      'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, role',
      [email, username, passwordHash]
    );
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.app.jwtSecret,
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: { id: user.id, email: user.email, username: user.username, role: user.role } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, email, username, role FROM users WHERE id = $1', [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 6: 创建 src/server/routes/projects.ts**

```typescript
import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, AuthRequest, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(`
      SELECT p.* FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.owner_id = $1 OR pm.user_id = $1
      ORDER BY p.updated_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, req.userId]
    );
    await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [result.rows[0].id, req.userId, 'owner']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 7: 创建 src/server/routes/memories.ts**

```typescript
import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { type, status, tags, limit = 50, offset = 0 } = req.query;
    
    let sql = 'SELECT * FROM memories WHERE project_id = $1';
    const params: any[] = [projectId];
    
    if (type) {
      sql += ' AND type = $' + (params.length + 1);
      params.push(type);
    }
    if (status) {
      sql += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(Number(limit), Number(offset));
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { type, title, content, summary, tags, importance, source } = req.body;
    
    const result = await query(
      `INSERT INTO memories (project_id, type, title, content, summary, tags, importance, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [projectId, type, title, content, summary, tags, importance || 3, source]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT * FROM memories WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:projectId/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { type, title, content, summary, tags, importance, status } = req.body;
    const result = await query(
      `UPDATE memories SET type = $1, title = $2, content = $3, summary = $4, tags = $5,
       importance = $6, status = $7, updated_at = NOW() WHERE id = $8 RETURNING *`,
      [type, title, content, summary, tags, importance, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:projectId/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    await query('DELETE FROM memories WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 8: 创建 src/server/routes/import.ts**

```typescript
import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/:projectId/preview', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { filePaths } = req.body;
    
    const items = filePaths.map((filePath: string) => ({
      file_path: filePath,
      title: filePath.split(/[/\\]/).pop()?.replace(/\.[^.]+$/, '') || 'Untitled',
      status: 'pending'
    }));
    
    res.json({ items });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:projectId/execute', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.params;
    const { items } = req.body;
    
    const batchResult = await query(
      'INSERT INTO import_batches (project_id, total_count, status) VALUES ($1, $2, $3) RETURNING *',
      [projectId, items.length, 'running']
    );
    const batchId = batchResult.rows[0].id;
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
      try {
        const fs = await import('fs');
        const content = fs.readFileSync(item.file_path, 'utf-8');
        const summary = content.substring(0, 500);
        
        await query(
          `INSERT INTO import_items (batch_id, file_path, title, content, summary, status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [batchId, item.file_path, item.title, content, summary, 'success']
        );
        
        await query(
          `INSERT INTO memories (project_id, type, title, content, summary, source)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [projectId, 'imported', item.title, content, summary, item.file_path]
        );
        
        successCount++;
      } catch (err: any) {
        await query(
          `INSERT INTO import_items (batch_id, file_path, title, status, error_message)
           VALUES ($1, $2, $3, $4, $5)`,
          [batchId, item.file_path, item.title, 'error', err.message]
        );
        errorCount++;
      }
    }
    
    await query(
      'UPDATE import_batches SET status = $1, success_count = $2, error_count = $3, completed_at = NOW() WHERE id = $4',
      [errorCount > 0 ? 'completed_with_errors' : 'completed', successCount, errorCount, batchId]
    );
    
    res.json({ batchId, successCount, errorCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:projectId/batches', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM import_batches WHERE project_id = $1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 9: 创建 src/server/routes/diagnostics.ts**

```typescript
import { Router } from 'express';
import { query } from '../db/postgres-adapter.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const dbStatus = await query('SELECT 1 as ok').then(() => 'connected').catch(() => 'disconnected');
    
    const memoryCount = await query('SELECT COUNT(*) as count FROM memories').then(r => parseInt(r.rows[0].count)).catch(() => 0);
    const projectCount = await query('SELECT COUNT(*) as count FROM projects').then(r => parseInt(r.rows[0].count)).catch(() => 0);
    const userCount = await query('SELECT COUNT(*) as count FROM users').then(r => parseInt(r.rows[0].count)).catch(() => 0);
    
    res.json({
      version: '0.2.0',
      status: 'running',
      database: dbStatus,
      stats: {
        memories: memoryCount,
        projects: projectCount,
        users: userCount
      },
      mcp: {
        enabled: true,
        tools: 17
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 10: 创建 src/server/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { runMigrations } from './db/migrations.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import memoryRoutes from './routes/memories.js';
import importRoutes from './routes/import.js';
import diagnosticRoutes from './routes/diagnostics.js';

const configPath = path.join(process.cwd(), 'config.yaml');
const config = YAML.parse(fs.readFileSync(configPath, 'utf-8'));

const app = express();

app.use(cors({
  origin: config.app.corsOrigins,
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/memories', memoryRoutes);
app.use('/api/projects/:projectId/import', importRoutes);
app.use('/api/diagnostics', diagnosticRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    await runMigrations();
    
    app.listen(config.app.port, () => {
      console.log(`Server running on http://${config.app.host}:${config.app.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
```

---

### Task 4: React 前端应用

**Files:**
- Create: `src/app/index.html`
- Create: `src/app/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/App.css`
- Create: `src/app/pages/Login.tsx`
- Create: `src/app/pages/Dashboard.tsx`
- Create: `src/app/pages/Projects.tsx`
- Create: `src/app/pages/Memories.tsx`
- Create: `src/app/pages/Import.tsx`
- Create: `src/app/pages/Diagnostics.tsx`
- Create: `src/app/components/Layout.tsx`
- Create: `src/app/stores/authStore.ts`
- Create: `src/app/stores/projectStore.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

- [ ] **Step 1: 创建 src/app/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local Project Memory</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建 src/app/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: 创建 src/app/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
}
```

- [ ] **Step 4: 创建 tailwind.config.js**

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

- [ ] **Step 5: 创建 postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: 创建 src/app/stores/authStore.ts**

```typescript
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  login: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },
}));
```

- [ ] **Step 7: 创建 src/app/stores/projectStore.ts**

```typescript
import { create } from 'zustand';

interface Project {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
}));
```

- [ ] **Step 8: 创建 src/app/App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Memories from './pages/Memories';
import Import from './pages/Import';
import Diagnostics from './pages/Diagnostics';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId/memories" element={<Memories />} />
        <Route path="projects/:projectId/import" element={<Import />} />
        <Route path="diagnostics" element={<Diagnostics />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 9: 创建 src/app/components/Layout.tsx**

```typescript
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, FolderOpen, Database, Upload, Activity, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const navItems = [
    { path: '/', icon: Home, label: '仪表盘' },
    { path: '/projects', icon: FolderOpen, label: '项目' },
    { path: '/diagnostics', icon: Activity, label: '诊断' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-800">项目记忆</h1>
          <p className="text-sm text-gray-500">{user?.username}</p>
        </div>
        <nav className="p-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${
                location.pathname === item.path
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg w-full"
          >
            <LogOut size={20} />
            退出登录
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 10: 创建 src/app/pages/Login.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const body = isRegister ? { email, username, password } : { email, password };

      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '操作失败');
      }

      if (isRegister) {
        setIsRegister(false);
        setError('注册成功，请登录');
      } else {
        login(data.token, data.user);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">项目记忆</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              type="text"
              placeholder="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border rounded mb-4"
              required
            />
          )}
          <input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded mb-4"
            required
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded mb-4"
            required
          />
          <button type="submit" className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600">
            {isRegister ? '注册' : '登录'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          {isRegister ? '已有账号？' : '没有账号？'}
          <button onClick={() => setIsRegister(!isRegister)} className="text-blue-500 ml-1">
            {isRegister ? '登录' : '注册'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 11: 创建 src/app/pages/Dashboard.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { FolderOpen, FileText, Users, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetch('http://localhost:3000/api/diagnostics', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, [token]);

  const cards = [
    { label: '项目', value: stats?.stats?.projects || 0, icon: FolderOpen, color: 'bg-blue-500' },
    { label: '记忆', value: stats?.stats?.memories || 0, icon: FileText, color: 'bg-green-500' },
    { label: '用户', value: stats?.stats?.users || 0, icon: Users, color: 'bg-purple-500' },
    { label: 'MCP 工具', value: stats?.mcp?.tools || 0, icon: Activity, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      <div className="grid grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-6 rounded-lg shadow">
            <div className={`${card.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
              <card.icon className="text-white" size={24} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className="text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">服务状态</h2>
        <div className="space-y-2">
          <p>版本: {stats?.version || '-'}</p>
          <p>状态: <span className="text-green-500">{stats?.status || '-'}</span></p>
          <p>数据库: <span className={stats?.database === 'connected' ? 'text-green-500' : 'text-red-500'}>
            {stats?.database || '-'}
          </span></p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: 创建 src/app/pages/Projects.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useProjectStore } from '../stores/projectStore';
import { Plus, FolderOpen } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);

  useEffect(() => {
    fetch('http://localhost:3000/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setProjects)
      .catch(console.error);
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      const newProject = await res.json();
      setProjects([...projects, newProject]);
      setShowForm(false);
      setName('');
      setDescription('');
    }
  };

  const handleSelect = (project: any) => {
    setCurrentProject(project);
    navigate(`/projects/${project.id}/memories`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">项目</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Plus size={20} />
          新建项目
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow mb-6">
          <input
            type="text"
            placeholder="项目名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 border rounded mb-4"
            required
          />
          <textarea
            placeholder="项目描述"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border rounded mb-4"
          />
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">创建</button>
        </form>
      )}

      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => handleSelect(project)}
            className="bg-white p-6 rounded-lg shadow cursor-pointer hover:shadow-lg"
          >
            <FolderOpen className="text-blue-500 mb-4" size={32} />
            <h3 className="font-semibold text-lg">{project.name}</h3>
            <p className="text-gray-500 text-sm">{project.description || '暂无描述'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 13: 创建 src/app/pages/Memories.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { FileText, Tag, Archive, Download } from 'lucide-react';

export default function Memories() {
  const { projectId } = useParams();
  const [memories, setMemories] = useState<any[]>([]);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (projectId) {
      fetch(`http://localhost:3000/api/projects/${projectId}/memories`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then(setMemories)
        .catch(console.error);
    }
  }, [projectId, token]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">记忆列表</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
          <Download size={20} />
          导出
        </button>
      </div>

      <div className="space-y-4">
        {memories.map((memory) => (
          <div key={memory.id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{memory.title}</h3>
                <p className="text-gray-600 mt-2">{memory.summary || memory.content.substring(0, 200)}</p>
                <div className="flex gap-2 mt-3">
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">{memory.type}</span>
                  {memory.tags?.map((tag: string) => (
                    <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 14: 创建 src/app/pages/Import.tsx**

```typescript
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Upload, FileText } from 'lucide-react';

export default function Import() {
  const { projectId } = useParams();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const token = useAuthStore((state) => state.token);

  const handlePreview = async () => {
    const res = await fetch(`http://localhost:3000/api/projects/${projectId}/import/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ filePaths }),
    });
    const data = await res.json();
    setPreview(data.items || []);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch(`http://localhost:3000/api/projects/${projectId}/import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items: preview }),
      });
      const data = await res.json();
      alert(`导入完成: 成功 ${data.successCount}, 失败 ${data.errorCount}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">知识导入</h1>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="font-semibold mb-4">选择文件</h2>
        <textarea
          value={filePaths.join('\n')}
          onChange={(e) => setFilePaths(e.target.value.split('\n').filter(Boolean))}
          placeholder="每行一个文件路径"
          className="w-full p-3 border rounded h-32 mb-4"
        />
        <button
          onClick={handlePreview}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          预览
        </button>
      </div>

      {preview.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="font-semibold mb-4">预览 ({preview.length} 个文件)</h2>
          <div className="space-y-2 mb-4">
            {preview.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <FileText size={16} />
                <span>{item.title}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            <Upload size={20} />
            {importing ? '导入中...' : '开始导入'}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 15: 创建 src/app/pages/Diagnostics.tsx**

```typescript
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Activity, Database, Server, Wrench } from 'lucide-react';

export default function Diagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetch('http://localhost:3000/api/diagnostics', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setDiagnostics)
      .catch(console.error);
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">诊断工具</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Server className="text-blue-500" size={24} />
            <h2 className="font-semibold text-lg">服务状态</h2>
          </div>
          <div className="space-y-2">
            <p>版本: <span className="font-mono">{diagnostics?.version || '-'}</span></p>
            <p>状态: <span className="text-green-500">{diagnostics?.status || '-'}</span></p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-green-500" size={24} />
            <h2 className="font-semibold text-lg">数据库</h2>
          </div>
          <p>状态: <span className={diagnostics?.database === 'connected' ? 'text-green-500' : 'text-red-500'}>
            {diagnostics?.database || '-'}
          </span></p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="text-orange-500" size={24} />
            <h2 className="font-semibold text-lg">MCP 工具</h2>
          </div>
          <p>状态: <span className="text-green-500">{diagnostics?.mcp?.enabled ? '已启用' : '已禁用'}</span></p>
          <p>工具数量: <span className="font-mono">{diagnostics?.mcp?.tools || 0}</span></p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-purple-500" size={24} />
            <h2 className="font-semibold text-lg">统计</h2>
          </div>
          <div className="space-y-2">
            <p>项目数: {diagnostics?.stats?.projects || 0}</p>
            <p>记忆数: {diagnostics?.stats?.memories || 0}</p>
            <p>用户数: {diagnostics?.stats?.users || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 5: 一键启动脚本

**Files:**
- Create: `scripts/start-app.ps1`

- [ ] **Step 1: 创建 scripts/start-app.ps1**

```powershell
# 一键启动脚本
$ErrorActionPreference = "Stop"

Write-Host "正在启动 Local Project Memory..." -ForegroundColor Cyan

# 检查 Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    exit 1
}

# 检查 PostgreSQL 连接
Write-Host "检查数据库连接..." -ForegroundColor Yellow
$pgAvailable = & {
    try {
        $null = [System.Data.Odbc.OdbcConnection]::new("Driver={PostgreSQL Unicode};Server=localhost;Port=5432;Database=local_project_memory;Uid=postgres;Pwd=postgres").Open()
        $true
    } catch {
        $false
    }
}

if (-not $pgAvailable) {
    Write-Host "警告: PostgreSQL 数据库不可用" -ForegroundColor Yellow
    Write-Host "请确保 PostgreSQL 已启动，或修改 config.yaml 中的数据库配置" -ForegroundColor Yellow
}

# 安装依赖
Write-Host "安装依赖..." -ForegroundColor Yellow
npm install

# 构建
Write-Host "构建项目..." -ForegroundColor Yellow
npm run build

# 启动应用
Write-Host "启动应用..." -ForegroundColor Green
electron .
```

---

### Task 6: 测试与验证

**Files:**
- Modify: `package.json` 添加测试脚本

- [ ] **Step 1: 运行 typecheck**

Run: `npm run typecheck`
Expected: 无错误

- [ ] **Step 2: 运行 lint**

Run: `npm run lint`
Expected: 无错误

- [ ] **Step 3: 测试开发模式**

Run: `npm run dev`
Expected: Vite 开发服务器启动

- [ ] **Step 4: 测试一键启动**

Run: `npm run app`
Expected: Electron 窗口打开

---

## 执行选项

**Plan complete and saved to `docs/superpowers/plans/2026-06-02-web-electron-visual-app-implementation.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
