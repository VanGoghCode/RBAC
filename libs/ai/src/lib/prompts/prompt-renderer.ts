import { PROMPT_MANIFEST, getPromptVersion } from './prompt-manifest';

export interface RenderedPrompt {
  text: string;
  promptName: string;
  promptVersion: number;
}

export class PromptRenderer {
  private readonly delimiter = '---';

  render(template: string, variables: Record<string, string>, promptName: string): RenderedPrompt {
    this.validateRequiredVariables(template, variables, promptName);

    let text = template;
    for (const [key, value] of Object.entries(variables)) {
      text = text.split(`{{${key}}}`).join(this.sanitize(value));
    }

    return {
      text,
      promptName,
      promptVersion: getPromptVersion(promptName),
    };
  }

  private validateRequiredVariables(
    template: string,
    variables: Record<string, string>,
    promptName: string,
  ): void {
    const matches = template.matchAll(/\{\{(\w+)\}\}/g);
    const missing: string[] = [];

    for (const match of matches) {
      const varName = match[1];
      if (!(varName in variables)) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Prompt "${promptName}" missing required variables: ${missing.join(', ')}`,
      );
    }
  }

  private sanitize(value: string): string {
    // Delimit untrusted context to prevent prompt injection
    return `${this.delimiter}\n${value}\n${this.delimiter}`;
  }
}
