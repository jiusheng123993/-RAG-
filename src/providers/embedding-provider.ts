export interface EmbeddingProvider {
  embedText(input: string): Promise<number[]>;
  embedBatch(inputs: string[]): Promise<number[][]>;
}
