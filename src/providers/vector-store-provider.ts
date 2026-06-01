export interface VectorSearchResult {
  id: string;
  score: number;
}

export interface VectorStoreProvider {
  upsert(id: string, vector: number[], metadata: Record<string, string>): Promise<void>;
  search(vector: number[], limit: number): Promise<VectorSearchResult[]>;
}
