# 本地项目记忆 MCP 服务实施计划

> 面向后续 Agent / 开发者：本计划按模块串行执行。当前目标是把第一版本地项目记忆 MCP 服务升级为更完整的个人本地知识库底座。禁止一次性跨阶段混改，禁止推翻现有架构。

## 1. 项目现状

- 根目录：`E:\个人本地知识库`
- 项目类型：TypeScript / Node.js MCP Server
- Git 状态：已初始化，远程仓库为 `https://github.com/jiusheng123993/-RAG-.git`
- 当前基线分支：`main`
- 当前工作分支：`docs/knowledgebase-roadmap`
- CodeGraph：已初始化并可用
- 数据库实现：Node 内置 SQLite + SQLite FTS5
- 设计规格：`docs/superpowers/specs/2026-06-02-local-project-memory-design.md`
- Trae 接入说明：`docs/TRAE_SETUP.md`

## 2. 已完成能力

### 2.1 项目骨架

已创建 TypeScript、Vitest、ESLint、MCP SDK、配置、类型、Provider 接口和基础测试。

### 2.2 项目识别

已实现路径归一化、Git remote / branch 读取、非 Git 项目识别、项目 fingerprint 生成。

### 2.3 SQLite 存储层

已实现 `projects`、`memories`、`handoff_notes`、`memory_fts` 表，以及项目 upsert、记忆创建、详情读取、更新、列表、归档、重复检测、交接记录、搜索。`memories` 已支持 `source_path` 和 `content_hash`。

### 2.4 服务层

已实现：

- `rememberProjectContext`
- `getMemoryDetail`
- `updateProjectMemory`
- `detectDuplicateMemories`
- `listProjectMemories`
- `archiveProjectMemory`
- `recordHandoffNote`
- `getProjectBrief`
- `searchProjectMemory`

### 2.5 MCP 工具层

已实现 9 个 MCP 工具：

- `remember_project_context`
- `search_project_memory`
- `get_memory_detail`
- `update_project_memory`
- `detect_duplicate_memories`
- `get_project_brief`
- `record_handoff_note`
- `list_project_memories`
- `archive_project_memory`

## 3. 总体升级原则

- 继承现有架构，不推翻重写。
- MCP 层只负责工具暴露、参数校验和调用服务。
- Service 层承载业务规则、项目隔离、去重、治理策略。
- Storage Adapter 负责 SQLite、迁移、索引维护和数据读写。
- Importer / Provider / Strategy 作为扩展点新增，不把逻辑塞进核心流程。
- 所有新增字段必须兼容旧数据库。
- 所有旧工具保持兼容。
- 文件导入只处理用户明确指定的路径，不主动扫描全盘。
- 默认不读取 `.env`、密钥、证书、数据库文件和高风险路径。
- 每个阶段独立测试、独立交接、可回滚。

## 4. 分阶段实施路线

### 阶段一：知识库核心治理底座

状态：已完成。

目标：增强记忆的可维护性、可治理性和可追溯性。

任务：

1. CodeGraph 影响分析
   - 分析 `MemoryService`、`SqliteAdapter`、MCP schemas/tools、tests 的调用影响。
   - 确认旧 6 个工具不被破坏。

2. 数据模型兼容迁移
   - 为 `memories` 增加 `source_path`。
   - 为 `memories` 增加 `content_hash`。
   - 预留导入批次表结构时不启用导入逻辑。
   - 确保旧数据库初始化和新数据库初始化都通过。

3. 类型契约更新
   - 扩展 `MemoryRecord`。
   - 扩展创建和更新输入类型。
   - 新增详情、更新、重复检测返回结构。

4. Storage Adapter 扩展
   - 新增按 ID 读取记忆。
   - 新增更新记忆。
   - 新增按内容 hash 查重。
   - 更新时同步 FTS 索引。
   - 保持项目 ID 过滤，避免跨项目访问。

5. Memory Service 扩展
   - 新增 `getMemoryDetail`。
   - 新增 `updateProjectMemory`。
   - 新增 `detectDuplicateMemories`。
   - 增加标签规范化。
   - 增加 importance 范围校验。
   - 增加空更新保护。

6. MCP 工具扩展
   - 新增工具定义。
   - 新增 Zod schema。
   - 新增 handler 分发。
   - 保持旧工具名称、参数和返回结构兼容。

7. 测试
   - 详情读取正常流程。
   - 更新正常流程。
   - 更新后搜索命中更新内容。
   - 跨项目无法读取或更新。
   - 重复内容检测。
   - 空更新和非法 importance 异常。
   - 旧 6 个工具兼容测试。

8. 文档同步
   - README 更新新增工具。
   - 设计规格保持与实现一致。
   - Trae 接入说明如需新增工具示例则同步更新。

验收命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 阶段二：本地文档导入能力

状态：已完成。

目标：支持把用户明确指定的 Markdown / 文本文档导入项目记忆库。

任务：

1. CodeGraph 影响分析
   - 分析新增 Import Service 与 Memory Service、Storage Adapter、MCP tools 的边界。

