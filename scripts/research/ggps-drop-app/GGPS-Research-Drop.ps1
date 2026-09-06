# GGPS Research Studio UI. Wrap GGPS; do not vendor it.
# Launch: powershell -STA -ExecutionPolicy Bypass -File this.ps1
$ErrorActionPreference = "Stop"
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "Find-Ggps.ps1")
. (Join-Path $here "MediaProbe.ps1")

[System.Windows.Forms.Application]::EnableVisualStyles()

$navy = [System.Drawing.Color]::FromArgb(20, 40, 70)
$accent = [System.Drawing.Color]::FromArgb(20, 110, 180)
$warnBg = [System.Drawing.Color]::FromArgb(255, 243, 205)
$okBg = [System.Drawing.Color]::FromArgb(214, 245, 224)
$bg = [System.Drawing.Color]::FromArgb(244, 246, 248)

$ggps = Find-GgpsRoot
$script:panoReady = Test-PanoLogReady
$script:inputs = New-Object System.Collections.Generic.List[string]
$script:jobDir = $null
$script:proc = $null
$script:logFile = $null
$script:logPos = 0
$script:lastPly = $null

$form = New-Object System.Windows.Forms.Form
$form.Text = "GGPS Research Studio"
$form.Size = New-Object System.Drawing.Size(1080, 720)
$form.MinimumSize = New-Object System.Drawing.Size(900, 600)
$form.StartPosition = "CenterScreen"
$form.BackColor = $bg
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$form.KeyPreview = $true

$menu = New-Object System.Windows.Forms.MenuStrip
$fileMenu = New-Object System.Windows.Forms.ToolStripMenuItem("File")
$miVideo = New-Object System.Windows.Forms.ToolStripMenuItem("Add 360 video...")
$miStills = New-Object System.Windows.Forms.ToolStripMenuItem("Add stills folder...")
$miOpenJobs = New-Object System.Windows.Forms.ToolStripMenuItem("Open jobs folder")
$miExportPly = New-Object System.Windows.Forms.ToolStripMenuItem("Export Gaussian SPZ...")
$miExportFrames = New-Object System.Windows.Forms.ToolStripMenuItem("Open extracted frames")
$miExit = New-Object System.Windows.Forms.ToolStripMenuItem("Exit")
[void]$fileMenu.DropDownItems.Add($miVideo)
[void]$fileMenu.DropDownItems.Add($miStills)
[void]$fileMenu.DropDownItems.Add((New-Object System.Windows.Forms.ToolStripSeparator))
[void]$fileMenu.DropDownItems.Add($miOpenJobs)
[void]$fileMenu.DropDownItems.Add($miExportPly)
[void]$fileMenu.DropDownItems.Add($miExportFrames)
[void]$fileMenu.DropDownItems.Add((New-Object System.Windows.Forms.ToolStripSeparator))
[void]$fileMenu.DropDownItems.Add($miExit)
$helpMenu = New-Object System.Windows.Forms.ToolStripMenuItem("Help")
$miHow = New-Object System.Windows.Forms.ToolStripMenuItem("What should I click?")
$miDocs = New-Object System.Windows.Forms.ToolStripMenuItem("Open GGPS_DROP_APP.md")
[void]$helpMenu.DropDownItems.Add($miHow)
[void]$helpMenu.DropDownItems.Add($miDocs)
[void]$menu.Items.Add($fileMenu)
[void]$menu.Items.Add($helpMenu)
$form.MainMenuStrip = $menu
$form.Controls.Add($menu)

$header = New-Object System.Windows.Forms.Panel
$header.Dock = "Top"
$header.Height = 58
$header.BackColor = $navy
$form.Controls.Add($header)
$title = New-Object System.Windows.Forms.Label
$title.Text = "GGPS Research Studio"
$title.ForeColor = [System.Drawing.Color]::White
$title.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 16)
$title.Location = New-Object System.Drawing.Point(16, 12)
$title.AutoSize = $true
$header.Controls.Add($title)
$badge = New-Object System.Windows.Forms.Label
$badge.Text = "  RESEARCH ONLY  "
$badge.BackColor = [System.Drawing.Color]::FromArgb(196, 120, 40)
$badge.ForeColor = [System.Drawing.Color]::White
$badge.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 8)
$badge.Location = New-Object System.Drawing.Point(280, 20)
$badge.AutoSize = $true
$header.Controls.Add($badge)
$sub = New-Object System.Windows.Forms.Label
$sub.Text = "Campus 360 stills or stitched video  ->  poses  ->  Gaussian PLY for local inspect"
$sub.ForeColor = [System.Drawing.Color]::FromArgb(190, 210, 230)
$sub.Location = New-Object System.Drawing.Point(16, 38)
$sub.AutoSize = $true
$header.Controls.Add($sub)

