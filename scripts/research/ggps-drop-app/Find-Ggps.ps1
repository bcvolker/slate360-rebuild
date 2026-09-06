# Locate GGPS on disk. Never vendors the tree into git.
$ErrorActionPreference = "Continue"

function Find-GgpsRoot {
  $candidates = @()
  if ($env:GGPS_ROOT) { $candidates += $env:GGPS_ROOT }
  $userRoot = [Environment]::GetEnvironmentVariable("GGPS_ROOT", "User")
  if ($userRoot) { $candidates += $userRoot }
  $candidates += @(
    (Join-Path $env:USERPROFILE "OneDrive\Desktop\ggps"),
    "C:\research\ggps"
  )
  foreach ($c in $candidates) {
    if (-not $c) { continue }
    $train = Join-Path $c "train_large.py"
    if (Test-Path -LiteralPath $train) {
      return (Resolve-Path -LiteralPath $c).Path
    }
  }
  return $null
}

function Get-GgpsMissingHelp {
  return @"
GGPS is not on this machine (need train_large.py).
Copy methods (pick one) - from docs/research/GGPS_ON_DESKTOP.md:

  1. OneDrive: wait for Desktop sync, then
     Test-Path `$env:USERPROFILE\OneDrive\Desktop\ggps\train_large.py

  2. USB from the laptop:
     powershell -File scripts/research/copy-ggps-to-usb.ps1 -Dest E:\ggps
     then copy to C:\research\ggps

  3. Clone (already the usual desktop path):
     git clone --recurse-submodules https://github.com/Insta360-Research-Team/GGPS.git C:\research\ggps
     [Environment]::SetEnvironmentVariable("GGPS_ROOT", "C:\research\ggps", "User")

Research only. Do not copy GGPS into workers/modal.
"@
}
