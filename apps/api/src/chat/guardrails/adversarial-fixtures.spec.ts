import { ADVERSARIAL_FIXTURES, SIMULATED_LLM_RESPONSES } from './adversarial-fixtures';
import { CanaryService } from './canary.service';
import { GuardrailService } from './guardrail.service';
import { InputNormalizer } from './input-normalizer';
import { OutputValidator } from './output-validator';
import { PromptBoundary } from './prompt-boundary';

describe('Adversarial Test Suite', () => {
  let guardrail: GuardrailService;
  let canaryService: CanaryService;

  beforeEach(() => {
    const inputNormalizer = new InputNormalizer();
    const promptBoundary = new PromptBoundary();
    const outputValidator = new OutputValidator();
    canaryService = new CanaryService();
    guardrail = new GuardrailService(inputNormalizer, promptBoundary, outputValidator, canaryService);
  });

  describe('input fixtures', () => {
    for (const fixture of ADVERSARIAL_FIXTURES) {
      it(`[${fixture.id}] ${fixture.name} → ${fixture.expectedBlocked ? 'BLOCKED' : 'ALLOWED'}`, () => {
        const result = guardrail.checkInput(fixture.userInput);
        expect(result.flagged).toBe(fixture.expectedBlocked);
      });
    }
  });

  describe('output fixtures', () => {
    const sources = [
      { taskId: 'task-1', title: 'Task 1', similarity: 0.9 },
    ];

    it('safe response passes output guardrail', () => {
      const result = guardrail.checkOutput(SIMULATED_LLM_RESPONSES.safe, sources);
      expect(result.safe).toBe(true);
    });

    it('canary leakage is blocked in output', () => {
      const token = canaryService.getToken();
      const malicious = SIMULATED_LLM_RESPONSES.canaryLeaked.replace(
        'canary-REPLACED-WITH-REAL',
        token,
      );
      const result = guardrail.checkOutput(malicious, sources);
      expect(result.blocked).toBe(true);
      expect(result.canaryLeaked).toBe(true);
    });

    it('system prompt leakage is blocked', () => {
      const result = guardrail.checkOutput(SIMULATED_LLM_RESPONSES.systemPromptLeaked, sources);
      expect(result.blocked).toBe(true);
    });

    it('refusal bypass is blocked', () => {
      const result = guardrail.checkOutput(SIMULATED_LLM_RESPONSES.refusalBypass, sources);
      expect(result.blocked).toBe(true);
    });
  });
});