$tips = New-Object System.Windows.Forms.ToolTip
$tips.AutoPopDelay = 20000

$split = New-Object System.Windows.Forms.SplitContainer
$split.Dock = "Fill"
$split.SplitterDistance = 340
$split.BackColor = $bg
$form.Controls.Add($split)
$split.BringToFront()
$header.BringToFront()
$menu.BringToFront()

# ----- left: settings -----
$left = New-Object System.Windows.Forms.Panel
$left.Dock = "Fill"
$left.AutoScroll = $true
$left.Padding = New-Object System.Windows.Forms.Padding(12)
$split.Panel1.Controls.Add($left)

function Add-LeftLabel([int]$y, [string]$text, [int]$size = 9) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text
  $l.Location = New-Object System.Drawing.Point(12, $y)
  $l.Size = New-Object System.Drawing.Size(300, 22)
  $l.Font = New-Object System.Drawing.Font("Segoe UI Semibold", $size)
  $left.Controls.Add($l)
  return $l
}

$y = 10
[void](Add-LeftLabel $y "Project")
$y += 22
$sceneBox = New-Object System.Windows.Forms.TextBox
$sceneBox.Location = New-Object System.Drawing.Point(12, $y)
$sceneBox.Size = New-Object System.Drawing.Size(300, 26)
$sceneBox.Text = "campus-walk"
$left.Controls.Add($sceneBox)
$tips.SetToolTip($sceneBox, "Name for the job folder. Use the building or path, e.g. hassayampa-loop.")

$y += 36
[void](Add-LeftLabel $y "Preset")
$y += 22
$preset = New-Object System.Windows.Forms.ComboBox
$preset.DropDownStyle = "DropDownList"
$preset.Location = New-Object System.Drawing.Point(12, $y)
$preset.Size = New-Object System.Drawing.Size(300, 26)
[void]$preset.Items.Add("Short walk / this 51s clip  (1 fps)")
[void]$preset.Items.Add("Fast walk, denser overlap  (2 fps)")
[void]$preset.Items.Add("Long campus loop  (0.5 fps)")
$preset.SelectedIndex = 0
$left.Controls.Add($preset)
$tips.SetToolTip($preset, "FPS is how many still photos to cut from each second of video. GGPS does not train on the movie file itself.")

$y += 40
[void](Add-LeftLabel $y "Video extract rate")
$y += 22
$fpsBox = New-Object System.Windows.Forms.NumericUpDown
$fpsBox.Location = New-Object System.Drawing.Point(12, $y)
$fpsBox.Size = New-Object System.Drawing.Size(80, 26)
$fpsBox.DecimalPlaces = 1
$fpsBox.Minimum = 0.5
$fpsBox.Maximum = 4
$fpsBox.Increment = 0.5
$fpsBox.Value = 1
$left.Controls.Add($fpsBox)
$fpsHint = New-Object System.Windows.Forms.Label
$fpsHint.Location = New-Object System.Drawing.Point(100, $y)
$fpsHint.Size = New-Object System.Drawing.Size(212, 40)
$fpsHint.ForeColor = [System.Drawing.Color]::FromArgb(70, 80, 90)
$fpsHint.Text = "1.0 = ~51 stills from your 51s clip. Start here."
$left.Controls.Add($fpsHint)
$tips.SetToolTip($fpsBox, "Not the camera's 30 fps. This is how often we grab a still from the stitched 360 video.")

