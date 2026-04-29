export interface PromptManifestEntry {
  name: string;
  version: number;
  owner: string;
  purpose: string;
}

export const PROMPT_MANIFEST: Record<string, PromptManifestEntry> = {
  'rag-system': {
    name: 'rag-system',
    version: 1,
    owner: 'ai-module',
    purpose: 'System prompt for RAG chat. Instructs the model to answer questions about tasks using provided context only.',
  },
  'task-creation': {
    name: 'task-creation',
    version: 1,
    owner: 'ai-module',
    purpose: 'Prompt for extracting structured task data from natural language input.',
  },
  'guardrail': {
    name: 'guardrail',
    version: 1,
    owner: 'ai-module',
    purpose: 'Prompt for evaluating LLM outputs for safety and policy compliance.',
  },
};

export function getPromptVersion(name: string): number {
  return PROMPT_MANIFEST[name]?.version ?? 0;
}
