param(
  [string]$Script = "/mnt/c/s360/tmp/run_kitchen_proven.py",
  [int]$PollSeconds = 45
)

$ErrorActionPreference = "Stop"
$log = "C:\s360\tmp\splat-lab\kitchen-proven-runner.log"
New-Item -ItemType Directory -Force -Path "C:\s360\tmp\splat-lab" | Out-Null

function Get-GpuBusy {
  $csv = nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits
  $parts = ($csv -split ",") | ForEach-Object { $_.Trim() }
  $util = [int]$parts[0]
  $mem = [int]$parts[1]
  $apps = nvidia-smi --query-compute-apps=process_name --format=csv,noheader
  $trainer = $apps -match "SplatTrainer|ns-train"
  return ($util -ge 25 -or $mem -ge 12000 -or $trainer)
}

Write-Host "Waiting for GPU to free before Clone 1 kitchen run..."
while (Get-GpuBusy) {
  Write-Host "$(Get-Date -Format o) GPU still busy - retry in ${PollSeconds}s"
  Start-Sleep -Seconds $PollSeconds
}

Write-Host "GPU free. Starting Clone 1 kitchen-proven -> $log"
wsl.exe -d Ubuntu-22.04 -- bash -lc "export PYTHONIOENCODING=utf-8; /home/rian_/slate360-engines/nerfstudio/.venv/bin/python $Script" *>&1 | Tee-Object -FilePath $log
