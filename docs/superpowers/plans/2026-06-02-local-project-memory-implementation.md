# 本地项目记忆 MCP 服务实施计划

> 面向后续 Agent / 开发者：本计划按任务顺序执行。当前阶段只做 Trae 项目记忆，不做通用网页、PDF、文档知识库导入。

**目标：** 构建一个本地运行的 MCP Server，让 Trae 可以按项目写入、搜索、读取、归档项目记忆，并把数据保存在本机 SQLite/FTS5 中。

**架构：** MCP 层只负责工具暴露和参数校验；业务逻辑放在 Service 层；项目隔离由 Project Resolver 负责；数据读写由 SQLite Adapter 负责；本地模型、向量库、Web 管理台通过 Provider / Adapter 接口预留。

**技术栈：** TypeScript、Node.js、`@modelcontextprotocol/sdk`、Node 内置 SQLite、FTS5、Zod、Vitest、ESLint、TypeScript Compiler。

---

## 1. 当前状态

- 根目录：`E:\个人本地知识库`
- Git 仓库：尚未初始化
- CodeGraph：已初始化并可用
- 数据库实现：已从 `better-sqlite3` 调整为 Node 内置 SQLite，降低 Windows 原生依赖安装风险
- 设计规格：`docs/superpowers/specs/2026-06-02-local-project-memory-design.md`
- Trae 接入说明：`docs/TRAE_SETUP.md`

---

## 2. 已完成任务

### 2.1 项目骨架

已创建基础 TypeScript、Vitest、ESLint、配置、类型、Provider 接口和基础测试。

### 2.2 项目识别

已实现路径归一化、Git remote / branch 读取、非 Git 项目识别、项目 fingerprint 生成。

### 2.3 SQLite 存储层

已实现 `projects`、`memories`、`handoff_notes`、`memory_fts` 表，以及项目 upsert、记忆创建、列表、归档、交接记录、搜索。

### 2.4 服务层

已实现：

- `rememberProjectContext`
- `listProjectMemories`
- `archiveProjectMemory`
- `recordHandoffNote`
- `getProjectBrief`
- `searchProjectMemory`

### 2.5 MCP 工具层

已实现 6 个 MCP 工具：

- `remember_project_context`
- `search_project_memory`
- `get_project_brief`
- `record_handoff_note`
- `list_project_memories`
- `archive_project_memory`

### 2.6 文档

已创建：

- `README.md`
- `docs/TRAE_SETUP.md`
- `docs/superpowers/specs/2026-06-02-local-project-memory-design.md`
- `docs/superpowers/plans/2026-06-02-local-project-memory-implementation.md`

---

## 3. 当前目标文件结构

```text
E:\个人本地知识库\
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.test.json
├── eslint.config.js
├── vitest.config.ts
├── README.md
├── docs/
│   ├── TRAE_SETUP.md
│   └── superpowers/
│       ├── specs/
│       │   └── 2026-06-02-local-project-memory-design.md
│       └── plans/
│           └── 2026-06-02-local-project-memory-implementation.md
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── mcp/
│   │   ├── server.ts
│   │   ├── tools.ts
│   │   └── schemas.ts
│   ├── services/
│   │   ├── memory-service.ts
│   │   ├── project-resolver.ts
│   │   └── retrieval-service.ts
│   ├── storage/
│   │   ├── migrations.ts
│   │   ├── schema.ts
│   │   └── sqlite-adapter.ts
│   ├── providers/
│   │   ├── embedding-provider.ts
│   │   ├── llm-provider.ts
│   │   └── vector-store-provider.ts
│   ├── types/
│   │   ├── memory.ts
│   │   └── project.ts
│   └── utils/
│       ├── hash.ts
│       ├── ids.ts
│       ├── paths.ts
│       └── time.ts
└── tests/
    ├── basic.test.ts
    ├── memory-service.test.ts
    ├── mcp-tools.test.ts
    ├── project-resolver.test.ts
    ├── retrieval-service.test.ts
    └── sqlite-adapter.test.ts
```

---

## 4. 验证命令

每次改动后运行：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

本地配置检查：

```bash
node dist/index.js --print-config
```

---

## 5. 验收标准

- [x] 能启动 MCP Server 构建产物。
- [x] 暴露 6 个 MCP 工具定义。
- [x] 能写入当前项目记忆。
- [x] 能搜索当前项目记忆。
- [x] 不同项目记忆不会串。
- [x] 能生成项目 brief。
- [x] 能记录 handoff note。
- [x] 能归档过期记忆。
- [x] 数据全部存在本机 SQLite。
- [x] 不依赖国外服务。
- [x] 提供 Trae 接入说明。

---

## 6. 安全要求

- 服务不主动扫描整个项目目录。
- 服务只保存 MCP 工具明确传入的内容。
- 默认不读取 `.env`。
- 默认不读取密钥文件。
- 不应写入密钥、Token、密码、数据库连接串。
- 所有记忆按项目隔离。
- 旧记忆通过归档处理，不默认物理删除。

---

## 7. 后续预留能力

第一版只定义接口边界，不实现复杂能力：

- `EmbeddingProvider`：后续接 Ollama、LM Studio、本地 sentence-transformers 或国内模型接口。
- `LLMProvider`：后续用于摘要、问答、记忆压缩。
- `VectorStoreProvider`：后续接 LanceDB、Qdrant、Chroma 或 SQLite vector 扩展。
- Web 管理台：后续查看、编辑、归档项目记忆。
- 通用知识库导入器：后续导入 Markdown、PDF、网页、本地文档目录。
- 局域网访问：后续支持多设备访问。
- 多用户权限：后续团队私有化时再做。

---

## 8. 建议提交信息

```bash