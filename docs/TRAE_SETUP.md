# Trae MCP 接入说明

本文说明如何把本地项目记忆 MCP 服务接入 Trae。

当前已写入以下配置文件：

- `C:\Users\Administrator\AppData\Roaming\Trae CN\User\mcp.json`
- `C:\Users\Administrator\.trae\mcp.json`

已创建备份：

- `C:\Users\Administrator\AppData\Roaming\Trae CN\User\mcp.json.bak-local-project-memory`
- `C:\Users\Administrator\.trae\mcp.json.bak-local-project-memory`

## 1. 构建服务

在项目根目录执行：

```bash
npm install
npm run build
```

## 2. 推荐数据目录

建议把记忆数据库放在项目目录外或项目根目录下的专用数据目录中。

当前建议：

```text
E:\个人本地知识库\.memory-data
```

服务会在该目录下创建：

```text
memory.db
```

## 3. MCP 配置示例

根据 Trae 当前 MCP 配置位置添加：

```json
{
  "mcpServers": {
    "local-project-memory": {
      "command": "node",
      "args": [
        "E:/个人本地知识库/dist/index.js"
      ],
      "env": {
        "LOCAL_PROJECT_MEMORY_HOME": "E:/个人本地知识库/.memory-data"
      }
    }
  }
}
```

如果后续调整 `tsconfig.json` 输出目录，需要同步修改 `args` 路径。

## 4. 建议 Trae 使用流程

### 新会话开始

优先调用：

```text
get_project_brief
```

用途：

- 读取项目背景。
- 读取最近交接记录。
- 读取重要架构规则。
- 读取风险和禁止修改区域。

### 开发前

调用：

```text
search_project_memory
```

推荐搜索：

- 当前模块名。
- 当前文件名。
- 当前需求关键词。
- 权限、安全、数据库、缓存等高风险词。

### 开发完成后

调用：

```text
record_handoff_note
```

记录：

- 改了什么。
- 为什么这样改。
- 涉及哪些文件和模块。
- 运行了哪些验证命令。
- 剩余风险。
- 下一步建议。

### 沉淀长期规则

调用：

```text
remember_project_context
```

适合记录：

- 项目目标。
- 架构约定。
- 模块边界。
- 扩展点。
- 常用命令。
- 禁止修改区域。
- 历史踩坑。

### 废弃旧规则

调用：

```text
archive_project_memory
```

用途：

- 归档已过期架构。
- 归档废弃规则。
- 避免后续 Agent 被旧记忆误导。

## 5. MCP 工具列表

| 工具 | 使用场景 |
|---|---|
| `remember_project_context` | 写入长期项目记忆 |
| `search_project_memory` | 搜索当前项目记忆 |
| `get_project_brief` | 新会话读取项目简报 |
| `record_handoff_note` | 任务完成后写交接记录 |
| `list_project_memories` | 分页查看项目记忆 |
| `archive_project_memory` | 归档过期记忆 |

## 6. 安全提醒

不要写入以下内容：

- 密钥
- Token
- 密码
- 数据库连接串
- 私有证书
- API Key
- OAuth Secret
- 用户隐私数据
- 生产环境配置

服务不会主动扫描整个项目目录，只会保存 MCP 工具明确传入的内容。

## 7. 本地验证命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
node dist/index.js --print-config
```

预期：

- 类型检查通过。
- lint 通过。
- 测试通过。
- 构建通过。
- 打印出 `dataHome` 和 `databasePath`。
