# 本地项目记忆 MCP 服务

这是一个本地运行的 Trae 项目记忆 MCP 服务。

第一版目标是让 Trae 能够按项目写入、搜索、读取、归档项目记忆。数据默认保存在本机 SQLite 数据库中，不依赖国外 SaaS 服务。

## 第一版范围

已实现的核心能力：

- 记住项目背景、架构、模块边界、风险、规则。
- 搜索当前项目记忆。
- 获取项目交接摘要。
- 记录任务完成后的交接记录。
- 归档过期记忆。
- 按工作区路径、Git remote、Git branch 生成项目指纹。
- 为本地模型、向量库、Web 管理台预留扩展接口。

第一版暂不做：

- 通用网页收藏。
- PDF、Word、Markdown 批量知识库导入。
- 完整 Web UI。
- 浏览器插件。
- 团队多用户权限。
- 云同步。
- 默认调用外部模型接口。

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

当前提供 6 个工具：

| 工具 | 作用 |
|---|---|
| `remember_project_context` | 写入项目背景、架构约定、模块边界、风险、规则等长期记忆 |
| `search_project_memory` | 搜索当前项目内的 active 记忆 |
| `get_project_brief` | 获取项目简报和最近交接记录 |
| `record_handoff_note` | 记录任务完成后的交接信息 |
| `list_project_memories` | 分页列出项目记忆 |
| `archive_project_memory` | 归档过期项目记忆 |

## 安全边界

- 服务不会主动扫描整个项目目录。
- 服务只保存 MCP 工具明确传入的内容。
- 不要把密钥、Token、密码、数据库连接串写入记忆。
- 默认不读取 `.env`。
- 默认不读取密钥文件。
- 过期规则应该归档，避免后续 Agent 被旧规则误导。

## 后续扩展方向

- 接入 Ollama、LM Studio 或本地 embedding 模型。
- 增加向量库 Provider。
- 增加 Web 管理台。
- 增加通用知识库导入器。
- 增加局域网访问。
- 增加团队权限和审计能力。
