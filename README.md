# Enterprise AI Workspace Pipeline

A local Python application that orchestrates Google Gemini **Interactions API** workflows for **companies in any sector** — with enterprise safety controls:

- **Antigravity agent** (`antigravity-preview-05-2026`) for remote sandbox execution
- **Dynamic model routing** via `gemini-3.5-flash` with server-side context chaining
- **Human-in-the-Loop (HITL)** approval gate before any local disk writes
- **Safe writer** restricted to the `./output/<project>/` directory

Use it for compliance reviews, strategic planning, proposal drafting, process optimization, due diligence, or any knowledge-work task — finance, healthcare, legal, manufacturing, retail, public sector, and beyond.

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

Project-scoped output (auto-derived subfolder under `./output/`):

```bash
python3 main.py --project acme_compliance_review_2026 "Compliance gap analysis for ISO 27001 readiness."
python3 main.py --open-output --project nordvik_proposal_q3 "Draft a B2B services proposal."
python3 main.py --project helix_patient_intake "Summarize intake workflow improvements for a clinic."
```

Cross-sector enterprise sales demo (built-in master prompt):

```bash
python3 main.py --demo --project enterprise_demo_2026 --open-output
```

### Windows (PowerShell)

```powershell
cd C:\Users\Startklaar\Projects\antigravity-workspace

# Create and activate virtual environment (first time only)
py -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt

# API key MUST be quoted in PowerShell (keys often start with "AQ.")
$env:GEMINI_API_KEY = "your-api-key-here"

# IMPORTANT: use `python`, not `py`, once the venv is activated.
# `py` can bypass the venv and load an older system-wide google-genai.
python main.py "Your task prompt here"

# Or use the helper script (always targets .venv):
.\run.ps1 --demo --project enterprise_demo_2026 --open-output
```

Or persist the key in a `.env` file (recommended):

```powershell
Copy-Item .env.example .env
# Edit .env and paste your key, then:
python main.py
```

### Common errors

| Error | Fix |
|-------|-----|
| `google-genai 1.73.1 is too old` but `pip show` reports `2.12.x` | Wrong interpreter. Use `python main.py` or `.\run.ps1`, not `py main.py`. Upgrade with `python -m pip install -U "google-genai>=2.12.0"`. |
| `get() got an unexpected keyword argument 'interaction_id'` | Use `client.interactions.get(id=interaction_id)` — the parameter is **`id`**, not `interaction_id`. |
| `create() got an unexpected keyword argument 'environment'` | Your `google-genai` is too old (legacy `InteractionsResource`). Upgrade inside the venv: `python -m pip install -U "google-genai>=2.12.0"` |
| `GEMINI_API_KEY environment variable is not set` | Set with quotes: `$env:GEMINI_API_KEY = "AQ...."` |
| `Activate.ps1` not found | Run `py -m venv .venv` first, from the project directory. |

### Pipeline Steps

| Step | Module | Description |
|------|--------|-------------|
| 1/4 | `agents.py` | Starts Antigravity in background mode, polls with live elapsed-time telemetry |
| 2/4 | `postprocess.py` | Routes to Gemini 3.5 Flash via `previous_interaction_id` for JSON + Markdown |
| 3/4 | `approval.py` | Displays summary, target project folder, and proposed files; prompts `[Y/N]` |
| 4/4 | `writer.py` | Writes approved files to `./output/<project>/` with Markdown sanitization |

**No files are ever written without explicit CLI approval.**

### Demo telemetry

During Antigravity polling, the terminal shows live elapsed time:

```text
[Antigravity] Poll 4/360 — status: in_progress (15s elapsed)
```

Approved artifacts land in a per-project folder, for example:

```text
./output/acme_compliance_review_2026/
├── summary.md
├── risk_assessment.md
└── implementation_plan.md
```

### Sector examples

| Sector | Example prompt |
|--------|----------------|
| Finance | `"Analyse AML/KYC gaps and draft a remediation roadmap."` |
| Healthcare | `"Review patient intake workflow and propose efficiency improvements."` |
| Legal | `"Summarize contract risks in a vendor MSA and suggest redlines."` |
| Manufacturing | `"Evaluate supply-chain disruption scenarios and mitigation steps."` |
| Retail | `"Draft a loyalty-program ROI model and rollout plan."` |
| Public sector | `"Assess procurement compliance and document control gaps."` |

## Project Structure

```
├── config.py       # Configuration, API key validation, constants
├── client.py       # Centralized google-genai client
├── schemas.py      # Pydantic schemas for structured outputs
├── agents.py       # Antigravity agent execution + status polling
├── postprocess.py  # Dynamic model routing (gemini-3.5-flash)
├── approval.py     # HITL security approval gate
├── project_paths.py # Project slug + ./output/<project>/ routing
├── sanitize.py     # Markdown sanitization before disk writes
├── writer.py       # Safe local file writer (./output/<project>/ only)
├── main.py         # CLI entry point
├── run.ps1         # Windows helper (forces .venv python)
├── requirements.txt
└── output/         # Created at runtime after approval
    └── <project>/  # One subfolder per run / --project slug
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
