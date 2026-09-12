param(
  [ValidateSet("proven", "lab")]
  [string]$Clone = "proven"
)

$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json"))) {
  $repo = "C:\s360"
}

$path = if ($Clone -eq "lab") { "/splat-lab/lab" } else { "/splat-lab" }
$url = "http://localhost:3000$path"

function Test-DevServer {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/deploy-info" -UseBasicParsing -TimeoutSec 2
    return $r.StatusCode -ge 200
  } catch { return $false }
}

if (-not (Test-DevServer)) {
  Write-Host "Starting Slate360 local server…"
  Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory $repo -WindowStyle Minimized
  $deadline = (Get-Date).AddMinutes(3)
  while (-not (Test-DevServer)) {
    if ((Get-Date) -gt $deadline) { throw "Local server did not start on http://localhost:3000" }
    Start-Sleep -Seconds 2
  }
}

$edge = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) {
  Start-Process -FilePath $edge -ArgumentList "--app=$url", "--new-window"
} elseif ($chrome) {
  Start-Process -FilePath $chrome -ArgumentList "--app=$url", "--new-window"
} else {
  Start-Process $url
}
