import { BedrockRuntimeClient, BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';

export interface BedrockConfig {
  region: string;
  llmModelId: string;
  embeddingModelId: string;
}

export function createBedrockClient(config: BedrockConfig): BedrockRuntimeClient {
  const clientConfig: BedrockRuntimeClientConfig = {
    region: config.region,
  };
  return new BedrockRuntimeClient(clientConfig);
}
