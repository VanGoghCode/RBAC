import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { withRetry } from '../retry/retry-policy';
import type { LlmClient, LlmOptions, LlmResponse } from './llm-client.interface';

export class BedrockLlmClient implements LlmClient {
  constructor(
    private readonly client: BedrockRuntimeClient,
    private readonly modelId: string,
    private readonly defaults: { maxTokens: number; temperature: number; timeoutMs: number } = {
      maxTokens: 1024,
      temperature: 0.3,
      timeoutMs: 30000,
    },
  ) {}

  async complete(prompt: string, options?: LlmOptions): Promise<LlmResponse> {
    const maxTokens = options?.maxTokens ?? this.defaults.maxTokens;
    const temperature = options?.temperature ?? this.defaults.temperature;
    const start = Date.now();

    return withRetry(
      async () => {
        const body = JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          temperature,
          messages: [{ role: 'user', content: prompt }],
        });

        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body,
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        return {
          content: responseBody.content?.[0]?.text ?? '',
          modelId: this.modelId,
          latencyMs: Date.now() - start,
          promptTokens: responseBody.usage?.input_tokens,
          completionTokens: responseBody.usage?.output_tokens,
        };
      },
      { maxRetries: 2, timeoutMs: this.defaults.timeoutMs },
    );
  }
}
