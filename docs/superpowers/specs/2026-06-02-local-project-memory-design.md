# 本地项目记忆 MCP 服务设计规格

## 目标

构建一个本地运行的项目记忆服务，让 Trae 能够通过 MCP 在不同会话、不同 Agent、不同开发周期中读取和写入项目记忆。第一版只服务 Trae 项目记忆，不做通用网页、PDF、文档知识库导入。

## 第一版范围

第一版实现：

- 本地 MCP Server。
- 本地 SQLite 数据库。
- SQLite FTS5 全文检索，并为中文关键词提供 LIKE 兜底检索。
- 项目级记忆隔离。
- 项目上下文写入。
- 项目记忆搜索。
- 项目交接摘要读取。
- 任务完成后的 handoff note 记录。
- 过期记忆归档。
- 为后续本地模型、向量检索、Web 管理台、文档导入器预留接口。

## 非目标

第一版不实现：

- 通用网页收藏。
- PDF、Word、Markdown 批量导入。
- 完整 Web UI。
- 浏览器插件。
- 团队多用户权限。
- 云同步。
- 默认调用外部模型接口。
- 自动扫描敏感文件。
- 物理删除记忆。

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
  v
Memory Service
  |
  +--> Project Resolver
  +--> Retrieval Service
  +--> Storage Adapter
  +--> Provider Interfaces
          +--> EmbeddingProvider
          +--> LLMProvider
          +--> VectorStoreProvider
  |
  v
Node 内置 SQLite + FTS5
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

### Memory Service

职责：

- 创建记忆。
- 查询记忆。
- 归档记忆。
- 创建交接记录。
- 生成项目简报。
- 管理记忆类型、状态、重要级别。

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

第一版职责：

- SQLite FTS5 搜索。
- 中文 LIKE 兜底检索。
- 按项目过滤。
- 按记忆类型过滤。
- 按状态过滤。
- 按时间倒序。

### Storage Adapter

第一版职责：

- SQLite 连接管理。
- 数据库初始化。
- 表结构迁移。
- FTS5 索引维护。
- 软归档。

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

## 记忆类型

第一版支持：

- project_overview
- architecture
- module_boundary
- coding_rule
- risk
- decision
- handoff
- test_record
- known_issue
- do_not_touch
- extension_point
- command

## MCP 工具

- `remember_project_context`：写入项目背景、架构约定、模块边界、风险、规则等长期记忆。
- `search_project_memory`：在当前项目内搜索 active 记忆。
- `get_project_brief`：获取当前项目交接摘要，适合 Trae 新会话开头自动调用。
- `record_handoff_note`：每次任务完成后记录变更、验证、风险、下一步建议。
- `list_project_memories`：查看当前项目已有记忆，支持分页和类型过滤。
- `archive_project_memory`：归档过期记忆，避免旧规则误导后续 Agent。

## 本地数据目录

默认目录：

```text
%USERPROFILE%\.local-project-memory\
```

支持环境变量覆盖：

```text
LOCAL_PROJECT_MEMORY_HOME=E:\local-project-memory-data
```

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

## 后续扩展点

- `EmbeddingProvider`：后续用于本地向量化。
- `LLMProvider`：后续用于摘要、问答、记忆压缩。
- `VectorStoreProvider`：后续用于替换或增强 FTS5。
- Web 管理台：后续查看项目、编辑记忆、归档旧记忆、配置本地模型。
- 通用知识库导入器：第二阶段后再支持 Markdown、PDF、网页、本地文档目录。

## 验收标准

- 能启动 MCP Server。
- Trae 能识别 MCP 工具。
- 能写入当前项目记忆。
- 能搜索当前项目记忆。
- 不同项目记忆不会串。
- 能生成项目 brief。
- 能记录 handoff note。
- 能归档过期记忆。
- 数据全部存在本机 SQLite。
- 不依赖国外服务。
- 测试通过。
- TypeScript 类型检查通过。
- lint 通过。
- 提供 Trae 接入说明。
