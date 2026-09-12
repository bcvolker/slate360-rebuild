# Builds the two Desktop programs "Slate360 Splat.exe" and "Slate360 Splat Lab.exe"
# from Slate360Launcher.cs using the C# compiler that ships with Windows (.NET
# Framework 4.x), bakes in the hex-S icon, copies the .exe files onto the Desktop
# and removes the old .lnk shortcuts (which carried Windows' shortcut-arrow badge).
#
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\splat-lab\build-launchers.ps1
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $here "Slate360Launcher.cs"
$ico = Join-Path $here "slate360-splat-lab.ico"
$outDir = Join-Path $here "bin"
$csc = Get-ChildItem "$env:SystemRoot\Microsoft.NET\Framework64\v4*\csc.exe" | Select-Object -First 1 -ExpandProperty FullName
if (-not $csc) { throw "csc.exe not found under $env:SystemRoot\Microsoft.NET\Framework64" }
if (-not (Test-Path -LiteralPath $ico)) { throw "icon missing: $ico (run make-icon.ps1 first)" }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$desktop = [Environment]::GetFolderPath("Desktop")
$targets = @(
  @{ Clone = "proven"; Name = "Slate360 Splat" },
  @{ Clone = "lab";    Name = "Slate360 Splat Lab" }
)
foreach ($t in $targets) {
  $cs = Join-Path $outDir ("launcher-" + $t.Clone + ".cs")
  (Get-Content -LiteralPath $src -Raw).Replace("__CLONE__", $t.Clone) | Set-Content -LiteralPath $cs -Encoding UTF8
  $exe = Join-Path $outDir ($t.Name + ".exe")
  & $csc /nologo /target:winexe /optimize+ "/win32icon:$ico" /reference:System.Windows.Forms.dll "/out:$exe" $cs
  if ($LASTEXITCODE -ne 0) { throw "csc failed for $($t.Name)" }
  Copy-Item -LiteralPath $exe -Destination (Join-Path $desktop ($t.Name + ".exe")) -Force
  Write-Host ("built + placed on Desktop: " + $t.Name + ".exe")
}

# Retire every old shortcut variant so exactly two Slate360 Splat programs remain.
foreach ($old in @("Slate360 Splat.lnk", "Slate360 Splat Lab.lnk", "Slate360 Splat Lab (Lab).lnk")) {
  $p = Join-Path $desktop $old
  if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force; Write-Host "removed $old" }
}
Write-Host "Desktop now has:"
Get-ChildItem $desktop -Filter "Slate360 Splat*" | Select-Object -ExpandProperty Name