$y += 48
$chkTrain = New-Object System.Windows.Forms.CheckBox
$chkTrain.Text = "Train Gaussian splat after poses"
$chkTrain.Location = New-Object System.Drawing.Point(12, $y)
$chkTrain.Size = New-Object System.Drawing.Size(300, 24)
$chkTrain.Checked = $true
$left.Controls.Add($chkTrain)
$tips.SetToolTip($chkTrain, "Trains a Gaussian splat, then packs SPZ for the Twin viewer.")

$y += 26
$chkLarge = New-Object System.Windows.Forms.CheckBox
$chkLarge.Text = "Large outdoor partition  (campus-scale)"
$chkLarge.Location = New-Object System.Drawing.Point(12, $y)
$chkLarge.Size = New-Object System.Drawing.Size(300, 24)
$chkLarge.Checked = $false
$left.Controls.Add($chkLarge)
$tips.SetToolTip($chkLarge, "Leave OFF for a 1-minute clip. ON only for hundreds-to-thousands of panos.")

$y += 26
$chkIngest = New-Object System.Windows.Forms.CheckBox
$chkIngest.Text = "Open result in Twin viewer (share link)"
$chkIngest.Location = New-Object System.Drawing.Point(12, $y)
$chkIngest.Size = New-Object System.Drawing.Size(300, 24)
$chkIngest.Checked = $true
$left.Controls.Add($chkIngest)
$tips.SetToolTip($chkIngest, "Uploads gaussian.spz into Twin Studio and mints /share/twin/... so you can walk it in the viewer you already have.")

$y += 28
$qual = New-Object System.Windows.Forms.ComboBox
$qual.DropDownStyle = "DropDownList"
$qual.Location = New-Object System.Drawing.Point(12, $y)
$qual.Size = New-Object System.Drawing.Size(300, 26)
[void]$qual.Items.Add("Preview train  (faster, 7k steps)")
[void]$qual.Items.Add("Full train  (30k steps)")
$qual.SelectedIndex = 0
$left.Controls.Add($qual)
$tips.SetToolTip($qual, "Preview is for research screening. Full is slower and closer to GGPS paper settings.")

$y += 32
$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Install PanoLOG trainer"
$btnInstall.Location = New-Object System.Drawing.Point(12, $y)
$btnInstall.Size = New-Object System.Drawing.Size(300, 30)
$left.Controls.Add($btnInstall)
$tips.SetToolTip($btnInstall, "One-time WSL install: conda env, PyTorch CUDA, compile GGPS rasterizer for the 3090.")

$y += 40
$outBox = New-Object System.Windows.Forms.TextBox
$outBox.Location = New-Object System.Drawing.Point(12, $y)
$outBox.Size = New-Object System.Drawing.Size(300, 90)
$outBox.Multiline = $true
$outBox.ReadOnly = $true
$outBox.BackColor = $warnBg
$outBox.BorderStyle = "FixedSingle"
$left.Controls.Add($outBox)

$y += 100
$btnAddVideo = New-Object System.Windows.Forms.Button
$btnAddVideo.Text = "Add 360 video..."
$btnAddVideo.Location = New-Object System.Drawing.Point(12, $y)
$btnAddVideo.Size = New-Object System.Drawing.Size(145, 32)
$left.Controls.Add($btnAddVideo)
$btnAddFolder = New-Object System.Windows.Forms.Button
$btnAddFolder.Text = "Add stills folder..."
$btnAddFolder.Location = New-Object System.Drawing.Point(167, $y)
$btnAddFolder.Size = New-Object System.Drawing.Size(145, 32)
$left.Controls.Add($btnAddFolder)

$y += 42
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Start processing"
$btnStart.Location = New-Object System.Drawing.Point(12, $y)
$btnStart.Size = New-Object System.Drawing.Size(300, 40)
$btnStart.BackColor = $accent
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
$left.Controls.Add($btnStart)

$y += 48
$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text = "Open job folder"
$btnOpen.Location = New-Object System.Drawing.Point(12, $y)
$btnOpen.Size = New-Object System.Drawing.Size(145, 30)
$left.Controls.Add($btnOpen)
$btnExport = New-Object System.Windows.Forms.Button
$btnExport.Text = "Export SPZ..."
$btnExport.Location = New-Object System.Drawing.Point(167, $y)
$btnExport.Size = New-Object System.Drawing.Size(145, 30)
$left.Controls.Add($btnExport)

