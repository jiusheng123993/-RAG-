# Web + Electron 可视化应用设计

## 1. 项目概述

**项目名称**：Local Project Memory Visual App
**项目类型**：桌面应用 + Web 应用
**核心功能**：提供本地项目记忆管理的可视化界面，同时保留 MCP 服务器能力供 Agent 接入
**目标用户**：个人开发者、团队、需要 AI 辅助项目管理的用户

## 2. 技术架构

### 2.1 技术栈

| 层级 | 技术选择 |
|------|----------|
| 桌面框架 | Electron 33+ |
| 前端框架 | React 18 + TypeScript |
| UI 组件库 | Tailwind CSS + shadcn/ui |
| 后端框架 | Express.js |
| 数据库 | PostgreSQL |
| 认证 | JWT + bcrypt |
| 状态管理 | Zustand |
| 路由 | React Router 6 |
| 构建工具 | Vite + electron-builder |

### 2.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 主进程                        │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │   窗口管理      │    │      MCP 服务器（保留）          │ │
│  │   系统托盘      │    │   @modelcontextprotocol/sdk     │ │
│  │   自动更新      │    └─────────────────────────────────┘ │
│  └─────────────────┘                                        │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    IPC 通信层                            ││
│  └─────────────────────────────────────────────────────────┘│
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Renderer 进程（React UI）                 ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐    ││
│  │  │  登录   │ │ 仪表盘  │ │ 记忆管理 │ │ 知识导入   │    ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
            │
            ▼ (HTTP API)
┌─────────────────────────────────────────────────────────────┐
│                      Express 后端服务                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  用户路由   │  │ 项目路由    │  │   MCP 工具路由       │  │
│  │  /api/auth  │  │ /api/projects│ │   /mcp              │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  记忆路由   │  │ 导入路由    │  │   诊断路由          │  │
│  │  /api/memories│ │ /api/import │ │   /api/diagnostics │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL 数据库                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  users | projects | project_members | memories         ││
│  │  import_batches | import_items | diagnostics          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 3. 功能模块

### 3.1 用户系统

| 功能 | 描述 |
|------|------|
| 用户注册 | 邮箱、用户名、密码 |
| 用户登录 | JWT Token 认证 |
| 角色管理 | 管理员、普通用户 |
| 权限控制 | RBAC 细粒度权限 |

### 3.2 项目管理

| 功能 | 描述 |
|------|------|
| 创建项目 | 项目名称、描述 |
| 项目列表 | 展示用户有权限的项目 |
| 项目成员 | 邀请、移除成员 |
| 项目设置 | 修改、删除项目 |

### 3.3 记忆管理

| 功能 | 描述 |
|------|------|
| 记忆列表 | 分页、筛选、搜索 |
| 记忆详情 | 查看、编辑 |
| 记忆标签 | 添加、移除标签 |
| 记忆归档 | 批量归档 |
| 记忆导出 | JSON、Markdown 格式 |

### 3.4 知识导入

| 功能 | 描述 |
|------|------|
| 导入预览 | 选择文件、预览内容 |
| 执行导入 | 批量导入 |
| 导入历史 | 批次列表、状态 |

### 3.5 仪表盘

| 功能 | 描述 |
|------|------|
| 统计概览 | 记忆数量、项目数量 |
| 知识分布 | 按类型、标签统计 |
| 最近活动 | 最新记忆、导入记录 |
| 健康状态 | 服务、数据库状态 |

### 3.6 诊断工具

| 功能 | 描述 |
|------|------|
| 服务状态 | 运行状态、版本 |
| 数据库状态 | 连接、迁移状态 |
| MCP 工具 | 工具列表、数量 |

### 3.7 MCP 集成

| 功能 | 描述 |
|------|------|
| MCP 服务器 | 保留原有 17 个工具 |
| HTTP API | 同步提供 HTTP 接口 |
| 认证 | API Key 认证 |

## 4. 数据库设计

### 4.1 表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 项目表
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 项目成员表
CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

-- 记忆表（扩展原有结构）
CREATE TABLE memories (
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

-- 导入批次表
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  total_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- 导入条目表
CREATE TABLE import_items (
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
```

## 5. API 设计

### 5.1 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/me | 获取当前用户 |

### 5.2 项目接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects | 获取项目列表 |
| POST | /api/projects | 创建项目 |
| GET | /api/projects/:id | 获取项目详情 |
| PUT | /api/projects/:id | 更新项目 |
| DELETE | /api/projects/:id | 删除项目 |
| POST | /api/projects/:id/members | 添加成员 |
| DELETE | /api/projects/:id/members/:userId | 移除成员 |

### 5.3 记忆接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects/:projectId/memories | 获取记忆列表 |
| POST | /api/projects/:projectId/memories | 创建记忆 |
| GET | /api/projects/:projectId/memories/:id | 获取记忆详情 |
| PUT | /api/projects/:projectId/memories/:id | 更新记忆 |
| DELETE | /api/projects/:projectId/memories/:id | 删除记忆 |
| POST | /api/projects/:projectId/memories/bulk-archive | 批量归档 |
| GET | /api/projects/:projectId/memories/export | 导出记忆 |

### 5.4 导入接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/projects/:projectId/import/preview | 预览导入 |
| POST | /api/projects/:projectId/import/execute | 执行导入 |
| GET | /api/projects/:projectId/import/batches | 导入批次列表 |

### 5.5 诊断接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/diagnostics | 服务诊断 |

## 6. 一键启动设计

### 6.1 启动流程

```
用户执行: npm run app 或 electron .
    │
    ▼
┌─────────────────────────────────────────┐
│  1. 检查 PostgreSQL 连接                │
│     - 尝试连接，失败则提示配置          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. 运行数据库迁移                      │
│     - 自动创建表结构                    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. 启动 Express 后端服务               │
│     - 监听 3000 端口                    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  4. 启动 MCP 服务器                     │
│     - 监听 stdio / HTTP                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  5. 启动 Electron 主进程                │
│     - 创建主窗口                         │
│     - 注册系统托盘                       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  6. 打开默认浏览器或应用窗口             │
└─────────────────────────────────────────┘
```

### 6.2 配置文件

```yaml
# config.yaml
database:
  host: localhost
  port: 5432
  username: postgres
  password: postgres
  name: local_project_memory

app:
  host: 0.0.0.0
  port: 3000
  jwtSecret: your-secret-key
  corsOrigins:
    - http://localhost:3000
    - electron://localhost

mcp:
  enabled: true
  transport: http
  port: 3001
```

## 7. 验收标准

### 7.1 功能验收

- [ ] 用户可以注册、登录
- [ ] 用户可以创建、加入项目
- [ ] 用户可以管理项目记忆
- [ ] 用户可以导入本地文档
- [ ] 用户可以查看仪表盘统计
- [ ] 用户可以查看健康诊断
- [ ] MCP 工具正常工作

### 7.2 一键启动验收

- [ ] 执行 `npm run app` 即可启动
- [ ] 自动检测 PostgreSQL 连接
- [ ] 自动运行数据库迁移
- [ ] 后端服务正常启动
- [ ] Electron 窗口正常打开
- [ ] 系统托盘图标正常显示

### 7.3 构建验收

- [ ] `npm run build` 成功构建
- [ ] `npm run dist` 生成可执行文件
- [ ] 生成的 .exe 可独立运行
