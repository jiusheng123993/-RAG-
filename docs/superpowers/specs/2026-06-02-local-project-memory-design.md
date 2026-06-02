# 本地项目记忆 MCP 服务设计规格

## 目标

构建一个本地运行、可长期维护、可交接、可扩展的个人本地知识库与项目记忆 MCP 服务，让 Trae 能够在不同会话、不同 Agent、不同开发周期中安全读取、写入、搜索、维护和交接项目知识。系统优先服务“项目记忆”和“本地知识库”场景，默认数据保存在本机 SQLite 数据库中，不依赖国外 SaaS 服务，不默认调用外部模型接口。

本规格在第一版项目记忆能力基础上继续扩展，要求继承现有架构，不推翻重写：MCP 层只负责工具暴露与参数校验，业务规则放在 Service 层，数据读写由 Storage Adapter 封装，检索能力由 Retrieval Service 统一编排，文档导入与模型/向量能力通过 Adapter / Provider 扩展。

## 当前已实现范围

当前版本已实现：

- 本地 MCP Server。
- 本地 SQLite 数据库。
- SQLite FTS5 全文检索，并为中文关键词提供 LIKE 兜底检索。
- 项目级记忆隔离。
- 项目上下文写入。
- 项目记忆搜索。
- 项目交接摘要读取。
- 任务完成后的 handoff note 记录。
- 过期记忆归档。
- 为后续本地模型、向量检索、Web 管理台、文档导入器预留 Provider 接口。

当前已暴露 6 个 MCP 工具：

- `remember_project_context`
- `search_project_memory`
- `get_project_brief`
- `record_handoff_note`
- `list_project_memories`
- `archive_project_memory`

## 完整升级范围

后续完善分为五个阶段，按模块串行推进，每个阶段必须独立测试、独立交接、可回滚。

### 阶段一：知识库核心治理底座

状态：已完成。

目标是在不破坏第一版数据和工具契约的前提下，增强记忆的可维护性、可治理性和可追溯性。

实现能力：

- 记忆详情读取。
- 记忆内容更新。
- 标题、摘要、内容、标签、重要级别、来源等字段的兼容更新。
- 内容 hash 去重。
- 来源路径记录。
- 标签规范化。
- 记忆更新时间维护。
- 批量归档能力预留。
- 重复记忆检测能力预留。
- 后续导入批次和 chunk 结构预留。

新增 MCP 工具建议：

- `get_memory_detail`
- `update_project_memory`
- `detect_duplicate_memories`

验收标准：

- 旧的 6 个 MCP 工具保持兼容。
- 旧数据库可自动迁移。
- 能读取单条记忆详情。
- 能更新单条记忆并同步 FTS 索引。
- 相同项目内可识别重复内容。
- 不同项目之间仍严格隔离。

### 阶段二：本地文档导入能力

状态：已完成。

目标是把用户明确指定的本地 Markdown / 文本资料导入项目记忆库，形成真正可增长的本地知识库。

实现能力：

- 导入用户显式传入的文件。
- 导入用户显式传入的目录。
- 支持 Markdown 和纯文本。
- 支持 dry-run 预览，不写入数据库。
- 支持 include / exclude 规则。
- 支持默认跳过 `.git`、`node_modules`、`dist`、`build`、`.env`、证书、密钥、数据库文件、压缩包等高风险路径或无关目录。
- 支持文件大小上限，避免超大文件塞爆上下文或数据库。
- 支持标题提取：Markdown 一级标题优先，其次 frontmatter title，其次文件名。
- 支持标签提取：frontmatter tags、目录名、用户传入标签。
- 支持导入批次记录。
- 支持重复内容跳过。
- 支持导入结果摘要。

新增模块建议：

- `src/importers/document-parser.ts`
- `src/importers/import-policy.ts`
- `src/services/import-service.ts`

新增 MCP 工具建议：

- `preview_knowledge_import`
- `import_knowledge_files`
- `list_import_batches`

验收标准：