$y += 40
[void](Add-LeftLabel $y "Recent jobs")
$y += 22
$jobsList = New-Object System.Windows.Forms.ListBox
$jobsList.Location = New-Object System.Drawing.Point(12, $y)
$jobsList.Size = New-Object System.Drawing.Size(300, 110)
$left.Controls.Add($jobsList)

# ----- right -----
$grid = New-Object System.Windows.Forms.TableLayoutPanel
$grid.Dock = "Fill"
$grid.ColumnCount = 1
$grid.RowCount = 5
$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 150))) | Out-Null
$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 72))) | Out-Null
$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 18))) | Out-Null
$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 24))) | Out-Null
$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100))) | Out-Null
$split.Panel2.Controls.Add($grid)

$drop = New-Object System.Windows.Forms.Panel
$drop.Dock = "Fill"
$drop.AllowDrop = $true
$drop.BackColor = [System.Drawing.Color]::White
$drop.Padding = New-Object System.Windows.Forms.Padding(8)
$dropLabel = New-Object System.Windows.Forms.Label
$dropLabel.Dock = "Fill"
$dropLabel.TextAlign = "MiddleCenter"
$dropLabel.ForeColor = [System.Drawing.Color]::FromArgb(40, 70, 120)
$dropLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$dropLabel.Text = "Drop a stitched 360 video or a folder of 360 stills here" + [Environment]::NewLine + [Environment]::NewLine + "Stitched mp4 from Insta360 Studio  |  Equirect jpg/png from a walk" + [Environment]::NewLine + "Not raw .insv  |  Not one single pano"
$drop.Controls.Add($dropLabel)
$grid.Controls.Add($drop, 0, 0)

$fileList = New-Object System.Windows.Forms.ListBox
$fileList.Dock = "Fill"
$grid.Controls.Add($fileList, 0, 1)

$prog = New-Object System.Windows.Forms.ProgressBar
$prog.Dock = "Fill"
$prog.Style = "Continuous"
$grid.Controls.Add($prog, 0, 2)

$stage = New-Object System.Windows.Forms.Label
$stage.Dock = "Fill"
$stage.Text = "Idle"
$stage.Padding = New-Object System.Windows.Forms.Padding(8, 2, 8, 2)
$grid.Controls.Add($stage, 0, 3)

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Both"
$logBox.Dock = "Fill"
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$logBox.BackColor = [System.Drawing.Color]::FromArgb(250, 251, 252)
$grid.Controls.Add($logBox, 0, 4)

$statusStrip = New-Object System.Windows.Forms.StatusStrip
$stGgps = New-Object System.Windows.Forms.ToolStripStatusLabel
$stPano = New-Object System.Windows.Forms.ToolStripStatusLabel
$stGpu = New-Object System.Windows.Forms.ToolStripStatusLabel
$stGpu.Text = "RTX 3090"
$stGpu.Spring = $true
[void]$statusStrip.Items.Add($stGgps)
[void]$statusStrip.Items.Add($stPano)
[void]$statusStrip.Items.Add($stGpu)
$form.Controls.Add($statusStrip)
$statusStrip.BringToFront()

function Add-UiLog([string]$t) {
  $logBox.AppendText($t + [Environment]::NewLine)
}

function Refresh-EnvBanner {
  if ($ggps) { $stGgps.Text = "GGPS ready" } else { $stGgps.Text = "GGPS missing" }
  if ($script:panoReady) {
    $stPano.Text = "Trainer ready - will write gaussian.spz"
    $outBox.BackColor = $okBg
    $outBox.Text = "This run trains a Gaussian splat and packs gaussian.spz for the Twin viewer. Tick Open in Twin viewer to mint a share link."
    $btnInstall.Enabled = $false
    $btnInstall.Text = "PanoLOG trainer installed"
  } else {
    $stPano.Text = "Trainer missing - click Install PanoLOG trainer"
    $outBox.BackColor = $warnBg
    $outBox.Text = "No splat until PanoLOG is installed. Click Install PanoLOG trainer (one-time, WSL, 3090). Then Start. Output is gaussian.spz plus an optional Twin share link."
    $btnInstall.Enabled = $true
  }
}

