import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../config.js';
import { createMemoryService } from '../services/memory-service.js';
import { createProjectResolver } from '../services/project-resolver.js';
import { createRetrievalService } from '../services/retrieval-service.js';
import { createSqliteAdapter } from '../storage/sqlite-adapter.js';
import { createToolHandlers } from './tools.js';

const toolDefinitions = [
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
        source: { type: 'string' }
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
        limit: { type: 'number' }
      },
      required: ['workspacePath', 'query']
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
  }
];

export async function startMcpServer(): Promise<void> {
  const config = loadConfig();
  const adapter = createSqliteAdapter(config.databasePath);
  adapter.initialize();
  const resolver = createProjectResolver();
  const handlers = createToolHandlers({
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
      if (name === 'get_project_brief') return handlers.getProjectBrief(args);
      if (name === 'record_handoff_note') return handlers.recordHandoffNote(args);
      if (name === 'list_project_memories') return handlers.listProjectMemories(args);
      if (name === 'archive_project_memory') return handlers.archiveProjectMemory(args);
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
