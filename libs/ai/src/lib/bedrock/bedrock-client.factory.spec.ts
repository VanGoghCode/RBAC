import { createBedrockClient, BedrockConfig } from './bedrock-client.factory';

describe('createBedrockClient', () => {
  const validConfig: BedrockConfig = {
    region: 'us-east-1',
    llmModelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    embeddingModelId: 'amazon.titan-embed-text-v2:0',
  };

  it('creates a BedrockRuntimeClient with the given region', () => {
    const client = createBedrockClient(validConfig);
    expect(client).toBeDefined();
    expect(client.config.region()).resolves.toBe('us-east-1');
  });

  it('creates different clients for different configs', () => {
    const client1 = createBedrockClient(validConfig);
    const client2 = createBedrockClient({ ...validConfig, region: 'eu-west-1' });
    expect(client1).not.toBe(client2);
  });
});
