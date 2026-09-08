# Puts "Slate360 Capture Studio" on the desktop. Run once.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath("Desktop")
$lnk = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop "Slate360 Capture Studio.lnk"))
$lnk.TargetPath = "powershell.exe"
$lnk.Arguments = '-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File "' + (Join-Path $here "Slate360-Capture-Studio.ps1") + '"'
$lnk.WorkingDirectory = $here
$lnk.Description = "Drop a capture -> Gaussian splat -> Twin viewer"
$lnk.Save()
Write-Output "Shortcut created on the desktop."
