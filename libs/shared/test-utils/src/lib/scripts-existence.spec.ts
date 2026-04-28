import { readFileSync } from 'fs';
import { join } from 'path';

describe('package.json required scripts', () => {
  let scripts: Record<string, string>;

  beforeAll(() => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '../../../../../package.json'), 'utf-8'),
    );
    scripts = pkg.scripts;
  });

  const requiredScripts = ['lint', 'typecheck', 'test'];

  requiredScripts.forEach((name) => {
    it(`should define a "${name}" script`, () => {
      expect(scripts[name]).toBeDefined();
      expect(typeof scripts[name]).toBe('string');
      expect(scripts[name].length).toBeGreaterThan(0);
    });
  });
});
