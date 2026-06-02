import { z } from 'zod';
import { memoryTypes } from '../types/memory.js';

export const rememberProjectContextSchema = z.object({
  workspacePath: z.string().min(1),
  type: z.enum(memoryTypes),
  title: z.string().min(1),
  content: z.string().min(1),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  source: z.string().optional(),
  sourcePath: z.string().nullable().optional()
});

export const getMemoryDetailSchema = z.object({
  workspacePath: z.string().min(1),
  memoryId: z.string().min(1)
});

export const updateProjectMemorySchema = z.object({
  workspacePath: z.string().min(1),
  memoryId: z.string().min(1),
  type: z.enum(memoryTypes).optional(),
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  importance: z.number().int().min(1).max(5).optional(),
  source: z.string().optional(),
  sourcePath: z.string().nullable().optional()
});

export const detectDuplicateMemoriesSchema = z.object({
  workspacePath: z.string().min(1),
  memoryId: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const searchProjectMemorySchema = z.object({
  workspacePath: z.string().min(1),
  query: z.string().min(1),
  types: z.array(z.enum(memoryTypes)).optional(),
  limit: z.number().int().min(1).max(50).optional()
});

export const knowledgeImportSchema = z.object({
  workspacePath: z.string().min(1),
  paths: z.array(z.string().min(1)).min(1),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  maxFileBytes: z.number().int().min(1).optional()
});

export const listImportBatchesSchema = z.object({
  workspacePath: z.string().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const getProjectBriefSchema = z.object({
  workspacePath: z.string().min(1),
  includeRecentHandoffs: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

export const recordHandoffNoteSchema = z.object({
  workspacePath: z.string().min(1),
  taskTitle: z.string().min(1),
  changedFiles: z.array(z.string()),
  changedModules: z.array(z.string()),
  summary: z.string().min(1),
  verification: z.string(),
  risks: z.string(),
  nextSteps: z.string()
});

export const listProjectMemoriesSchema = z.object({
  workspacePath: z.string().min(1),
  type: z.enum(memoryTypes).optional(),
  status: z.enum(['active', 'archived']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

export const archiveProjectMemorySchema = z.object({
  workspacePath: z.string().min(1),
  memoryId: z.string().min(1),
  reason: z.string().min(1)
});
