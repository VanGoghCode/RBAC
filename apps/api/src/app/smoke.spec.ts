import { validateApiEnv } from '@task-ai/shared/config';

describe('shared library smoke imports', () => {
  it('should import from @task-ai/shared/config', () => {
    expect(typeof validateApiEnv).toBe('function');
  });
});