- 不主动扫描整个项目或磁盘。
- 只导入用户明确指定路径。
- 默认不读取敏感文件。
- dry-run 与实际导入结果一致。
- 重复文件不会重复写入。
- 导入失败时返回安全、可理解的错误，不暴露系统敏感路径之外的内部细节。

### 阶段三：检索增强

状态：待实现。

目标是在 SQLite FTS5 + 中文 LIKE 兜底基础上增强搜索质量，同时为后续向量检索预留策略扩展。

实现能力：

- 标题、摘要、内容、标签、来源路径综合检索。
- 按类型过滤。
- 按标签过滤。
- 按来源过滤。
- 按重要级别过滤。
- 按状态过滤。
- 按时间范围过滤。
- 命中字段标记。
- 结果摘要裁剪。
- 相关性、重要级别、更新时间综合排序。
- 最大返回数量限制。
- 空查询保护。
- 为后续 `RetrievalStrategy` 预留扩展。

新增或增强工具建议：

- 增强 `search_project_memory` 参数但保持向后兼容。
- `find_related_memories`

验收标准：

- 旧搜索调用方式仍可用。
- 中文关键词可检索。
- 标签过滤准确。
- limit 生效且有上限。
- 搜索结果不会返回过长内容。

### 阶段四：知识维护与治理工具

目标是让知识库长期不腐化，避免旧规则、重复知识和低质量记录误导后续 Agent。

实现能力：

- 批量归档。
- 按状态、类型、标签、来源分页列表。
- 导出项目记忆。
- 生成知识库健康报告。
- 统计记忆数量、类型分布、重复率、过期风险、缺少摘要比例、低重要级别占比。
- 对 `do_not_touch`、`risk`、`decision`、`architecture` 等高优先级记忆做突出展示。
- 支持归档过期规则而不是物理删除。

新增 MCP 工具建议：

- `bulk_archive_memories`
- `export_project_memory`
- `get_memory_health_report`

验收标准：

- 批量操作必须限制在当前项目内。
- 导出默认不包含 archived 记忆，除非显式指定。
- 健康报告能指出重复、过期、缺摘要、低质量风险。
- 高优先级记忆在 brief 或治理报告中优先展示。

### 阶段五：接入体验与诊断

目标是降低 Trae 接入、运行、排错、迁移和后续维护成本。

实现能力：

- 打印数据库路径、数据目录、服务版本。
- 数据库迁移状态检查。
- FTS5 可用性检查。
- MCP 工具定义检查。
- 当前项目识别诊断。
- Trae 配置检查建议。
- README 与 Trae 接入说明同步更新。

新增 CLI 建议：

- `node dist/index.js --doctor`
- `node dist/index.js --migrate-status`

验收标准：

- 新用户可以通过文档完成本地安装、构建、配置和自检。
- 诊断命令不会打印敏感信息。
- 常见错误有可执行的排查建议。

## 非目标

当前完整升级仍不默认实现：

- 云同步。
- 团队多用户权限。
- 浏览器插件。
- 完整 Web UI。
- 默认调用外部模型接口。
- 默认全盘扫描。
- 自动读取 `.env`、证书、密钥文件。
- 物理删除记忆。
- 替换 SQLite 为远程数据库。

Web 管理台、向量库、PDF/Word 解析、团队权限可以作为后续独立阶段，不应混入当前五阶段主线。

## 技术栈

- TypeScript
- Node.js
- `@modelcontextprotocol/sdk`
- Node 内置 SQLite
- SQLite FTS5
- Zod
- Vitest
- ESLint

## 架构

```text
Trae
  |
  | MCP Tool Call
  v
MCP Server
  |
  v
Tool Handler Layer
  |
  +--> Memory Service
  |      |
  |      +--> Project Resolver
  |      +--> Storage Adapter
  |
  +--> Retrieval Service
  |      |
  |      +--> Storage Adapter
  |      +--> Retrieval Strategy
  |
  +--> Import Service
  |      |
  |      +--> Knowledge Importer
  |      +--> Import Policy
  |      +--> Storage Adapter
  |
  +--> Diagnostics Service
  |
  v
Node 内置 SQLite + FTS5
  |
  +--> Provider Interfaces
         +--> EmbeddingProvider
         +--> LLMProvider
         +--> VectorStoreProvider
```

