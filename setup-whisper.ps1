# ========================================
# LIMIT LABS 8 AI - Local Whisper Setup
# ========================================

Write-Host "Starting Whisper setup..." -ForegroundColor Cyan

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$ErrorActionPreference = "Stop"

Write-Host "Checking Python launcher (py)..." -ForegroundColor Yellow
$pyCmd = Get-Command py -ErrorAction SilentlyContinue
if (-not $pyCmd) {
    Write-Host "Python launcher 'py' was not found. Install Python 3.11+ first." -ForegroundColor Red
    exit 1
}

py --version

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    py -m venv .venv
} else {
    Write-Host "Virtual environment already exists. Reusing .venv" -ForegroundColor Yellow
}

$venvPython = Join-Path $PWD ".venv\Scripts\python.exe"
$venvPip = Join-Path $PWD ".venv\Scripts\pip.exe"
$venvWhisper = Join-Path $PWD ".venv\Scripts\whisper.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Virtual environment Python was not created correctly." -ForegroundColor Red
    exit 1
}

Write-Host "Upgrading pip in .venv..." -ForegroundColor Yellow
& $venvPython -m pip install --upgrade pip

Write-Host "Installing openai-whisper in .venv..." -ForegroundColor Yellow
& $venvPython -m pip install -U openai-whisper

Write-Host "Checking FFmpeg..." -ForegroundColor Yellow
$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "FFmpeg not found. Trying winget install..." -ForegroundColor Yellow
    winget install --id Gyan.FFmpeg -e --source winget
    Start-Sleep -Seconds 5
}

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    Write-Host "FFmpeg is still not found on PATH. Install manually: https://ffmpeg.org" -ForegroundColor Yellow
} else {
    Write-Host "FFmpeg detected: $($ffmpeg.Source)" -ForegroundColor Green
    ffmpeg -version | Select-Object -First 1
}

Write-Host "Verifying whisper package..." -ForegroundColor Yellow
& $venvPython -m pip show openai-whisper

Write-Host "\nSetup complete." -ForegroundColor Green
Write-Host "Use these commands:" -ForegroundColor Cyan
Write-Host "  .\\.venv\\Scripts\\Activate.ps1"
Write-Host "  whisper your-audio-file.mp3 --model base"
Write-Host "or"
Write-Host "  .\\.venv\\Scripts\\python.exe -m whisper your-audio-file.mp3 --model base"
