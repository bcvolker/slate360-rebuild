# AOB205 desktop inventory — do not process on the laptop

AOB205 lives on Brian’s **desktop**, not this laptop. Do not copy, stitch, or ingest the files from here.

## Command to run on the desktop

Open PowerShell on the desktop machine and paste this entire block.

It searches:

`C:\Users\Brian PC\Desktop`

for `AOB205`, `AOB 205`, and `AOB-205`.

```powershell
$ErrorActionPreference = "Continue"
$root = "C:\Users\Brian PC\Desktop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$out = Join-Path $root "AOB205-INVENTORY-$stamp.txt"

function Write-Inv($line) { Add-Content -Path $out -Value $line }

Write-Inv "AOB205 inventory"
Write-Inv "generated $(Get-Date -Format o)"
Write-Inv "root $root"
Write-Inv ""

$hits = Get-ChildItem -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -match "AOB[\s\-_]?205" -or $_.Name -match "AOB[\s\-_]?205"
  }

$dirs = $hits | Where-Object { $_.PSIsContainer } | Select-Object -ExpandProperty FullName -Unique
if (-not $dirs -or $dirs.Count -eq 0) {
  Write-Inv "NO MATCHES for AOB205 / AOB 205 / AOB-205 under $root"
  Write-Host "Wrote $out"
  return
}

foreach ($dir in $dirs) {
  Write-Inv "============================================================"
  Write-Inv "MATCH DIR $dir"
  Write-Inv "============================================================"
  $relRoot = $dir
  Get-ChildItem -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object {
      $depth = ($_.FullName.Substring($relRoot.Length) -split "[\\/]" | Where-Object { $_ }).Count
      $depth -le 4
    } |
    ForEach-Object {
      $rel = $_.FullName.Substring($relRoot.Length).TrimStart("\")
      $kind = if ($_.PSIsContainer) { "DIR" } else { "FILE" }
      $ext = if ($_.PSIsContainer) { "" } else { $_.Extension.ToLower() }
      $bytes = if ($_.PSIsContainer) { "" } else { $_.Length }
      $mtime = $_.LastWriteTime.ToString("o")
      Write-Inv ("{0,-5} {1,12} {2,-8} {3}  {4}" -f $kind, $bytes, $ext, $mtime, $_.FullName)
    }
  Write-Inv ""
}

Write-Inv "---- classified extensions ----"
$files = Get-ChildItem -LiteralPath $dirs -Recurse -File -Force -ErrorAction SilentlyContinue
$groups = @{
  "360_INSV" = { $_.Extension -ieq ".insv" }
  "360_VIDEO" = { $_.Extension -match "\.(mp4|mov)$" }
  "360_STILL" = { $_.Extension -match "\.(jpg|jpeg|dng)$" }
  "IPHONE_DEPTH" = { $_.Name -ieq ".s360depth" -or $_.Extension -ieq ".s360depth" }
  "LIDAR_POSES" = { $_.Name -ieq "lidar_poses.json" }
  "LIDAR_TRAJ" = { $_.Name -ieq "lidar_traj.jsonl" }
  "TWIN" = { $_.Extension -match "\.(ply|glb|spz)$" }
  "DOCS" = { $_.Extension -match "\.(pdf|dwg|dxf|png)$" }
}
foreach ($label in $groups.Keys) {
  $n = @($files | Where-Object $groups[$label]).Count
  Write-Inv ("{0,-14} {1}" -f $label, $n)
}

Write-Host "Wrote $out"
Write-Inv ""
Write-Inv "Return this file to Cursor. Do not process the media on the desktop in this step."
```

## File to return

Whatever the script prints as `Wrote ...`

Example:

`C:\Users\Brian PC\Desktop\AOB205-INVENTORY-20260902-120000.txt`

Bring that text file back. Do not zip the capture. Do not run Insta360 Studio as part of this step.
