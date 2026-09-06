# Read-only readiness check for the 3090 desktop. Prints OK / MISSING. Never prints secrets.
$ErrorActionPreference = "Continue"
$root = git rev-parse --show-toplevel 2>$null
if (-not $root) { $root = (Get-Location).Path }
Write-Output "repo $root"
Write-Output "branch $(git -C $root branch --show-current)"

function Show-Check($name, $ok, $hint) {
  if ($ok) { Write-Output "OK      $name" }
  else { Write-Output "MISSING $name  -> $hint" }
}

Show-Check "grok" (Get-Command grok -ErrorAction SilentlyContinue) "irm https://x.ai/cli/install.ps1 | iex"
Show-Check "git" (Get-Command git -ErrorAction SilentlyContinue) "winget install Git.Git"
Show-Check "gh" (Get-Command gh -ErrorAction SilentlyContinue) "winget install GitHub.cli ; gh auth login"
Show-Check "node" (Get-Command node -ErrorAction SilentlyContinue) "winget install OpenJS.NodeJS.LTS"
Show-Check "ffmpeg" (Get-Command ffmpeg -ErrorAction SilentlyContinue) "winget install Gyan.FFmpeg"
Show-Check "nvidia-smi" (Get-Command nvidia-smi -ErrorAction SilentlyContinue) "install NVIDIA driver, confirm 3090 in Device Manager"
Show-Check ".env.local" (Test-Path (Join-Path $root ".env.local")) "copy from laptop C:\s360\.env.local — do not git add"

$postshot = @(
  "$env:LOCALAPPDATA\Programs\Postshot",
  "$env:ProgramFiles\Jawset Postshot",
  "$env:ProgramFiles\Postshot"
) | Where-Object { Test-Path $_ }
Show-Check "Postshot" ($postshot.Count -gt 0) "https://www.jawset.com/"

if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
}
if (Get-Command gh -ErrorAction SilentlyContinue) {
  gh auth status 2>&1 | Select-String "Logged in|Token scopes"
}
Write-Output "next: docs/GROK_DESKTOP_BOOTSTRAP.md then docs/design/LOCAL_SPLAT_PIPELINE.md"
