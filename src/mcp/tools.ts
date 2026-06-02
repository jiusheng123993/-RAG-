import type { createImportService } from '../services/import-service.js';
import type { createMemoryService } from '../services/memory-service.js';
import type { createRetrievalService } from '../services/retrieval-service.js';
import {
  archiveProjectMemorySchema,
  bulkArchiveMemoriesSchema,
  detectDuplicateMemoriesSchema,
  exportProjectMemorySchema,
  findRelatedMemoriesSchema,
  getMemoryDetailSchema,
  getMemoryHealthReportSchema,
  getProjectBriefSchema,
  knowledgeImportSchema,
  listImportBatchesSchema,
  listProjectMemoriesSchema,
  recordHandoffNoteSchema,
  rememberProjectContextSchema,
  searchProjectMemorySchema,
  updateProjectMemorySchema
} from './schemas.js';

interface ToolDependencies {
  importService: ReturnType<typeof createImportService>;
  memoryService: ReturnType<typeof createMemoryService>;
  retrievalService: ReturnType<typeof createRetrievalService>;
}

export function createToolHandlers(dependencies: ToolDependencies) {
  return {
    async rememberProjectContext(input: unknown) {
      return dependencies.memoryService.rememberProjectContext(rememberProjectContextSchema.parse(input));
    },
    async searchProjectMemory(input: unknown) {
      return dependencies.retrievalService.searchProjectMemory(searchProjectMemorySchema.parse(input));
    },
    async findRelatedMemories(input: unknown) {
      return dependencies.retrievalService.findRelatedMemories(findRelatedMemoriesSchema.parse(input));
    },
    async previewKnowledgeImport(input: unknown) {
      return dependencies.importService.previewKnowledgeImport(knowledgeImportSchema.parse(input));
    },
    async importKnowledgeFiles(input: unknown) {
      return dependencies.importService.importKnowledgeFiles(knowledgeImportSchema.parse(input));
    },
    async listImportBatches(input: unknown) {
      return dependencies.importService.listImportBatches(listImportBatchesSchema.parse(input));
    },
    async getMemoryDetail(input: unknown) {
      return dependencies.memoryService.getMemoryDetail(getMemoryDetailSchema.parse(input));
    },
    async updateProjectMemory(input: unknown) {
      return dependencies.memoryService.updateProjectMemory(updateProjectMemorySchema.parse(input));
    },
    async detectDuplicateMemories(input: unknown) {
      return dependencies.memoryService.detectDuplicateMemories(detectDuplicateMemoriesSchema.parse(input));
    },
    async getProjectBrief(input: unknown) {
      return dependencies.memoryService.getProjectBrief(getProjectBriefSchema.parse(input));
    },
    async recordHandoffNote(input: unknown) {
      return dependencies.memoryService.recordHandoffNote(recordHandoffNoteSchema.parse(input));
    },
    async listProjectMemories(input: unknown) {
      return dependencies.memoryService.listProjectMemories(listProjectMemoriesSchema.parse(input));
    },
    async archiveProjectMemory(input: unknown) {
      return dependencies.memoryService.archiveProjectMemory(archiveProjectMemorySchema.parse(input));
    },
    async bulkArchiveMemories(input: unknown) {
      return dependencies.memoryService.bulkArchiveMemories(bulkArchiveMemoriesSchema.parse(input));
    },
    async exportProjectMemory(input: unknown) {
      return dependencies.memoryService.exportProjectMemory(exportProjectMemorySchema.parse(input));
    },
    async getMemoryHealthReport(input: unknown) {
      return dependencies.memoryService.getMemoryHealthReport(getMemoryHealthReportSchema.parse(input));
    }
  };
}
