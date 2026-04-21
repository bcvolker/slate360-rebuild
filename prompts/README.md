# Outside-AI Prompt Handoff

When the in-Codespace agent needs help from another AI assistant outside Codespace
(one that can't see this repo), the prompt is dropped here as a single Markdown file.

## How it works

1. In-Codespace agent writes a fresh prompt to `prompts/CURRENT.md` (overwrites previous).
2. Founder copies the entire file contents into the outside AI chat.
3. Outside AI returns code → founder pastes back into the Codespace chat.
4. In-Codespace agent wires it in.

## Why a file (not just inline)

Long prompts blow the in-chat token budget. A file lets the agent write
arbitrarily long context (with full file paths, exact API shapes, code excerpts
the outside AI can't see) without crowding the conversation.

## Convention

- One active prompt at a time: `CURRENT.md`.
- Past prompts archived as `archive/PR-XX-short-name.md` if useful.
- Each prompt MUST include: branch name, hard rules, file paths, request/response
  shapes, smoke test, "report back with" checklist.
