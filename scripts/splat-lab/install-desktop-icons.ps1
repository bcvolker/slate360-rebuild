$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath (Join-Path $repo "package.json"))) { $repo = "C:\s360" }

$iconDir = Join-Path $repo "scripts\splat-lab"
& (Join-Path $iconDir "make-icon.ps1")
$ico = Join-Path $iconDir "slate360-splat-lab.ico"
$wscript = "$env:SystemRoot\System32\wscript.exe"
$desktop = [Environment]::GetFolderPath("Desktop")

function New-Shortcut([string]$name, [string]$vbs) {
  $lnk = Join-Path $desktop $name
  $shell = New-Object -ComObject WScript.Shell
  $sc = $shell.CreateShortcut($lnk)
  $sc.TargetPath = $wscript
  $sc.Arguments = "`"$vbs`""
  $sc.WorkingDirectory = $repo
  $sc.WindowStyle = 1
  $sc.IconLocation = "$ico,0"
  $sc.Description = $name.Replace(".lnk", "")
  $sc.Save()
  Write-Host "Wrote $lnk -> $wscript $vbs"
}

$oldLab = Join-Path $desktop "Slate360 Splat Lab.lnk"
if (Test-Path -LiteralPath $oldLab) { Remove-Item -LiteralPath $oldLab -Force }

New-Shortcut "Slate360 Splat.lnk" (Join-Path $iconDir "launch-proven.vbs")
New-Shortcut "Slate360 Splat Lab.lnk" (Join-Path $iconDir "launch-lab.vbs")
Write-Host "Desktop icons installed."
