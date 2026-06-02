# HTTP MCP 服务 + 开机自启动实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为本地项目记忆 MCP 服务新增 HTTP 模式入口，并配置 Windows 开机自启动

**Architecture:** 在现有 stdio MCP 服务基础上，新增 StreamableHTTP 传输层支持，使服务可作为 HTTP 服务器常驻运行。Windows 任务计划程序负责开机自动启动 Node 进程。

**Tech Stack:** Node.js, MCP SDK (StreamableHttpServer), Windows Task Scheduler, PowerShell

---

### 任务 1: 新增 HTTP 服务器入口模块

**Files:**
- Create: `src/mcp/http-server.ts`
- Modify: `src/index.ts`
- Test: `tests/http-server.test.ts` (手动验证)

- [ ] **Step 1: 创建 HTTP 服务器模块**

```typescript
// src/mcp/http-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHttpServer } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../config.js';
import { createImportService } from '../services/import-service.js';
import { createMemoryService } from '../services/memory-service.js';
import { createProjectResolver } from '../services/project-resolver.js';
import { createRetrievalService } from '../services/retrieval-service.js';
import { createSqliteAdapter } from '../storage/sqlite-adapter.js';
import { createToolHandlers } from './tools.js';
import { toolDefinitions } from './schemas.js';

export async function startHttpMcpServer(port: number = 3107): Promise<void> {
  const config = loadConfig();
  const adapter = createSqliteAdapter(config.databasePath);
  adapter.initialize();
  const resolver = createProjectResolver();
  const handlers = createToolHandlers({
    importService: createImportService(adapter, resolver),
    memoryService: createMemoryService(adapter, resolver),
    retrievalService: createRetrievalService(adapter, resolver)
  });

  const server = new Server({ name: 'local-project-memory', version: '0.1.0' }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefinitions }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const result = await (async () => {
      if (name === 'remember_project_context') return handlers.rememberProjectContext(args);
      if (name === 'search_project_memory') return handlers.searchProjectMemory(args);
      if (name === 'find_related_memories') return handlers.findRelatedMemories(args);
      if (name === 'preview_knowledge_import') return handlers.previewKnowledgeImport(args);
      if (name === 'import_knowledge_files') return handlers.importKnowledgeFiles(args);
      if (name === 'list_import_batches') return handlers.listImportBatches(args);
      if (name === 'get_memory_detail') return handlers.getMemoryDetail(args);
      if (name === 'update_project_memory') return handlers.updateProjectMemory(args);
      if (name === 'detect_duplicate_memories') return handlers.detectDuplicateMemories(args);
      if (name === 'get_project_brief') return handlers.getProjectBrief(args);
      if (name === 'record_handoff_note') return handlers.recordHandoffNote(args);
      if (name === 'list_project_memories') return handlers.listProjectMemories(args);
      if (name === 'archive_project_memory') return handlers.archiveProjectMemory(args);
      throw new Error(`Unknown tool: ${name}`);
    })();

    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
    };
  });

  const transport = new StreamableHttpServer(server, { port });
  await transport.start();
  console.log(`HTTP MCP Server running on http://127.0.0.1:${port}/mcp`);
}
```

- [ ] **Step 2: 修改入口文件支持双模式**

```typescript
// src/index.ts (替换)
#!/usr/bin/env node

import { loadConfig } from './config.js';
import { startMcpServer } from './mcp/server.js';
import { startHttpMcpServer } from './mcp/http-server.js';

const config = loadConfig();
const args = process.argv.slice(2);

if (args.includes('--http')) {
  const port = parseInt(args[args.indexOf('--port') + 1] ?? '3107', 10);
  await startHttpMcpServer(port);
} else if (args.includes('--print-config')) {
  process.stdout.write(JSON.stringify(config, null, 2));
} else {
  await startMcpServer();
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 编译成功，生成 `dist/mcp/http-server.js` 和更新后的 `dist/index.js`

---

### 任务 2: 创建 Windows 开机自启动脚本

**Files:**
- Create: `scripts/setup-autostart.ps1`
- Create: `scripts/start-http-server.ps1`

- [ ] **Step 1: 创建启动脚本**

```powershell
# scripts/start-http-server.ps1
$ErrorActionPreference = "Stop"
$env:LOCAL_PROJECT_MEMORY_HOME = "E:\个人本地知识库\.memory-data"
$nodePath = (Get-Command node).Source
$scriptPath = "E:\个人本地知识库\dist\index.js"
$port = 3107

$proc = Start-Process -FilePath $nodePath -ArgumentList "$scriptPath","--http","--port",$port -PassThru -WindowStyle Hidden
Write-Host "HTTP MCP Server started with PID: $($proc.Id)"
```

- [ ] **Step 2: 创建任务计划安装脚本**

```powershell
# scripts/setup-autostart.ps1
$ErrorActionPreference = "Stop"

$taskName = "LocalProjectMemory"
$scriptPath = "$PSScriptRoot\start-http-server.ps1"

# 检查是否已存在任务
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Task '$taskName' already exists. Removing..."
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# 创建任务计划
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -At LogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "本地项目记忆 MCP HTTP 服务"

Write-Host "Task '$taskName' created successfully."
Write-Host "服务将在用户登录后自动启动。"
```

- [ ] **Step 3: 验证脚本语法**

Run: `powershell -ExecutionPolicy Bypass -File scripts/setup-autostart.ps1 -WhatIf` 或手动检查语法

---

### 任务 3: 更新文档

**Files:**
- Modify: `README.md`
- Modify: `docs/TRAE_SETUP.md`

- [ ] **Step 1: 更新 README.md**

在"安装"和"构建"章节后添加：

```markdown
## HTTP 服务模式（可选）

服务支持两种运行模式：
- **stdio 模式**（默认）：供 Trae MCP 直接调用
- **HTTP 模式**：作为本地 HTTP 服务常驻，供多个客户端连接

### 启动 HTTP 服务

```bash
npm run build
node dist/index.js --http --port 3107
```

服务将在 `http://127.0.0.1:3107/mcp` 启动。

### 配置开机自启动（Windows）

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-autostart.ps1
```

这会创建一个名为 `LocalProjectMemory` 的任务计划，在用户登录后自动启动 HTTP 服务。

### 停止服务

```powershell
Get-Process -Name node | Where-Object { $_.CommandLine -like "*local-project-memory*" } | Stop-Process
```

或通过任务计划程序禁用/删除任务。
```

- [ ] **Step 2: 更新 TRAE_SETUP.md**

在现有 MCP 配置示例后添加 HTTP 服务连接说明。

---

### 任务 4: 完整验证

- [ ] **Step 1: 构建项目**

Run: `npm run build`
Expected: 成功，无错误

- [ ] **Step 2: 启动 HTTP 服务并测试**

Run: `node dist/index.js --http --port 3107` (后台运行)
Expected: 输出 `HTTP MCP Server running on http://127.0.0.1:3107/mcp`

- [ ] **Step 3: 测试 HTTP 端点**

Run: `curl http://127.0.0.1:3107/mcp -X POST -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/list\",\"id\":1}"`
Expected: 返回工具列表 JSON

- [ ] **Step 4: 运行测试**

Run: `npm run test`
Expected: 所有测试通过

- [ ] **Step 5: 停止服务并清理**

Run: 停止后台 Node 进程

---

### 任务 5: 提交变更

- [ ] **Step 1: 提交代码**

```bash
git add src/mcp/http-server.ts src/index.ts scripts/start-http-server.ps1 scripts/setup-autostart.ps1 README.md docs/TRAE_SETUP.md
git commit -m "feat: add HTTP MCP server and Windows autostart support"
```
