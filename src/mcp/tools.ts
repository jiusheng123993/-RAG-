import type { createMemoryService } from '../services/memory-service.js';
import type { createRetrievalService } from '../services/retrieval-service.js';
import {
  archiveProjectMemorySchema,
  detectDuplicateMemoriesSchema,
  getMemoryDetailSchema,
  getProjectBriefSchema,
  listProjectMemoriesSchema,
  recordHandoffNoteSchema,
  rememberProjectContextSchema,
  searchProjectMemorySchema,
  updateProjectMemorySchema
} from './schemas.js';

interface ToolDependencies {
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
    }
  };
}