## 模块边界

### MCP Layer

职责：

- 暴露 MCP tools。
- 校验入参。
- 调用服务层。
- 返回结构化结果。

禁止：

- 直接操作数据库。
- 写复杂业务逻辑。
- 拼接 SQL。
- 处理项目识别细节。
- 处理文件导入细节。

### Memory Service

职责：

- 创建记忆。
- 查询记忆详情。
- 更新记忆。
- 归档记忆。
- 创建交接记录。
- 生成项目简报。
- 管理记忆类型、状态、重要级别、标签规范化和去重规则。

### Project Resolver

职责：

- 归一化 workspace path。
- 读取 Git remote。
- 读取 Git branch。
- 生成 project fingerprint。
- 确保不同项目和分支记忆隔离。

项目指纹规则：

```text
hash(normalizedWorkspacePath + gitRemote + gitBranch)
```

非 Git 项目：

```text
hash(normalizedWorkspacePath)
```

### Retrieval Service

职责：

- SQLite FTS5 搜索。
- 中文 LIKE 兜底检索。
- 按项目过滤。
- 按记忆类型、标签、状态、来源、时间过滤。
- 结果排序、裁剪和命中字段标记。
- 为后续向量检索保留策略扩展。

### Import Service

职责：

- 接收用户明确指定的文件或目录。
- 调用 Import Policy 判断路径是否允许导入。
- 调用 Parser 解析 Markdown / 文本。
- 生成记忆写入请求。
- 记录导入批次和导入结果。
- 处理重复内容跳过。

禁止：

- 默认扫描全盘。
- 默认读取敏感文件。
- 把路径安全判断散落到 MCP 层。
- 在解析器里直接写数据库。

### Storage Adapter

职责：

- SQLite 连接管理。
- 数据库初始化。
- 表结构迁移。
- FTS5 索引维护。
- 记忆 CRUD。
- 导入批次 CRUD。
- 软归档。

禁止：

- 承载 MCP 参数校验。
- 承载业务层权限和策略判断。
- 泄露 SQL 细节到上层。

## 数据模型

### projects

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text | 项目 ID |
| name | text | 项目名称 |
| workspace_path | text | 本地项目路径 |
| git_remote | text nullable | Git remote |
| git_branch | text nullable | Git 分支 |
| fingerprint | text unique | 项目指纹 |
| created_at | text | 创建时间 |
| updated_at | text | 更新时间 |
| last_accessed_at | text | 最后访问时间 |

### memories

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text | 记忆 ID |
| project_id | text | 所属项目 |
| type | text | 记忆类型 |
| title | text | 标题 |
| content | text | 内容 |
| summary | text nullable | 摘要 |
| source | text | 来源 |
| source_path | text nullable | 来源文件路径或来源标识 |
| content_hash | text nullable | 内容 hash，用于去重 |
| tags | text | JSON 字符串 |
| status | text | active / archived |
| importance | integer | 重要级别 1-5 |
| created_at | text | 创建时间 |
| updated_at | text | 更新时间 |
| archived_at | text nullable | 归档时间 |

### handoff_notes

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text | 交接记录 ID |
| project_id | text | 所属项目 |
| task_title | text | 任务标题 |
| changed_files | text | JSON 字符串 |
| changed_modules | text | JSON 字符串 |
| summary | text | 修改摘要 |
| verification | text | 验证结果 |
| risks | text | 剩余风险 |
| next_steps | text | 下一步建议 |
| created_at | text | 创建时间 |

### import_batches

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text | 导入批次 ID |
| project_id | text | 所属项目 |
| root_path | text | 导入根路径 |
| status | text | completed / failed / partial |
| total_files | integer | 扫描到的候选文件数量 |
| imported_count | integer | 成功导入数量 |
| skipped_count | integer | 跳过数量 |
| failed_count | integer | 失败数量 |
| options | text | JSON 字符串 |
| created_at | text | 创建时间 |

### import_items

