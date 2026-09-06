# Install the PanoLOG conda env in WSL so GGPS can train. Research only.
param([switch]$Wait)
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$shWin = Join-Path $here "wsl\install_panolog.sh"
if (-not (Test-Path -LiteralPath $shWin)) { throw "missing $shWin" }
$jobs = Join-Path $env:USERPROFILE "ggps-jobs"
New-Item -ItemType Directory -Force -Path $jobs | Out-Null
$log = Join-Path $jobs "panolog-install.log"
function To-Wsl([string]$winPath) {
  $full = [IO.Path]::GetFullPath($winPath)
  if ($full -match '^([A-Za-z]):\\(.*)$') {
    return "/mnt/$($Matches[1].ToLowerInvariant())/$($Matches[2] -replace '\\','/')"
  }
  throw $winPath
}
$sh = To-Wsl $shWin
$gRoot = $env:GGPS_ROOT
if (-not $gRoot) { $gRoot = "C:\research\ggps" }
$ggps = To-Wsl $gRoot
$logWsl = To-Wsl $log
Write-Output "log $log"
$inner = "chmod +x `"$sh`"; export GGPS_ROOT_WSL=`"$ggps`"; bash `"$sh`" > `"$logWsl`" 2>&1"
if ($Wait) {
  wsl -d Ubuntu-22.04 -- bash -lc $inner
  Get-Content -LiteralPath $log -Tail 30
  exit $LASTEXITCODE
}
Start-Process -FilePath "wsl.exe" -ArgumentList @("-d","Ubuntu-22.04","--","bash","-lc",$inner) -WindowStyle Hidden | Out-Null
Write-Output "started. Watch $log"
Write-Output "Research - not for customer jobs"
