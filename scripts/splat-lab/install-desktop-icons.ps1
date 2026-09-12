$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json"))) { $repo = "C:\s360" }

$launch = Join-Path $repo "scripts\splat-lab\launch.ps1"
$iconDir = Join-Path $repo "scripts\splat-lab"
$ico = Join-Path $iconDir "slate360-splat-lab.ico"
$desktop = [Environment]::GetFolderPath("Desktop")

Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(255, 11, 15, 21))
$teal = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 230, 153))
$g.FillEllipse($teal, 10, 10, 44, 44)
$png = Join-Path $iconDir "slate360-splat-lab.png"
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

$pngBytes = [System.IO.File]::ReadAllBytes($png)
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]1)
$bw.Write([byte]64); $bw.Write([byte]64); $bw.Write([byte]0); $bw.Write([byte]0)
$bw.Write([uint16]1); $bw.Write([uint16]32)
$bw.Write([uint32]$pngBytes.Length); $bw.Write([uint32]22)
$bw.Write($pngBytes); $bw.Flush()
[System.IO.File]::WriteAllBytes($ico, $ms.ToArray())
$bw.Dispose(); $ms.Dispose()

function New-Shortcut([string]$name, [string]$clone) {
  $lnk = Join-Path $desktop $name
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($lnk)
  $sc.TargetPath = "powershell.exe"
  $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launch`" -Clone $clone"
  $sc.WorkingDirectory = $repo
  $sc.WindowStyle = 7
  $sc.IconLocation = "$ico,0"
  $sc.Description = "Slate360 $name"
  $sc.Save()
  Write-Host "Wrote $lnk"
}

New-Shortcut "Slate360 Splat Lab.lnk" "proven"
New-Shortcut "Slate360 Splat Lab (Lab).lnk" "lab"
Write-Host "Desktop icons installed."
