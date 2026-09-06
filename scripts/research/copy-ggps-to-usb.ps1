# Copy the laptop GGPS tree to a USB / desktop path. Does not put GGPS in git.
param(
  [Parameter(Mandatory = $true)][string]$Dest
)
$src = Join-Path $env:USERPROFILE "OneDrive\Desktop\ggps"
if (-not (Test-Path (Join-Path $src "train_large.py"))) {
  Write-Error "GGPS not found at $src"
  exit 1
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Write-Output "Copying $src -> $Dest (this is large; excludes output/ and .git if present)"
robocopy $src $Dest /E /XD output .git __pycache__ /NFL /NDL /NJH
if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }
Write-Output "Done. On the desktop set: [Environment]::SetEnvironmentVariable('GGPS_ROOT', '$Dest', 'User')"
Write-Output "Research only. Do not copy this folder into workers/modal."
