# Research-only GGPS drop UI. Wrap GGPS; do not vendor it.
# Launch with: powershell -STA -ExecutionPolicy Bypass -File this.ps1
$ErrorActionPreference = "Stop"
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "Find-Ggps.ps1")

[System.Windows.Forms.Application]::EnableVisualStyles()

$form = New-Object System.Windows.Forms.Form
$form.Text = "GGPS Research Drop - Research - not for customer jobs"
$form.Size = New-Object System.Drawing.Size(760, 640)
$form.StartPosition = "CenterScreen"
$form.MinimumSize = New-Object System.Drawing.Size(640, 480)
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 22)
$form.ForeColor = [System.Drawing.Color]::WhiteSmoke
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

$banner = New-Object System.Windows.Forms.Label
$banner.Text = "RESEARCH ONLY - not for customer jobs. CC BY-NC / GPL trainer. Output PLY is not auto-ingested to production R2."
$banner.Dock = "Top"
$banner.Height = 48
$banner.Padding = New-Object System.Windows.Forms.Padding(12, 8, 12, 8)
$banner.BackColor = [System.Drawing.Color]::FromArgb(90, 28, 28)
$banner.ForeColor = [System.Drawing.Color]::FromArgb(255, 220, 180)
$form.Controls.Add($banner)

$status = New-Object System.Windows.Forms.Label
$status.Dock = "Top"
$status.Height = 28
$status.Padding = New-Object System.Windows.Forms.Padding(12, 4, 12, 4)
$ggps = Find-GgpsRoot
if ($ggps) {
  $status.Text = "GGPS: $ggps"
  $status.BackColor = [System.Drawing.Color]::FromArgb(24, 48, 32)
} else {
  $status.Text = "GGPS missing - see log for copy methods"
  $status.BackColor = [System.Drawing.Color]::FromArgb(72, 40, 16)
}
$form.Controls.Add($status)

$drop = New-Object System.Windows.Forms.Panel
$drop.Height = 120
$drop.Dock = "Top"
$drop.AllowDrop = $true
$drop.BackColor = [System.Drawing.Color]::FromArgb(32, 36, 48)
$drop.BorderStyle = "FixedSingle"
$form.Controls.Add($drop)

$dropLabel = New-Object System.Windows.Forms.Label
$dropLabel.Text = 'Drop stitched 360 stills (equirect jpg/png, 2:1) or stitched 360 video (mp4).' + [Environment]::NewLine + 'Not raw .insv. Not a single pano. Need a walk.'
$dropLabel.Dock = "Fill"
$dropLabel.TextAlign = "MiddleCenter"
$dropLabel.ForeColor = [System.Drawing.Color]::FromArgb(180, 200, 255)
$drop.Controls.Add($dropLabel)

$script:inputs = New-Object System.Collections.Generic.List[string]

$drop.add_DragEnter({
  param($src, $e)
  if ($e.Data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
    $e.Effect = [System.Windows.Forms.DragDropEffects]::Copy
  }
})
$drop.add_DragDrop({
  param($src, $e)
  $paths = [string[]]$e.Data.GetData([System.Windows.Forms.DataFormats]::FileDrop)
  foreach ($p in $paths) {
    if (-not $script:inputs.Contains($p)) { $script:inputs.Add($p) }
  }
  $dropLabel.Text = ("Queued {0} item(s). Click Start.`r`n{1}" -f $script:inputs.Count, ($script:inputs -join "`r`n"))
})

$bar = New-Object System.Windows.Forms.FlowLayoutPanel
$bar.Dock = "Top"
$bar.Height = 44
$bar.Padding = New-Object System.Windows.Forms.Padding(8, 6, 8, 6)
$bar.BackColor = [System.Drawing.Color]::FromArgb(22, 22, 28)
$form.Controls.Add($bar)

$fpsLabel = New-Object System.Windows.Forms.Label
$fpsLabel.Text = "Video fps"
$fpsLabel.AutoSize = $true
$fpsLabel.Padding = New-Object System.Windows.Forms.Padding(0, 6, 0, 0)
$bar.Controls.Add($fpsLabel)

$fpsBox = New-Object System.Windows.Forms.NumericUpDown
$fpsBox.Minimum = 1
$fpsBox.Maximum = 4
$fpsBox.Value = 2
$fpsBox.DecimalPlaces = 1
$fpsBox.Increment = 0.5
$fpsBox.Width = 60
$bar.Controls.Add($fpsBox)

$chkTrain = New-Object System.Windows.Forms.CheckBox
$chkTrain.Text = 'Train after SfM (needs PanoLOG env)'
$chkTrain.AutoSize = $true
$chkTrain.Checked = $true
$chkTrain.ForeColor = [System.Drawing.Color]::WhiteSmoke
$bar.Controls.Add($chkTrain)

