# Full unified 199-class train — unattended overnight run.
# Output: research/best_resnet50_unified.h5 (share with team)
$ErrorActionPreference = "Stop"

Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class SleepUtil {
    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);
    public const uint ES_CONTINUOUS = 0x80000000;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
}
"@

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $Root

$Python = Join-Path $Root "research\ai-service\.venv\Scripts\python.exe"
$TrainScript = Join-Path $Root "research\scripts\train_resnet50_phase2.py"
$LogFile = Join-Path $Root "research\output\logs\train_resnet_unified.log"
$ProgressFile = Join-Path $Root "research\output\logs\train_progress_resnet_unified.log"
$OutputModel = Join-Path $Root "research\best_resnet50_unified.h5"

if (-not (Test-Path $Python)) {
    Write-Error "Missing venv: $Python"
}

New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null

[SleepUtil]::SetThreadExecutionState(
    [SleepUtil]::ES_CONTINUOUS -bor [SleepUtil]::ES_SYSTEM_REQUIRED -bor [SleepUtil]::ES_DISPLAY_REQUIRED
) | Out-Null

$env:PYTHONUNBUFFERED = "1"
$env:PYTHONIOENCODING = "utf-8"
$env:TF_CPP_MIN_LOG_LEVEL = "2"

$resumeArg = @()
$ckptDir = Join-Path $Root "research\output\checkpoints\resnet_unified"
$bestWeights = Join-Path $ckptDir "best.weights.h5"
$StateFile = Join-Path $ckptDir "train_state.json"
if (Test-Path $StateFile) {
    Write-Host "Train state (auto resume epoch/stage):"
    Get-Content $StateFile
}
if ((Test-Path $bestWeights) -and ((Get-Item $bestWeights).Length -gt 1MB)) {
    Write-Host "Resuming weights: $bestWeights"
    $resumeArg = @("--resume", $bestWeights)
} elseif ((Test-Path $OutputModel) -and ((Get-Item $OutputModel).Length -gt 50MB)) {
    Write-Host "Resuming full model: $OutputModel"
    $resumeArg = @("--resume", $OutputModel)
} elseif (Test-Path $ckptDir) {
    $latest = Get-ChildItem (Join-Path $ckptDir "*.weights.h5") -ErrorAction SilentlyContinue |
        Where-Object { $_.Length -gt 1MB } |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latest) {
        Write-Host "Resuming checkpoint: $($latest.FullName)"
        $resumeArg = @("--resume", $latest.FullName)
    }
}

# Remove corrupt partial save from failed full-model checkpoint
if ((Test-Path $OutputModel) -and ((Get-Item $OutputModel).Length -lt 1MB)) {
    Remove-Item $OutputModel -Force
    Write-Host "Removed corrupt partial model file."
}

Write-Host "========================================"
Write-Host " NutriCan unified train (199 classes)"
Write-Host " Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host " Log:     $LogFile"
Write-Host " Progress:$ProgressFile"
Write-Host " Output:  $OutputModel"
Write-Host "========================================"

$trainArgs = @(
    "-u", $TrainScript,
    "--profile", "resnet_unified",
    "--epochs-head", "5",
    "--epochs-finetune", "5",
    "--batch-size", "8",
    "--max-val-steps", "512"
)
if ($resumeArg.Count -gt 0) {
    $trainArgs += $resumeArg
} else {
    $trainArgs += "--build-bohlol"
}

& $Python @trainArgs *>&1 | Tee-Object -FilePath $LogFile -Append

$exitCode = $LASTEXITCODE
Write-Host "Finished: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') exit=$exitCode"

if (Test-Path $OutputModel) {
    $sizeMb = [math]::Round((Get-Item $OutputModel).Length / 1MB, 1)
    Write-Host "OK: $OutputModel ($sizeMb MB)"
} else {
    Write-Warning "Model file not created. Check log and run this script again to resume."
}

exit $exitCode
