# Codex Local Setup Status

Date: 2026-05-12
Workspace: Codespace / dev container

## Install Result

Codex CLI was installed globally with:

```bash
npm install -g @openai/codex
```

Verification:

- `command -v codex`: `/usr/local/share/npm-global/bin/codex`
- `codex --version`: `codex-cli 0.130.0`
- `npm list -g @openai/codex --depth=0`: `@openai/codex@0.130.0`

## Authentication Status

`codex login status` reports:

```text
Not logged in
```

Codex is installed, but user authentication is still required before it can run authenticated agent/review tasks.

Manual next step for the user:

```bash
codex login
```

Alternatively, if using an approved API-key based flow, follow the CLI help for `codex login --with-api-key` and provide credentials manually. Do not paste secrets into chat or docs.

## How To Start Codex Later

For interactive use:

```bash
codex
```

For a no-edit review task after login, prefer Codex review/audit workflows first, for example:

```bash
codex review
```

Do not start broad implementation tasks until a human-reviewed prompt and scope are ready.

## Usage Reminder

For this repo, Codex should be used first for:

- no-edit audits
- PR reviews
- focused risk reviews
- branch-diff checks before implementation

Avoid using Codex for broad autonomous implementation until the requested slice is fully scoped. Keep Site Walk release constraints, no-mock-data rules, no `git add .`, and no direct pushes to `main` in force.
