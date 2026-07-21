# AGENTS.md

## Cursor Cloud specific instructions

Single-product repo: a Python 3.12 CLI ("Enterprise AI Workspace Pipeline") that
orchestrates the Google Gemini **Interactions API** via the `google-genai` SDK.
Standard setup/usage lives in `README.md`; only the non-obvious notes are here.

### Running

- Dependencies live in a virtualenv at `.venv` (created by the startup update script).
  Activate it first: `source .venv/bin/activate`.
- Entry point: `python3 main.py "your prompt"` (see `README.md` for flags).
- **`GEMINI_API_KEY` is required.** Without it, `main.py` exits immediately at
  config validation (`config.load_config`) before doing anything. Set it as an env
  var or in a `.env` file at the repo root (see `.env.example`).
- The pipeline makes live calls to `generativelanguage.googleapis.com` and uses the
  `client.interactions` / `client.agents` API plus the `antigravity-preview-05-2026`
  and `gemini-3.5-flash` models, so a valid key + network access are needed for a
  true end-to-end run (steps 1-2). Steps 3-4 (HITL approval + safe writer) are local.

### Gotchas

- Step 3 is an interactive `[Y/N]` `input()` prompt on stdin. For non-interactive
  runs, pipe input, e.g. `echo Y | python3 main.py "..."`.
- The safe writer only ever writes to `./output/` (gitignored). Filenames are
  flattened to their basename; filenames containing `..` are rejected at schema
  validation (`schemas.ProposedFile`).

### Lint / test / build

- No test suite and no configured linter exist. For a quick smoke check use
  `python3 -m py_compile *.py`. There is no build step (pure Python CLI).
