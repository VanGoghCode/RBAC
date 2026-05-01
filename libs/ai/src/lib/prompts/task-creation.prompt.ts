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
- When computing relative dates (today, tomorrow, next week, next Friday, etc.), use the CURRENT DATE provided below.
- All dueAt values must be ISO 8601 date strings (e.g. "2026-05-01T00:00:00.000Z").
- Do not include fields not present in the schema above.
- If the input is ambiguous, choose the most reasonable interpretation.

CURRENT DATE: {{currentDate}}
TIMEZONE: {{timezone}}

USER INPUT:
{{input}}`;
