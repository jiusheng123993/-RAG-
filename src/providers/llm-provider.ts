export interface LLMProvider {
  summarize(input: string): Promise<string>;
  answerWithContext(question: string, contexts: string[]): Promise<string>;
}
