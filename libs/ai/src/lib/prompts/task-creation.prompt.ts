export const TASK_CREATION_PROMPT = `Extract structured task information from the following natural language description. Return a JSON object with these fields:

{
  "title": "string — concise task title",
  "description": "string | null — detailed description",
  "category": "string | null — category if mentioned",
  "priority": "LOW | MEDIUM | HIGH | CRITICAL",
  "status": "TODO | IN_PROGRESS | IN_REVIEW | BLOCKED | DONE",
  "dueAt": "ISO date string | null"
}

Rules:
- Default priority is MEDIUM unless urgency is expressed.
- Default status is TODO.
- Only include dueAt if a specific date or relative time is mentioned.
- Do not include fields not present in the schema above.
- If the input is ambiguous, choose the most reasonable interpretation.

USER INPUT:
{{input}}`;
