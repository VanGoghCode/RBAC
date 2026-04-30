import { existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * Build Security Tests
 *
 * Verify that production build outputs do not expose
 * sensitive files, source maps, or environment secrets.
 */
describe('Build Security', () => {
  const rootDir = resolve(__dirname, '..', '..', '..', '..');
  const distDir = join(rootDir, 'dist');

  describe('environment files', () => {
    it('.env file is not in dist output', () => {
      if (!existsSync(distDir)) return; // dist may not exist during unit tests
      const envInDist = existsSync(join(distDir, '.env'));
      expect(envInDist).toBe(false);
    });

    it('.env.example is in project root for documentation', () => {
      expect(existsSync(join(rootDir, '.env.example'))).toBe(true);
    });

    it('.env is gitignored', () => {
      const gitignore = require('fs').readFileSync(join(rootDir, '.gitignore'), 'utf-8');
      expect(gitignore).toContain('.env');
    });
  });

  describe('helmet middleware', () => {
    it('main.ts imports and uses helmet', () => {
      const mainSource = require('fs').readFileSync(
        join(rootDir, 'apps', 'api', 'src', 'main.ts'),
        'utf-8',
      );
      expect(mainSource).toContain('helmet');
      expect(mainSource).toContain('app.use(helmet())');
    });

    it('main.ts removes x-powered-by header', () => {
      const mainSource = require('fs').readFileSync(
        join(rootDir, 'apps', 'api', 'src', 'main.ts'),
        'utf-8',
      );
      expect(mainSource).toContain("res.removeHeader('x-powered-by')");
    });
  });

  describe('request size limit', () => {
    it('main.ts sets json body size limit', () => {
      const mainSource = require('fs').readFileSync(
        join(rootDir, 'apps', 'api', 'src', 'main.ts'),
        'utf-8',
      );
      expect(mainSource).toContain("json({ limit: '10kb' })");
    });
  });

  describe('CORS configuration', () => {
    it('CORS is configured with credentials', () => {
      const mainSource = require('fs').readFileSync(
        join(rootDir, 'apps', 'api', 'src', 'main.ts'),
        'utf-8',
      );
      expect(mainSource).toContain('enableCors');
      expect(mainSource).toContain('credentials: true');
    });
  });
});
