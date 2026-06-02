# 本地项目记忆 MCP 服务

这是一个本地运行的 Trae 项目记忆 MCP 服务，正在升级为更完整的个人本地知识库底座。

当前稳定能力是让 Trae 能够按项目写入、搜索、读取、归档项目记忆。数据默认保存在本机 SQLite 数据库中，不依赖国外 SaaS 服务，不默认调用外部模型接口。

## 当前已实现范围

已实现的核心能力：

- 记住项目背景、架构、模块边界、风险、规则。
- 搜索当前项目记忆。
- 获取项目交接摘要。
- 记录任务完成后的交接记录。
- 读取单条记忆详情。
- 更新单条项目记忆。
- 检测当前项目内重复记忆。
- 归档过期记忆。
- 记录来源路径和内容 hash。
- 按工作区路径、Git remote、Git branch 生成项目指纹。
- SQLite FTS5 全文检索，并为中文关键词提供 LIKE 兜底检索。
- 为本地模型、向量库、Web 管理台、知识导入器预留扩展接口。

当前暂不默认实现：

- 云同步。
- 团队多用户权限。
- 浏览器插件。
- 完整 Web UI。
- 默认调用外部模型接口。
- 默认全盘扫描。
- 自动读取 `.env`、证书、密钥文件。
- 物理删除记忆。

## 升级路线

完整知识库能力按模块串行推进：

1. 知识库核心治理底座：已完成记忆详情、更新、内容 hash、来源路径、重复检测。
2. 本地文档导入能力：待实现显式导入 Markdown / 文本文件或目录，支持 dry-run、跳过敏感路径和导入批次。
3. 检索增强：标签、来源、状态、时间、重要级别过滤，以及结果裁剪和排序增强。
4. 知识维护与治理工具：批量归档、导出、知识库健康报告。
5. 接入体验与诊断：本地 doctor、迁移状态、MCP 工具和数据库健康检查。

详细规格见：

- `docs/superpowers/specs/2026-06-02-local-project-memory-design.md`
- `docs/superpowers/plans/2026-06-02-local-project-memory-implementation.md`

## 技术栈

- TypeScript
- Node.js
- MCP SDK
- Node 内置 SQLite
- SQLite FTS5
- Zod
- Vitest
- ESLint

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 检查

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 打印配置

```bash
node dist/index.js --print-config
```

输出示例：

```json
{
  "dataHome": "C:\\Users\\你的用户名\\.local-project-memory",
  "databasePath": "C:\\Users\\你的用户名\\.local-project-memory\\memory.db"
}
```

## 数据目录

默认数据目录：

```text
%USERPROFILE%\.local-project-memory\memory.db
```

可以通过环境变量覆盖：

```text
LOCAL_PROJECT_MEMORY_HOME=E:\个人本地知识库\.memory-data
```

## MCP 工具

当前已实现 9 个工具：

| 工具 | 作用 |
|---|---|
| `remember_project_context` | 写入项目背景、架构约定、模块边界、风险、规则等长期记忆 |
| `search_project_memory` | 搜索当前项目内的 active 记忆 |
| `get_memory_detail` | 读取当前项目内单条记忆详情 |
| `update_project_memory` | 更新当前项目内单条记忆 |
| `detect_duplicate_memories` | 按内容或记忆 ID 检测当前项目内重复 active 记忆 |
| `get_project_brief` | 获取项目简报和最近交接记录 |
| `record_handoff_note` | 记录任务完成后的交接信息 |
| `list_project_memories` | 分页列出项目记忆 |
| `archive_project_memory` | 归档过期项目记忆 |

后续规划工具按阶段引入，未实现前不要在 Trae 配置或工作流中假设可用。

| 阶段 | 规划工具 |
|---|---|
| 本地文档导入 | `preview_knowledge_import`、`import_knowledge_files`、`list_import_batches` |
| 检索增强 | `find_related_memories` |
| 知识维护与治理 | `bulk_archive_memories`、`export_project_memory`、`get_memory_health_report` |
| 接入体验与诊断 | `get_service_diagnostics` |

## 安全边界

- 服务不会主动扫描整个项目目录。
- 服务只保存 MCP 工具明确传入的内容。
- 不要把密钥、Token、密码、数据库连接串写入记忆。
- 默认不读取 `.env`。
- 默认不读取密钥文件。
- 过期规则应该归档，避免后续 Agent 被旧规则误导。
- 后续文件导入必须只处理用户明确指定的路径，并经过 Import Policy 判断。

## 后续扩展方向

- 接入 Ollama、LM Studio 或本地 embedding 模型。
- 增加向量库 Provider。
- 增加 Web 管理台。
- 增加通用知识库导入器。
- 增加局域网访问。
- 增加团队权限和审计能力。
