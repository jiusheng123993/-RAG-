# 第五阶段：接入体验与诊断实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提升安装、配置、排错和交接体验

**Architecture:** 沿用现有架构，新增 CLI 诊断命令和 MCP 诊断工具

**Tech Stack:** TypeScript, Node.js, SQLite, MCP SDK

---

## 阶段五：接入体验与诊断

### 任务总览

1. CLI 诊断命令（`--doctor`、`--migrate-status`）
2. MCP 诊断工具（`get_service_diagnostics`）
3. 文档同步更新

---

### Task 1: 添加 CLI 诊断命令

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 添加 --doctor 和 --migrate-status CLI 参数**

```typescript
#!/usr/bin/env node

import { loadConfig } from './config.js';
import { startMcpServer } from './mcp/server.js';
import { startHttpMcpServer } from './mcp/http-server.js';
import {