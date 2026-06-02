import express from 'express';
import type { Request, Response } from 'express';
import { loadConfig } from '../config.js';
import { createImportService } from '../services/import-service.js';
import { createMemoryService } from '../services/memory-service.js';
import { createProjectResolver } from '../services/project-resolver.js';
import { createRetrievalService } from '../services/retrieval-service.js';
import { createSqliteAdapter } from '../storage/sqlite-adapter.js';
import { createToolHandlers } from './tools.js';
import { toolDefinitions } from './server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';

const transports: Record<string, StreamableHTTPServerTransport> = {};

async function startHttpMcpServer(port: number = 3107): Promise<void> {
  const config = loadConfig();
  const adapter = createSqliteAdapter(config.databasePath);
  adapter.initialize();
  const resolver = createProjectResolver();
  const handlers = createToolHandlers({
    importService: createImportService(adapter, resolver),
    memoryService: createMemoryService(adapter, resolver),
    retrievalService: createRetrievalService(adapter, resolver)
  });

  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const server = new Server({ name: 'local-project-memory', version: '0.1.0' }, { capabilities: { tools: {} } });

  const { ListToolsRequestSchema, CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');

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

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'local-project-memory' });
  });

  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId) => {
            transports[newSessionId] = transport;
          }
        });
        await transport.start();
        await server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling POST /mcp:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (!sessionId || !transports[sessionId]) {
        res.status(400).send('Invalid or missing session ID');
        return;
      }
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling GET /mcp:', error);
      if (!res.headersSent) {
        res.status(500).send('Internal server error');
      }
    }
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].close();
        delete transports[sessionId];
      }
      res.status(200).send('Session terminated');
    } catch (error) {
      console.error('Error handling DELETE /mcp:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  });

  const cleanup = async () => {
    console.log('Shutting down server...');
    for (const sid in transports) {
      try {
        await transports[sid].close();
      } catch (e) {
        console.error(`Error closing transport ${sid}:`, e);
      }
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  app.listen(port, '127.0.0.1', () => {
    console.log(`HTTP MCP Server running on http://127.0.0.1:${port}/mcp`);
  });

  process.stdin.resume();
}

export { startHttpMcpServer };