$chkLarge = New-Object System.Windows.Forms.CheckBox
$chkLarge.Text = 'Large outdoor (_c4)'
$chkLarge.AutoSize = $true
$chkLarge.ForeColor = [System.Drawing.Color]::WhiteSmoke
$bar.Controls.Add($chkLarge)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Start"
$btnStart.Width = 90
$bar.Controls.Add($btnStart)

$btnFolder = New-Object System.Windows.Forms.Button
$btnFolder.Text = "Open folder"
$btnFolder.Width = 110
$bar.Controls.Add($btnFolder)

$btnClear = New-Object System.Windows.Forms.Button
$btnClear.Text = "Clear"
$btnClear.Width = 80
$bar.Controls.Add($btnClear)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Both"
$logBox.Dock = "Fill"
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::FromArgb(12, 12, 16)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(200, 220, 200)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$form.Controls.Add($logBox)

function Add-UiLog([string]$t) {
  $logBox.AppendText($t + [Environment]::NewLine)
}

if (-not $ggps) {
  Add-UiLog (Get-GgpsMissingHelp)
} else {
  Add-UiLog "Research - not for customer jobs"
  Add-UiLog "GGPS at $ggps"
  Add-UiLog "Jobs go to $env:USERPROFILE\ggps-jobs\<timestamp>"
  Add-UiLog "Stills: native. Video: ffmpeg 1-2 fps then stills. Reject .insv."
}

$script:jobDir = $null
$script:proc = $null
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$script:logFile = $null
$script:logPos = 0

$timer.add_Tick({
  if (-not $script:logFile -or -not (Test-Path -LiteralPath $script:logFile)) { return }
  $fs = [System.IO.File]::Open($script:logFile, "Open", "Read", "ReadWrite")
  try {
    $fs.Seek($script:logPos, "Begin") | Out-Null
    $sr = New-Object System.IO.StreamReader $fs
    $chunk = $sr.ReadToEnd()
    $script:logPos = $fs.Position
    $sr.Close()
    if ($chunk) { $logBox.AppendText($chunk) }
  } finally { $fs.Close() }
  if ($script:proc -and $script:proc.HasExited) {
    $timer.Stop()
    $btnStart.Enabled = $true
    Add-UiLog ("process exit " + $script:proc.ExitCode)
    $script:proc = $null
  }
})

$btnClear.add_Click({
  $script:inputs.Clear()
  $dropLabel.Text = 'Drop stitched 360 stills (equirect jpg/png, 2:1) or stitched 360 video (mp4).'
})

$btnFolder.add_Click({
  $target = $script:jobDir
  if (-not $target) {
    $target = Join-Path $env:USERPROFILE "ggps-jobs"
  }
  if (Test-Path -LiteralPath $target) {
    Start-Process explorer.exe $target
  } else {
    Add-UiLog "no job folder yet"
  }
})

$btnStart.add_Click({
  if ($script:inputs.Count -eq 0) {
    Add-UiLog "drop files or a folder first"
    return
  }
  if (-not (Find-GgpsRoot)) {
    Add-UiLog (Get-GgpsMissingHelp)
    return
  }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $script:jobDir = Join-Path $env:USERPROFILE ("ggps-jobs\" + $stamp)
  New-Item -ItemType Directory -Force -Path $script:jobDir | Out-Null
  $script:logFile = Join-Path $script:jobDir "drop.log"
  $script:logPos = 0
  Set-Content -LiteralPath $script:logFile -Value ""
  $run = Join-Path $here "run_job.ps1"
  $argList = New-Object System.Collections.Generic.List[string]
  $argList.Add("-NoProfile")
  $argList.Add("-ExecutionPolicy"); $argList.Add("Bypass")
  $argList.Add("-File"); $argList.Add("`"$run`"")
  $argList.Add("-JobDir"); $argList.Add("`"$($script:jobDir)`"")
  $argList.Add("-Fps"); $argList.Add([string]$fpsBox.Value)
  $argList.Add("-LogPath"); $argList.Add("`"$($script:logFile)`"")
  if ($chkTrain.Checked) { $argList.Add("-Train") }
  if ($chkLarge.Checked) { $argList.Add("-LargeOutdoor") }
  $argList.Add("-InputPaths")
  foreach ($p in $script:inputs) { $argList.Add("`"$p`"") }
  $btnStart.Enabled = $false
  Add-UiLog "starting job $($script:jobDir)"
  $script:proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList.ToArray() -PassThru -WindowStyle Hidden
  $timer.Start()
})

$form.add_FormClosed({ $timer.Stop() })
[void]$form.ShowDialog()