2. Import Policy
   - 定义允许格式：`.md`、`.markdown`、`.txt`。
   - 定义默认忽略目录：`.git`、`node_modules`、`dist`、`build`、`.trae` 中敏感目录。
   - 定义默认忽略文件：`.env`、证书、密钥、数据库文件、压缩包、二进制文件。
   - 定义文件大小上限。

3. Parser
   - Markdown 标题提取。
   - 简单 frontmatter title/tags 提取。
   - 纯文本标题兜底为文件名。

4. 导入批次数据层
   - 新增 `import_batches`。
   - 新增 `import_items`。
   - 记录导入、跳过、失败原因。

5. Import Service
   - `previewKnowledgeImport`：只扫描候选文件和策略结果，不写数据库。
   - `importKnowledgeFiles`：写入记忆、记录批次和条目。
   - `listImportBatches`：分页查看导入批次。

6. MCP 工具
   - `preview_knowledge_import`
   - `import_knowledge_files`
   - `list_import_batches`

7. 测试
   - dry-run 不写入数据库。
   - Markdown 导入。
   - 文本导入。
   - 目录导入。
   - 敏感路径跳过。
   - 重复内容跳过。
   - 空文件跳过。
   - 批次统计准确。

8. 文档同步
   - README 增加导入示例。
   - TRAE_SETUP 增加工具调用建议。

验收命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 阶段三：检索增强

目标：提升搜索质量和过滤能力。

任务：

1. 扩展 Search 输入契约
   - `tags`
   - `source`
   - `status`
   - `minImportance`
   - `updatedAfter`
   - `updatedBefore`
   - `includeArchived`
   - `limit`

2. Storage 搜索增强
   - 标题、摘要、内容、标签、来源路径综合检索。
   - 中文 LIKE 兜底保留。
   - 增加标签过滤。
   - 增加状态和时间过滤。

3. Retrieval Service 排序
   - 相关性优先。
   - 重要级别次之。
   - 更新时间兜底。

4. 返回内容裁剪
   - 限制搜索结果 content 长度。
   - 标记命中字段。

5. 新增相关记忆查询
   - `find_related_memories` 基于 tags、type、source、关键词做轻量关联。

6. 测试
   - 中文搜索。
   - 标签过滤。
   - 状态过滤。
   - limit 上限。
   - archived 默认不返回。
   - 旧搜索参数兼容。

验收命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 阶段四：知识维护与治理工具

目标：让知识库长期不腐化。

任务：

1. 批量归档
   - 仅当前项目内执行。
   - 限制单次最大数量。
   - 返回成功、失败、跳过统计。

2. 导出项目记忆
   - 支持 JSON。
   - 支持 Markdown 摘要。
   - 默认只导出 active。

3. 健康报告
   - 统计类型分布。
   - 统计标签分布。
   - 检测重复内容。
   - 检测缺少 summary。
   - 检测长期未更新的风险记忆。
   - 突出 do_not_touch / risk / decision / architecture。

4. MCP 工具
   - `bulk_archive_memories`
   - `export_project_memory`
   - `get_memory_health_report`

5. 测试
   - 批量归档项目隔离。
   - 导出 active 默认行为。
   - 健康报告统计准确。
   - 高优先级记忆突出展示。

验收命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

### 阶段五：接入体验与诊断

目标：提升安装、配置、排错和交接体验。

任务：

1. CLI 诊断
   - `--doctor` 输出版本、数据目录、数据库状态、FTS5 状态、工具数量。
   - `--migrate-status` 输出迁移状态。

2. MCP 诊断工具
   - `get_service_diagnostics`

3. 文档同步
   - README 增加安装、自检、常见问题。
   - TRAE_SETUP 增加配置检查和排错。

4. 测试
   - CLI 参数测试。
   - 诊断输出不包含敏感内容。
   - 数据库缺失时能提示初始化方式。

验收命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 5. 当前建议先执行的第一模块

优先执行阶段一“知识库核心治理底座”。原因：

- 所有后续导入、检索、治理、诊断都依赖更完整的记忆 CRUD 和去重能力。
- 该阶段主要沿现有 Memory Service / Storage Adapter / MCP Tool 扩展，风险低。
- 完成后可以安全承接阶段二导入能力，避免导入后无法更新、无法查重、无法维护。

## 6. 当前目标文件结构

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

## 7. 固定验证命令

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

后续诊断能力完成后追加：

```bash
node dist/index.js --doctor
node dist/index.js --migrate-status
```

## 8. 安全要求

- 服务不主动扫描整个项目目录。
- 服务只保存 MCP 工具明确传入的内容。
- 默认不读取 `.env`。
- 默认不读取密钥文件。
- 不应写入密钥、Token、密码、数据库连接串。
- 所有记忆按项目隔离。
- 旧记忆通过归档处理，不默认物理删除。
- 导入目录时必须先经过 Import Policy。
- MCP 返回内容必须限制长度。

## 9. 后续预留能力

当前五阶段完成后，可作为独立项目继续扩展：

- Web 管理台。
- 本地 embedding。
- 向量库 Provider。
- PDF / Word 导入。
- 网页采集。
- 局域网访问。
- 团队权限和审计。

## 10. 建议提交信息

```bash
docs(knowledgebase): define full local memory roadmap
```
