import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../config.js';
import { createImportService } from '../services/import-service.js';
import { createMemoryService } from '../services/memory-service.js';
import { createProjectResolver } from '../services/project-resolver.js';
import { createRetrievalService } from '../services/retrieval-service.js';
import { createSqliteAdapter } from '../storage/sqlite-adapter.js';
import { createToolHandlers } from './tools.js';

export const toolDefinitions = [
  {
    name: 'remember_project_context',
    description: '写入当前工作区的长期项目记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        importance: { type: 'number' },
        source: { type: 'string' },
        sourcePath: { type: 'string' }
      },
      required: ['workspacePath', 'type', 'title', 'content']
    }
  },
  {
    name: 'search_project_memory',
    description: '搜索当前工作区的 active 项目记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        query: { type: 'string' },
        types: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        source: { type: 'string' },
        status: { type: 'string' },
        minImportance: { type: 'number' },
        updatedAfter: { type: 'string' },
        updatedBefore: { type: 'string' },
        includeArchived: { type: 'boolean' },
        limit: { type: 'number' }
      },
      required: ['workspacePath', 'query']
    }
  },
  {
    name: 'find_related_memories',
    description: '基于标签、来源和关键词查找当前工作区内与指定记忆相关的 active 记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryId: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['workspacePath', 'memoryId']
    }
  },
  {
    name: 'preview_knowledge_import',
    description: '预览用户明确指定的 Markdown / 文本文档导入结果，不写入数据库。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        paths: { type: 'array', items: { type: 'string' } },
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        maxFileBytes: { type: 'number' }
      },
      required: ['workspacePath', 'paths']
    }
  },
  {
    name: 'import_knowledge_files',
    description: '导入用户明确指定的 Markdown / 文本文档到当前工作区记忆库。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        paths: { type: 'array', items: { type: 'string' } },
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        maxFileBytes: { type: 'number' }
      },
      required: ['workspacePath', 'paths']
    }
  },
  {
    name: 'list_import_batches',
    description: '分页列出当前工作区的知识导入批次。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_memory_detail',
    description: '读取当前工作区内单条项目记忆详情。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryId: { type: 'string' }
      },
      required: ['workspacePath', 'memoryId']
    }
  },
  {
    name: 'update_project_memory',
    description: '更新当前工作区内单条项目记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryId: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        content: { type: 'string' },
        summary: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        importance: { type: 'number' },
        source: { type: 'string' },
        sourcePath: { type: 'string' }
      },
      required: ['workspacePath', 'memoryId']
    }
  },
  {
    name: 'detect_duplicate_memories',
    description: '按内容或记忆 ID 检测当前工作区内的重复 active 记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryId: { type: 'string' },
        content: { type: 'string' },
        limit: { type: 'number' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_project_brief',
    description: '返回项目记忆简报和最近交接记录。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        includeRecentHandoffs: { type: 'boolean' },
        limit: { type: 'number' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'record_handoff_note',
    description: '记录工程任务完成后的交接信息。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        taskTitle: { type: 'string' },
        changedFiles: { type: 'array', items: { type: 'string' } },
        changedModules: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        verification: { type: 'string' },
        risks: { type: 'string' },
        nextSteps: { type: 'string' }
      },
      required: ['workspacePath', 'taskTitle', 'changedFiles', 'changedModules', 'summary', 'verification', 'risks', 'nextSteps']
    }
  },
  {
    name: 'list_project_memories',
    description: '分页列出项目记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'number' },
        offset: { type: 'number' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'archive_project_memory',
    description: '归档过期项目记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryId: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['workspacePath', 'memoryId', 'reason']
    }
  },
  {
    name: 'bulk_archive_memories',
    description: '批量归档项目记忆，支持手动指定或按条件自动筛选。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        memoryIds: { type: 'array', items: { type: 'string' } },
        olderThanDays: { type: 'number' },
        hasNoSummary: { type: 'boolean' },
        importanceBelow: { type: 'number' },
        reason: { type: 'string' }
      },
      required: ['workspacePath', 'reason']
    }
  },
  {
    name: 'export_project_memory',
    description: '导出项目记忆为 JSON 或 Markdown 格式。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' },
        format: { type: 'string', enum: ['json', 'markdown'] },
        status: { type: 'string', enum: ['active', 'archived', 'both'] },
        types: { type: 'array', items: { type: 'string' } },
        includeArchived: { type: 'boolean' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_memory_health_report',
    description: '生成知识库健康报告，包含统计信息、风险提示和高优先级记忆。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' }
      },
      required: ['workspacePath']
    }
  },
  {
    name: 'get_service_diagnostics',
    description: '检查服务、数据库和工具状态，返回诊断信息。',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string' }
      }
    }
  }
];

export async function startMcpServer(): Promise<void> {
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
      if (name === 'bulk_archive_memories') return handlers.bulkArchiveMemories(args);
      if (name === 'export_project_memory') return handlers.exportProjectMemory(args);
      if (name === 'get_memory_health_report') return handlers.getMemoryHealthReport(args);
      if (name === 'get_service_diagnostics') return handlers.getServiceDiagnostics(args);
      throw new Error(`Unknown tool: ${name}`);
    })();

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
