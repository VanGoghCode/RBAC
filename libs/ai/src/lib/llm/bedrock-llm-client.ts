import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { withRetry } from '../retry/retry-policy';
import type { LlmClient, LlmOptions, LlmResponse, LlmStreamChunk } from './llm-client.interface';

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

  async *completeStream(prompt: string, options?: LlmOptions): AsyncIterable<LlmStreamChunk> {
    const maxTokens = options?.maxTokens ?? this.defaults.maxTokens;
    const temperature = options?.temperature ?? this.defaults.temperature;

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body,
    });

    const response = await this.client.send(command);

    if (!response.body) {
      yield { text: '', done: true, metadata: { modelId: this.modelId } };
      return;
    }

    let inputTokens: number | undefined;
    let outputTokens: number | undefined;

    for await (const event of response.body) {
      if (!event.chunk?.bytes) continue;
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));

      if (chunk.type === 'message_start') {
        inputTokens = chunk.message?.usage?.input_tokens;
      } else if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
        yield { text: chunk.delta.text, done: false };
      } else if (chunk.type === 'message_delta') {
        outputTokens = chunk.usage?.output_tokens;
      }
    }

    yield {
      text: '',
      done: true,
      metadata: { modelId: this.modelId, promptTokens: inputTokens, completionTokens: outputTokens },
    };
  }
}
