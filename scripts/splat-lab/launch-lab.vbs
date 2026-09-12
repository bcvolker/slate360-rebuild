Set sh = CreateObject("Wscript.Shell")
sh.CurrentDirectory = "C:\s360"
sh.Run "C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe -NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File ""C:\s360\scripts\splat-lab\launch.ps1"" -Clone lab", 0, False
