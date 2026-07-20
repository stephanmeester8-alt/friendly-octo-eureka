# Enterprise AI Workspace Pipeline

A local Python application that orchestrates Google Gemini **Interactions API** workflows with enterprise safety controls:

- **Antigravity agent** (`antigravity-preview-05-2026`) for remote sandbox execution
- **Dynamic model routing** via `gemini-3.5-flash` with server-side context chaining
- **Human-in-the-Loop (HITL)** approval gate before any local disk writes
- **Safe writer** restricted to the `./output/` directory

## Requirements

- Python 3.10+
- A [Gemini API key](https://aistudio.google.com/apikey)

## Setup

```bash
# Clone and enter the project
cd friendly-octo-eureka

# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure your API key
export GEMINI_API_KEY="your-api-key-here"
# Or create a .env file:
echo 'GEMINI_API_KEY=your-api-key-here' > .env
```

## Usage

Run the full pipeline with the default prompt:

```bash
python3 main.py
```

Run with a custom task prompt:

```bash
python3 main.py "Research Python async patterns and draft a reference guide."
```

### Pipeline Steps

| Step | Module | Description |
|------|--------|-------------|
| 1/4 | `agents.py` | Starts Antigravity in background mode, polls until `completed` |
| 2/4 | `postprocess.py` | Routes to Gemini 3.5 Flash via `previous_interaction_id` for JSON + Markdown |
| 3/4 | `approval.py` | Displays summary and proposed files; prompts `[Y/N]` |
| 4/4 | `writer.py` | Writes approved files to `./output/` only |

**No files are ever written without explicit CLI approval.**

## Project Structure

```
├── config.py       # Configuration, API key validation, constants
├── client.py       # Centralized google-genai client
├── schemas.py      # Pydantic schemas for structured outputs
├── agents.py       # Antigravity agent execution + status polling
├── postprocess.py  # Dynamic model routing (gemini-3.5-flash)
├── approval.py     # HITL security approval gate
├── writer.py       # Safe local file writer (./output/ only)
├── main.py         # CLI entry point
├── requirements.txt
└── output/         # Created at runtime after approval
```

## Architecture Notes

- **Server-side context**: `previous_interaction_id` chains interactions server-side, maximizing context cache hits and eliminating client-side state passing.
- **Interaction-scoped config**: `system_instruction` and `generation_config` must be re-supplied on every interaction, including follow-up calls.
- **Status polling**: Handles both lowercase (`completed`) and uppercase (`COMPLETED`) status values, plus Enum types.
- **Background execution**: Antigravity runs with `background=True` and `store=True` for reliable retrieval via `interactions.get()`.

## Security

- Zero autonomous file mutations — all writes require explicit `Y` approval
- Path traversal protection in `writer.py` (basename-only, resolved-path checks)
- Post-process layer enforces structured JSON output with schema validation
