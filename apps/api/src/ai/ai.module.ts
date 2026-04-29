import { Module } from '@nestjs/common';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import {
  createBedrockClient,
  BedrockConfig,
  BedrockLlmClient,
  BedrockEmbeddingClient,
  PromptRenderer,
} from '@task-ai/ai';
import { VectorSearchRepository } from '@task-ai/tasks';
import { PrismaService } from '../prisma';
import { EmbeddingPipelineService } from './embedding-pipeline.service';
import { LlmTelemetryService } from './llm-telemetry.service';

@Module({
  providers: [
    {
      provide: 'BEDROCK_CONFIG',
      useFactory: () => ({
        region: process.env.AWS_REGION ?? 'us-east-1',
        llmModelId: process.env.BEDROCK_LLM_MODEL_ID ?? 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        embeddingModelId:
          process.env.BEDROCK_EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0',
      }),
    },
    {
      provide: BedrockRuntimeClient,
      useFactory: (config: BedrockConfig) => createBedrockClient(config),
      inject: ['BEDROCK_CONFIG'],
    },
    {
      provide: 'LlmClient',
      useFactory: (client: BedrockRuntimeClient, config: BedrockConfig) =>
        new BedrockLlmClient(client, config.llmModelId),
      inject: [BedrockRuntimeClient, 'BEDROCK_CONFIG'],
    },
    {
      provide: 'EmbeddingClient',
      useFactory: (client: BedrockRuntimeClient, config: BedrockConfig) =>
        new BedrockEmbeddingClient(client, config.embeddingModelId),
      inject: [BedrockRuntimeClient, 'BEDROCK_CONFIG'],
    },
    {
      provide: VectorSearchRepository,
      useFactory: (prisma: PrismaService) => new VectorSearchRepository(prisma),
      inject: [PrismaService],
    },
    EmbeddingPipelineService,
    LlmTelemetryService,
    PromptRenderer,
  ],
  exports: [
    'LlmClient',
    'EmbeddingClient',
    VectorSearchRepository,
    EmbeddingPipelineService,
    LlmTelemetryService,
    PromptRenderer,
  ],
})
export class AiModule {}