| 字段 | 类型 | 说明 |
|---|---|---|
| id | text | 导入条目 ID |
| batch_id | text | 所属批次 |
| memory_id | text nullable | 关联记忆 ID |
| file_path | text | 文件路径 |
| status | text | imported / skipped / failed |
| reason | text nullable | 跳过或失败原因 |
| content_hash | text nullable | 文件内容 hash |
| created_at | text | 创建时间 |

## 记忆类型

支持类型：

- `project_overview`
- `architecture`
- `module_boundary`
- `coding_rule`
- `risk`
- `decision`
- `handoff`
- `test_record`
- `known_issue`
- `do_not_touch`
- `extension_point`
- `command`
- `knowledge`
- `document`

## MCP 工具契约

### 已有工具保持兼容

- `remember_project_context`：写入项目背景、架构约定、模块边界、风险、规则等长期记忆。
- `search_project_memory`：在当前项目内搜索 active 记忆。
- `get_project_brief`：获取当前项目交接摘要，适合 Trae 新会话开头自动调用。
- `record_handoff_note`：每次任务完成后记录变更、验证、风险、下一步建议。
- `list_project_memories`：查看当前项目已有记忆，支持分页和类型过滤。
- `archive_project_memory`：归档过期记忆，避免旧规则误导后续 Agent。

### 新增工具分阶段引入

阶段一：

- `get_memory_detail`
- `update_project_memory`
- `detect_duplicate_memories`

阶段二：

- `preview_knowledge_import`
- `import_knowledge_files`
- `list_import_batches`

阶段三：

- `find_related_memories`

阶段四：

- `bulk_archive_memories`
- `export_project_memory`
- `get_memory_health_report`

阶段五：

- `get_service_diagnostics`

## 安全规则

- 不主动扫描整个项目目录。
- 只保存 MCP 工具明确传入的内容。
- 默认不读取 `.env`。
- 默认不读取密钥文件。
- 不保存密钥、Token、密码、数据库连接串。
- 不打印完整记忆内容到日志。
- 所有记忆按项目隔离。
- 归档旧记忆，不默认物理删除。
- MCP 返回内容限制长度，避免塞爆上下文。
- 文件导入必须经过 Import Policy 判断。
- 目录导入必须有默认忽略规则和最大文件大小限制。

## 扩展点

- `EmbeddingProvider`：后续用于本地向量化。
- `LLMProvider`：后续用于摘要、问答、记忆压缩。
- `VectorStoreProvider`：后续用于替换或增强 FTS5。
- `RetrievalStrategy`：后续在 FTS、LIKE、向量检索之间切换或融合排序。
- `KnowledgeImporter`：后续支持 Markdown、纯文本、PDF、Word、网页、本地文档目录。
- `ImportPolicy`：集中管理路径安全、忽略规则、文件大小上限和格式白名单。
- Web 管理台：后续查看项目、编辑记忆、归档旧记忆、配置本地模型。

## 测试要求

每个阶段必须补充或更新测试：

- 正常流程测试。
- 边界输入测试。
- 异常输入测试。
- 空值输入测试。
- 重复请求或重复内容测试。
- 项目隔离测试。
- 敏感路径跳过测试。
- FTS 索引同步测试。
- 旧工具兼容测试。

固定验证命令：

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 验收标准

完整升级完成后应满足：

- 能启动 MCP Server。
- Trae 能识别 MCP 工具。
- 能写入当前项目记忆。
- 能搜索当前项目记忆。
- 能读取、更新、归档、治理记忆。
- 能预览并导入用户显式指定的 Markdown / 文本文档。
- 不同项目记忆不会串。
- 能生成项目 brief。
- 能记录 handoff note。
- 能检测重复记忆。
- 能生成知识库健康报告。
- 能诊断本地服务配置和数据库状态。
- 数据全部存在本机 SQLite。
- 不依赖国外服务。
- 不默认调用外部模型接口。
- 测试通过。
- TypeScript 类型检查通过。
- lint 通过。
- 构建通过。
- README 和 Trae 接入说明同步更新。
