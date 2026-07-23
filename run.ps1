# Run the pipeline with the project venv interpreter (avoids `py` launcher mismatch).
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
$VenvPython = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Error "Project venv not found. Run: py -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt"
}

& $VenvPython (Join-Path $ProjectRoot "main.py") @args