function Refresh-Jobs {
  $jobsList.Items.Clear()
  $root = Join-Path $env:USERPROFILE "ggps-jobs"
  if (Test-Path -LiteralPath $root) {
    Get-ChildItem -LiteralPath $root -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 12 | ForEach-Object {
      [void]$jobsList.Items.Add($_.Name)
    }
  }
}

function Refresh-FileList {
  $fileList.Items.Clear()
  foreach ($p in $script:inputs) { [void]$fileList.Items.Add($p) }
}

function Add-InputPath([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { return }
  $ext = [IO.Path]::GetExtension($p).ToLowerInvariant()
  if ($ext -eq ".insv") {
    [System.Windows.Forms.MessageBox]::Show("Raw .insv is rejected. Stitch in Insta360 Studio first: horizon lock ON, tilt recovery OFF, vibration reduction OFF.", "Need stitched 360", "OK", "Warning") | Out-Null
    return
  }
  if (-not $script:inputs.Contains($p)) { $script:inputs.Add($p) }
  if ($ext -in @(".mp4", ".mov", ".mkv", ".webm")) {
    $info = Get-VideoInfo $p
    $fpsBox.Value = [decimal]$info.suggestedFps
    $fpsHint.Text = ("{0}s clip. {1} fps ~ {2} stills." -f [int]$info.duration, $info.suggestedFps, [int]($info.duration * $info.suggestedFps))
    if (-not $sceneBox.Text -or $sceneBox.Text -eq "campus-walk") {
      $sceneBox.Text = [IO.Path]::GetFileNameWithoutExtension($p)
    }
    if ($info.suggestedFps -ge 1.9) { $preset.SelectedIndex = 1 }
    elseif ($info.suggestedFps -le 0.6) { $preset.SelectedIndex = 2 }
    else { $preset.SelectedIndex = 0 }
    $dropLabel.Text = Format-MediaSummary $info
    Add-UiLog (Format-MediaSummary $info)
  }
  Refresh-FileList
}

function Start-JobRun {
  if ($script:inputs.Count -eq 0) {
    [System.Windows.Forms.MessageBox]::Show("Add a stitched 360 video or a folder of stills first.", "Nothing queued", "OK", "Information") | Out-Null
    return
  }
  if (-not (Find-GgpsRoot)) {
    Add-UiLog (Get-GgpsMissingHelp)
    return
  }
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safe = ($sceneBox.Text -replace '[^A-Za-z0-9_-]', '_').Trim('_')
  if (-not $safe) { $safe = "job" }
  $script:jobDir = Join-Path $env:USERPROFILE ("ggps-jobs\" + $stamp + "-" + $safe)
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
  $argList.Add("-SceneName"); $argList.Add("`"$safe`"")
  $argList.Add("-Fps"); $argList.Add([string]$fpsBox.Value)
  $argList.Add("-LogPath"); $argList.Add("`"$($script:logFile)`"")
  if ($chkTrain.Checked) { $argList.Add("-Train") }
  if ($chkLarge.Checked) { $argList.Add("-LargeOutdoor") }
  if ($chkIngest.Checked) { $argList.Add("-Ingest") }
  if ($qual.SelectedIndex -eq 1) { $argList.Add("-Iters"); $argList.Add("30000") } else { $argList.Add("-Iters"); $argList.Add("7000") }
  $argList.Add("-InputPaths")
  foreach ($p in $script:inputs) { $argList.Add("`"$p`"") }
  $btnStart.Enabled = $false
  $prog.Style = "Marquee"
  $stage.Text = "Starting..."
  Add-UiLog ("Starting " + $script:jobDir)
  Add-UiLog ("FPS " + $fpsBox.Value + "  train=" + $chkTrain.Checked + "  largeOutdoor=" + $chkLarge.Checked)
  $script:proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList.ToArray() -PassThru -WindowStyle Hidden
  $timer.Start()
}

$preset.add_SelectedIndexChanged({
  switch ($preset.SelectedIndex) {
    0 { $fpsBox.Value = 1; $chkLarge.Checked = $false; $fpsHint.Text = "Short walk. 1 still per second." }
    1 { $fpsBox.Value = 2; $chkLarge.Checked = $false; $fpsHint.Text = "Denser overlap. More stills, slower SfM." }
    2 { $fpsBox.Value = [decimal]0.5; $chkLarge.Checked = $true; $fpsHint.Text = "Long outdoor. 0.5 fps. Partition is for huge sets." }
  }
})

$drop.add_DragEnter({
  param($src, $e)
  if ($e.Data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
    $e.Effect = [System.Windows.Forms.DragDropEffects]::Copy
  }
})
$drop.add_DragDrop({
  param($src, $e)
  $paths = [string[]]$e.Data.GetData([System.Windows.Forms.DataFormats]::FileDrop)
  foreach ($p in $paths) { Add-InputPath $p }
})

$btnAddVideo.add_Click({
  $dlg = New-Object System.Windows.Forms.OpenFileDialog
  $dlg.Filter = "Stitched 360 video (*.mp4;*.mov;*.mkv)|*.mp4;*.mov;*.mkv|All files (*.*)|*.*"
  $dlg.Multiselect = $true
  $dlg.Title = "Add stitched 360 video"
  if ($dlg.ShowDialog() -eq "OK") { foreach ($p in $dlg.FileNames) { Add-InputPath $p } }
})
$miVideo.add_Click({ $btnAddVideo.PerformClick() })

$btnAddFolder.add_Click({
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  $dlg.Description = "Folder of stitched 360 stills"
  if ($dlg.ShowDialog() -eq "OK") { Add-InputPath $dlg.SelectedPath }
})
$miStills.add_Click({ $btnAddFolder.PerformClick() })

$btnStart.add_Click({ Start-JobRun })
$btnInstall.add_Click({
  Add-UiLog "Installing PanoLOG trainer in WSL. This takes a while (conda + PyTorch + compile)."
  $inst = Join-Path $here "Install-PanoLog.ps1"
  Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoProfile","-ExecutionPolicy","Bypass","-File","`"$inst`"") -WindowStyle Hidden
  $stage.Text = "Installing PanoLOG trainer... watch ggps-jobs\panolog-install.log"
})
$miExit.add_Click({ $form.Close() })
$miOpenJobs.add_Click({
  $root = Join-Path $env:USERPROFILE "ggps-jobs"
  New-Item -ItemType Directory -Force -Path $root | Out-Null
  Start-Process explorer.exe $root
})
$btnOpen.add_Click({
  $target = $script:jobDir
  if (-not $target) { $target = Join-Path $env:USERPROFILE "ggps-jobs" }
  if (Test-Path -LiteralPath $target) { Start-Process explorer.exe $target } else { Add-UiLog "No job folder yet." }
})
$miExportFrames.add_Click({
  if ($script:jobDir -and (Test-Path (Join-Path $script:jobDir "images"))) {
    Start-Process explorer.exe (Join-Path $script:jobDir "images")
  } else { Add-UiLog "No extracted frames yet. Run Start first." }
})

function Export-Ply {
  $src = $null
  if ($script:jobDir) {
    foreach ($n in @("gaussian.spz", "gaussian.ply", "point_cloud.ply")) {
      $hits = @(Get-ChildItem -LiteralPath $script:jobDir -Recurse -Filter $n -ErrorAction SilentlyContinue)
      if ($hits.Count -gt 0) { $src = $hits[0].FullName; break }
    }
  }
  if (-not $src) {
    [System.Windows.Forms.MessageBox]::Show("No Gaussian splat yet. Install the PanoLOG trainer, then Start with Train on. Output is gaussian.spz for the Twin viewer.", "No splat file", "OK", "Information") | Out-Null
    return
  }
  $dlg = New-Object System.Windows.Forms.SaveFileDialog
  $dlg.Filter = "Twin splat SPZ (*.spz)|*.spz|Gaussian PLY (*.ply)|*.ply"
  $dlg.FileName = [IO.Path]::GetFileName($src)
  if ($dlg.ShowDialog() -eq "OK") {
    Copy-Item -LiteralPath $src -Destination $dlg.FileName -Force
    Add-UiLog ("Exported " + $dlg.FileName)
  }
}
$btnExport.add_Click({ Export-Ply })
$miExportPly.add_Click({ Export-Ply })

$jobsList.add_DoubleClick({
  if ($jobsList.SelectedItem) {
    $p = Join-Path (Join-Path $env:USERPROFILE "ggps-jobs") ([string]$jobsList.SelectedItem)
    if (Test-Path -LiteralPath $p) { Start-Process explorer.exe $p }
  }
})

$miHow.add_Click({
  $msg = @"
For the video on your Desktop (51 seconds, 5760x2880 stitched 360):

1. Preset: Short walk / this 51s clip
2. Video extract rate: 1.0
3. Train Gaussian splat: ON (you want a splat, but this PC cannot train until PanoLOG is installed)
4. Large outdoor: OFF
5. Click Start processing

What you get today without PanoLOG:
  stills in ggps-jobs\...\images
  camera poses after SfM
  NO gaussian.ply yet

What you get after PanoLOG is installed:
  export\gaussian.ply  = the Gaussian splat for local inspect
  That is NOT the phone share .spz from Postshot.
"@
  [System.Windows.Forms.MessageBox]::Show($msg, "What should I click?", "OK", "Information") | Out-Null
})
$miDocs.add_Click({
  $doc = Join-Path $here "..\..\..\docs\research\GGPS_DROP_APP.md"
  if (Test-Path -LiteralPath $doc) { Start-Process $doc } else { Add-UiLog $doc }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 400
$timer.add_Tick({
  if ($script:logFile -and (Test-Path -LiteralPath $script:logFile)) {
    $fs = [System.IO.File]::Open($script:logFile, "Open", "Read", "ReadWrite")
    try {
      $fs.Seek($script:logPos, "Begin") | Out-Null
      $sr = New-Object System.IO.StreamReader $fs
      $chunk = $sr.ReadToEnd()
      $script:logPos = $fs.Position
      $sr.Close()
      if ($chunk) {
        $logBox.AppendText($chunk)
        if ($chunk -match "STAGE extract") { $stage.Text = "Extracting stills from video..." }
        elseif ($chunk -match "STAGE sfm") { $stage.Text = "Estimating 360 cameras (SfM)..." }
        elseif ($chunk -match "STAGE export") { $stage.Text = "Copying Gaussian PLY..." }
        elseif ($chunk -match "coarse train") { $stage.Text = "Training Gaussian splat..." }
      }
    } finally { $fs.Close() }
  }
  if ($script:proc -and $script:proc.HasExited) {
    $timer.Stop()
    $btnStart.Enabled = $true
    $prog.Style = "Continuous"
    $prog.Value = 100
    $code = $script:proc.ExitCode
    $script:proc = $null
    Refresh-Jobs
    $spz = Join-Path $script:jobDir "export\gaussian.spz"
    $shareFile = Join-Path $script:jobDir "share.json"
    if (Test-Path -LiteralPath $spz) {
      $script:lastPly = $spz
      $stage.Text = "Done. gaussian.spz is ready for the Twin viewer."
      $outBox.BackColor = $okBg
      $outBox.Text = "Splat: $spz"
    } else {
      $stage.Text = "Finished without a splat file. See log."
    }
    if (Test-Path -LiteralPath $shareFile) {
      $share = Get-Content -LiteralPath $shareFile -Raw | ConvertFrom-Json
      if ($share.shareUrl) {
        $outBox.Text = ("Twin share: " + $share.shareUrl)
        Start-Process $share.shareUrl
      }
    }
    Add-UiLog ("process exit " + $code)
  }
})

$form.add_FormClosed({ $timer.Stop() })

Refresh-EnvBanner
Refresh-Jobs
Add-UiLog "GGPS Research Studio. Research - not for customer jobs."
if ($ggps) { Add-UiLog "Trainer code: $ggps" } else { Add-UiLog (Get-GgpsMissingHelp) }
if ($script:panoReady) { Add-UiLog "PanoLOG env found. Training can write gaussian.ply." }
else { Add-UiLog "PanoLOG env is NOT installed. Start will extract stills and run SfM only." }
Add-UiLog "For VID_20260821_165600 stitched 360: use 1.0 fps, Large outdoor OFF, then Start."

[void]$form.ShowDialog()
