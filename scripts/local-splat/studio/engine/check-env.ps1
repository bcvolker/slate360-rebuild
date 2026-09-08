# Environment check for Slate360 Capture Studio. Prints one JSON object.
param([string]$WslDistro = "Ubuntu-22.04", [string]$WslPython = "/home/rian_/venvs/kitchen-apriltag/bin/python")
$ErrorActionPreference = "Continue"
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$r = [ordered]@{}
$ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
$r.ffmpeg = if ($ff) { $ff.Source } else { $null }
$r.wsl = [bool](Get-Command wsl.exe -ErrorAction SilentlyContinue)
$brush = @(
  (Join-Path $env:USERPROFILE "Desktop\Slate360Research\engines\brush\brush_app.exe"),
  "C:\research\brush\brush_app.exe"
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$r.brush = $brush
$r.brushVersion = $null
if ($brush) { try { $r.brushVersion = ((& $brush --version 2>&1 | Select-Object -First 1) -join "").Trim() } catch {} }
$r.gpu = $null
try { $r.gpu = ((& nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null) -join "").Trim() } catch {}
$r.pycolmap = $null
if ($r.wsl) {
  try {
    $out = & wsl.exe -d $WslDistro -- $WslPython -c "import pycolmap,cv2,numpy;print('pycolmap',pycolmap.__version__)" 2>&1
    $line = (@($out) | Where-Object { $_ -match '^pycolmap' } | Select-Object -First 1)
    if ($line) { $r.pycolmap = ([string]$line).Trim() }
  } catch {}
}
$r.node = [bool](Get-Command node -ErrorAction SilentlyContinue)
$r.ok = [bool]($r.ffmpeg -and $r.wsl -and $r.brush -and $r.pycolmap)
$r | ConvertTo-Json -Compress
