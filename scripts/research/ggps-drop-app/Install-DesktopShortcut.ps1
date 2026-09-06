# Puts "GGPS Research Drop" on the Desktop. Research - not for customer jobs.
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$bat = Join-Path $here "Launch-GGPS-Research-Drop.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "GGPS Research Drop.lnk"
$w = New-Object -ComObject WScript.Shell
$lnk = $w.CreateShortcut($lnkPath)
$lnk.TargetPath = $bat
$lnk.WorkingDirectory = $here
$lnk.Description = 'Research - not for customer jobs (GGPS / PanoLOG wrapper)'
$lnk.Save()
Write-Output "shortcut $lnkPath"
Write-Output "Research - not for customer jobs"
