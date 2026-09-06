# Slate360 Research Studio. 360 GGPS + 2D Postshot. Research only.
$ErrorActionPreference = "Stop"
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "Find-Ggps.ps1")
. (Join-Path $here "MediaProbe.ps1")

[System.Windows.Forms.Application]::EnableVisualStyles()

$navy = [System.Drawing.Color]::FromArgb(12, 28, 48)
$accent = [System.Drawing.Color]::FromArgb(201, 162, 79)
$ink = [System.Drawing.Color]::FromArgb(28, 32, 38)
$muted = [System.Drawing.Color]::FromArgb(90, 98, 110)
$bg = [System.Drawing.Color]::FromArgb(246, 244, 240)
$card = [System.Drawing.Color]::White
$okBg = [System.Drawing.Color]::FromArgb(226, 242, 230)
$warnBg = [System.Drawing.Color]::FromArgb(255, 243, 220)

$ggps = Find-GgpsRoot
$postshot = Join-Path $env:ProgramFiles "Jawset Postshot\bin\postshot-cli.exe"
$script:panoReady = Test-PanoLogReady
$script:inputs = New-Object System.Collections.Generic.List[string]
$script:mode = "360"
$script:jobDir = $null
$script:proc = $null
$script:logFile = $null
$script:logPos = 0
$script:exportFormat = "spz"
$script:exportDir = Join-Path ([Environment]::GetFolderPath("Desktop")) "Slate360Exports"

$form = New-Object System.Windows.Forms.Form
$form.Text = "Slate360 Research Studio"
$form.Size = New-Object System.Drawing.Size(1120, 740)
$form.MinimumSize = New-Object System.Drawing.Size(960, 640)
$form.StartPosition = "CenterScreen"
$form.BackColor = $bg
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
$form.KeyPreview = $true

$menu = New-Object System.Windows.Forms.MenuStrip
$fileMenu = New-Object System.Windows.Forms.ToolStripMenuItem("File")
$miAdd = New-Object System.Windows.Forms.ToolStripMenuItem("Add files...")
$miFolder = New-Object System.Windows.Forms.ToolStripMenuItem("Add folder...")
$miJobs = New-Object System.Windows.Forms.ToolStripMenuItem("Open jobs folder")
$miExport = New-Object System.Windows.Forms.ToolStripMenuItem("Export splat...")
$miExit = New-Object System.Windows.Forms.ToolStripMenuItem("Exit")
[void]$fileMenu.DropDownItems.AddRange(@($miAdd,$miFolder,(New-Object System.Windows.Forms.ToolStripSeparator),$miJobs,$miExport,(New-Object System.Windows.Forms.ToolStripSeparator),$miExit))
$helpMenu = New-Object System.Windows.Forms.ToolStripMenuItem("Help")
$miHow = New-Object System.Windows.Forms.ToolStripMenuItem("How this works")
[void]$helpMenu.DropDownItems.Add($miHow)
[void]$menu.Items.AddRange(@($fileMenu,$helpMenu))
$form.MainMenuStrip = $menu
$form.Controls.Add($menu)

$header = New-Object System.Windows.Forms.Panel
$header.Dock = "Top"
$header.Height = 72
$header.BackColor = $navy
$form.Controls.Add($header)
$hTitle = New-Object System.Windows.Forms.Label
$hTitle.Text = "Slate360 Research Studio"
$hTitle.ForeColor = [System.Drawing.Color]::White
$hTitle.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 18)
$hTitle.Location = New-Object System.Drawing.Point(20, 10)
$hTitle.AutoSize = $true
$header.Controls.Add($hTitle)
$hSub = New-Object System.Windows.Forms.Label
$hSub.Text = "Drop a campus scan  ->  Gaussian splat  ->  Twin viewer"
$hSub.ForeColor = [System.Drawing.Color]::FromArgb(180, 196, 214)
$hSub.Location = New-Object System.Drawing.Point(22, 42)
$hSub.AutoSize = $true
$header.Controls.Add($hSub)
$badge = New-Object System.Windows.Forms.Label
$badge.Text = "  RESEARCH  "
$badge.BackColor = $accent
$badge.ForeColor = $navy
$badge.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 8)
$badge.Location = New-Object System.Drawing.Point(320, 16)
$badge.AutoSize = $true
$header.Controls.Add($badge)

$tabs = New-Object System.Windows.Forms.TabControl
$tabs.Dock = "Top"
$tabs.Height = 42
$tabs.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 10)
$tab360 = New-Object System.Windows.Forms.TabPage
$tab360.Text = "  360 camera  "
$tab2d = New-Object System.Windows.Forms.TabPage
$tab2d.Text = "  Phone and drone  "
$tabs.TabPages.Add($tab360)
$tabs.TabPages.Add($tab2d)
$form.Controls.Add($tabs)

$tips = New-Object System.Windows.Forms.ToolTip
$tips.AutoPopDelay = 22000

$split = New-Object System.Windows.Forms.SplitContainer
$split.Dock = "Fill"
$split.SplitterDistance = 360
$split.BackColor = $bg
$form.Controls.Add($split)
$split.BringToFront(); $tabs.BringToFront(); $header.BringToFront(); $menu.BringToFront()

$left = New-Object System.Windows.Forms.Panel
$left.Dock = "Fill"
$left.AutoScroll = $true
$left.Padding = New-Object System.Windows.Forms.Padding(16)
$split.Panel1.Controls.Add($left)

function Lbl([int]$y,[string]$t) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $t
  $l.ForeColor = $muted
  $l.Location = New-Object System.Drawing.Point(16, $y)
  $l.Size = New-Object System.Drawing.Size(310, 18)
  $left.Controls.Add($l)
  return $l
}

$y = 12
[void](Lbl $y "PROJECT NAME")
$y += 20
$sceneBox = New-Object System.Windows.Forms.TextBox
$sceneBox.Location = New-Object System.Drawing.Point(16, $y)
$sceneBox.Size = New-Object System.Drawing.Size(312, 28)
$sceneBox.Text = "campus-scan"
$left.Controls.Add($sceneBox)

$y += 42
[void](Lbl $y "CAPTURE LENGTH")
$y += 20
$preset = New-Object System.Windows.Forms.ComboBox
$preset.DropDownStyle = "DropDownList"
$preset.Location = New-Object System.Drawing.Point(16, $y)
$preset.Size = New-Object System.Drawing.Size(312, 28)
[void]$preset.Items.AddRange(@("Short walk  ~1 min","Medium walk  1-3 min","Long campus loop  3+ min"))
$preset.SelectedIndex = 2
$left.Controls.Add($preset)

$y += 42
$lblFps = Lbl $y "STILLS PER SECOND FROM VIDEO"
$y += 20
$fpsBox = New-Object System.Windows.Forms.NumericUpDown
$fpsBox.Location = New-Object System.Drawing.Point(16, $y)
$fpsBox.Size = New-Object System.Drawing.Size(72, 28)
$fpsBox.DecimalPlaces = 1
$fpsBox.Minimum = 0.5
$fpsBox.Maximum = 4
$fpsBox.Increment = 0.5
$fpsBox.Value = 0.5
$left.Controls.Add($fpsBox)
$fpsHint = New-Object System.Windows.Forms.Label
$fpsHint.Location = New-Object System.Drawing.Point(96, $y)
$fpsHint.Size = New-Object System.Drawing.Size(232, 36)
$fpsHint.ForeColor = $muted
$fpsHint.Text = "Not camera fps. 0.5 = one still every 2 seconds."
$left.Controls.Add($fpsHint)

$y += 48
[void](Lbl $y "QUALITY")
$y += 20
$qual = New-Object System.Windows.Forms.ComboBox
$qual.DropDownStyle = "DropDownList"
$qual.Location = New-Object System.Drawing.Point(16, $y)
$qual.Size = New-Object System.Drawing.Size(312, 28)
[void]$qual.Items.AddRange(@("Preview  (faster look)","Full  (highest quality)"))
$qual.SelectedIndex = 0
$left.Controls.Add($qual)

$y += 42
$chkTrain = New-Object System.Windows.Forms.CheckBox
$chkTrain.Text = "Train Gaussian splat"
$chkTrain.Checked = $true
$chkTrain.Location = New-Object System.Drawing.Point(16, $y)
$chkTrain.Size = New-Object System.Drawing.Size(312, 24)
$left.Controls.Add($chkTrain)
$y += 24
$chkIngest = New-Object System.Windows.Forms.CheckBox
$chkIngest.Text = "Open in Twin viewer when done"
$chkIngest.Checked = $true
$chkIngest.Location = New-Object System.Drawing.Point(16, $y)
$chkIngest.Size = New-Object System.Drawing.Size(312, 24)
$left.Controls.Add($chkIngest)
$y += 24
$chkLarge = New-Object System.Windows.Forms.CheckBox
$chkLarge.Text = "Huge outdoor partition"
$chkLarge.Checked = $false
$chkLarge.Location = New-Object System.Drawing.Point(16, $y)
$chkLarge.Size = New-Object System.Drawing.Size(312, 24)
$left.Controls.Add($chkLarge)

$y += 36
$outBox = New-Object System.Windows.Forms.TextBox
$outBox.Multiline = $true
$outBox.ReadOnly = $true
$outBox.Location = New-Object System.Drawing.Point(16, $y)
$outBox.Size = New-Object System.Drawing.Size(312, 78)
$outBox.BackColor = $warnBg
$outBox.BorderStyle = "FixedSingle"
$left.Controls.Add($outBox)

$y += 90
$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Create splat"
$btnStart.Location = New-Object System.Drawing.Point(16, $y)
$btnStart.Size = New-Object System.Drawing.Size(312, 42)
$btnStart.BackColor = $navy
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.Font = New-Object System.Drawing.Font("Segoe UI Semibold", 11)
$left.Controls.Add($btnStart)

$y += 52
$btnExport = New-Object System.Windows.Forms.Button
$btnExport.Text = "Export..."
$btnExport.Location = New-Object System.Drawing.Point(16, $y)
$btnExport.Size = New-Object System.Drawing.Size(152, 34)
$btnExport.BackColor = $card
$left.Controls.Add($btnExport)
$btnOpen = New-Object System.Windows.Forms.Button
$btnOpen.Text = "Open job"
$btnOpen.Location = New-Object System.Drawing.Point(176, $y)
$btnOpen.Size = New-Object System.Drawing.Size(152, 34)
$left.Controls.Add($btnOpen)

$y += 44
$btnContinue = New-Object System.Windows.Forms.Button
$btnContinue.Text = "Continue last extract"
$btnContinue.Location = New-Object System.Drawing.Point(16, $y)
$btnContinue.Size = New-Object System.Drawing.Size(312, 30)
$left.Controls.Add($btnContinue)
$tips.SetToolTip($btnContinue, "Skip re-extracting. Use existing stills in the selected job and run SfM + train.")

$y += 40
[void](Lbl $y "RECENT JOBS  (double-click to open)")
$y += 20
$jobsList = New-Object System.Windows.Forms.ListBox
$jobsList.Location = New-Object System.Drawing.Point(16, $y)
$jobsList.Size = New-Object System.Drawing.Size(312, 100)
$left.Controls.Add($jobsList)

# right
$grid = New-Object System.Windows.Forms.TableLayoutPanel
$grid.Dock = "Fill"
$grid.ColumnCount = 1
$grid.RowCount = 5
[void]$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 168)))
[void]$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 64)))
[void]$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 18)))
[void]$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Absolute, 26)))
[void]$grid.RowStyles.Add((New-Object System.Windows.Forms.RowStyle([System.Windows.Forms.SizeType]::Percent, 100)))
$split.Panel2.Padding = New-Object System.Windows.Forms.Padding(8, 8, 16, 8)
$split.Panel2.Controls.Add($grid)

$drop = New-Object System.Windows.Forms.Panel
$drop.Dock = "Fill"
$drop.AllowDrop = $true
$drop.BackColor = $card
$dropLabel = New-Object System.Windows.Forms.Label
$dropLabel.Dock = "Fill"
$dropLabel.TextAlign = "MiddleCenter"
$dropLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$dropLabel.ForeColor = $navy
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
$stage.Text = "Ready"
$stage.ForeColor = $muted
$grid.Controls.Add($stage, 0, 3)
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Multiline = $true
$logBox.ScrollBars = "Both"
$logBox.Dock = "Fill"
$logBox.ReadOnly = $true
$logBox.BackColor = $card
$logBox.Font = New-Object System.Drawing.Font("Cascadia Mono", 9)
$grid.Controls.Add($logBox, 0, 4)

$statusStrip = New-Object System.Windows.Forms.StatusStrip
$stMode = New-Object System.Windows.Forms.ToolStripStatusLabel
$stTrain = New-Object System.Windows.Forms.ToolStripStatusLabel
$stGpu = New-Object System.Windows.Forms.ToolStripStatusLabel
$stGpu.Spring = $true
$stGpu.Text = "RTX 3090"
[void]$statusStrip.Items.AddRange(@($stMode,$stTrain,$stGpu))
$form.Controls.Add($statusStrip)
$statusStrip.BringToFront()

function Add-UiLog([string]$t) { $logBox.AppendText($t + [Environment]::NewLine) }

function Set-ModeUi {
  if ($script:mode -eq "2d") {
    $stMode.Text = "Phone / drone"
    $dropLabel.Text = "Drop iPhone, drone, or camera photos or a 2D video" + [Environment]::NewLine + [Environment]::NewLine + "Postshot trains a pinhole Gaussian on the 3090. Output is Twin SPZ."
    $lblFps.Text = "STILLS PER SECOND  (if you drop video)"
    $chkLarge.Visible = $false
  } else {
    $stMode.Text = "360 camera"
    $dropLabel.Text = "Drop a stitched 360 video or equirect stills from a walk" + [Environment]::NewLine + [Environment]::NewLine + "Not raw .insv. GGPS trains the 360 splat. Output is Twin SPZ."
    $lblFps.Text = "STILLS PER SECOND FROM VIDEO"
    $chkLarge.Visible = $true
  }
  if ($script:mode -eq "2d") {
    if (Test-Path -LiteralPath $postshot) {
      $stTrain.Text = "Postshot ready"
      $outBox.BackColor = $okBg
      $outBox.Text = "2D path uses Postshot. Default export is gaussian.spz for your Twin viewer."
    } else {
      $stTrain.Text = "Postshot missing"
      $outBox.BackColor = $warnBg
      $outBox.Text = "Install Jawset Postshot for phone/drone splats."
    }
  } else {
    if ($script:panoReady) {
      $stTrain.Text = "PanoLOG ready"
      $outBox.BackColor = $okBg
      $outBox.Text = "360 path is ready. Default export: Twin SPZ. Your last 360 extract can Continue without re-decoding the video."
    } else {
      $stTrain.Text = "PanoLOG missing"
      $outBox.BackColor = $warnBg
      $outBox.Text = "360 trainer is not ready. 2D tab still works with Postshot."
    }
  }
}

function Refresh-Jobs {
  $jobsList.Items.Clear()
  $root = Join-Path $env:USERPROFILE "ggps-jobs"
  if (Test-Path $root) {
    Get-ChildItem $root -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 14 | ForEach-Object { [void]$jobsList.Items.Add($_.Name) }
  }
}
function Refresh-Files {
  $fileList.Items.Clear()
  foreach ($p in $script:inputs) { [void]$fileList.Items.Add($p) }
}

function Add-InputPath([string]$p) {
  if (-not (Test-Path -LiteralPath $p)) { return }
  $ext = [IO.Path]::GetExtension($p).ToLowerInvariant()
  if ($ext -eq ".insv") {
    [System.Windows.Forms.MessageBox]::Show("Raw .insv is rejected. Stitch in Insta360 Studio first.", "Need stitched 360", "OK", "Warning") | Out-Null
    return
  }
  if (-not $script:inputs.Contains($p)) { $script:inputs.Add($p) }
  if ($ext -in @(".mp4",".mov",".mkv",".webm")) {
    $info = Get-VideoInfo $p
    if ($info.duration -gt 0) {
      $fpsBox.Value = [decimal]$info.suggestedFps
      $n = [int]($info.duration * $info.suggestedFps)
      $fpsHint.Text = ("{0}s  {1}x{2}. {3} fps ~ {4} stills." -f [int]$info.duration, $info.width, $info.height, $info.suggestedFps, $n)
      if ($info.suggestedFps -le 0.6) { $preset.SelectedIndex = 2 }
      elseif ($info.suggestedFps -ge 1.9) { $preset.SelectedIndex = 0 }
      else { $preset.SelectedIndex = 1 }
      $dropLabel.Text = Format-MediaSummary $info
      Add-UiLog (Format-MediaSummary $info)
    }
    if ($sceneBox.Text -eq "campus-scan") { $sceneBox.Text = [IO.Path]::GetFileNameWithoutExtension($p) }
  }
  Refresh-Files
}

function Show-ExportDialog {
  $srcSpz = $null; $srcPly = $null
  if ($script:jobDir) {
    $s = Join-Path $script:jobDir "export\gaussian.spz"
    $p = Join-Path $script:jobDir "export\gaussian.ply"
    if (Test-Path $s) { $srcSpz = $s }
    if (Test-Path $p) { $srcPly = $p }
    if (-not $srcPly) {
      $hits = @(Get-ChildItem $script:jobDir -Recurse -Filter "point_cloud.ply" -ErrorAction SilentlyContinue)
      if ($hits.Count -gt 0) { $srcPly = $hits[0].FullName }
    }
  }
  if (-not $srcSpz -and -not $srcPly) {
    [System.Windows.Forms.MessageBox]::Show("No splat yet. Create splat first. Default format is Twin SPZ.", "Nothing to export", "OK", "Information") | Out-Null
    return
  }
  $dlg = New-Object System.Windows.Forms.SaveFileDialog
  $dlg.Title = "Save Gaussian splat"
  $dlg.Filter = "Twin viewer SPZ (*.spz)|*.spz|Gaussian PLY (*.ply)|*.ply|Standard splat (*.splat)|*.splat|Standalone HTML (*.html)|*.html"
  $dlg.FilterIndex = 1
  $dlg.InitialDirectory = $script:exportDir
  $name = $sceneBox.Text
  if (-not $name) { $name = "gaussian" }
  $dlg.FileName = $name + ".spz"
  if ($dlg.ShowDialog() -ne "OK") { return }
  $script:exportDir = Split-Path $dlg.FileName
  $ext = [IO.Path]::GetExtension($dlg.FileName).ToLowerInvariant()
  $fmt = "spz"
  if ($ext -eq ".ply") { $fmt = "ply" }
  elseif ($ext -eq ".splat") { $fmt = "splat" }
  elseif ($ext -eq ".html") { $fmt = "html" }
  $convert = Join-Path $here "convert-splat.mjs"
  if ($fmt -eq "spz" -and $srcSpz) { Copy-Item $srcSpz $dlg.FileName -Force }
  elseif ($fmt -eq "ply" -and $srcPly) { Copy-Item $srcPly $dlg.FileName -Force }
  elseif ($srcPly) {
    & node $convert --in $srcPly --out $dlg.FileName --format $fmt
  } elseif ($srcSpz -and $fmt -eq "spz") {
    Copy-Item $srcSpz $dlg.FileName -Force
  } else {
    Add-UiLog "Need a PLY to convert to that format."
    return
  }
  Add-UiLog ("Saved " + $dlg.FileName)
  Start-Process explorer.exe "/select,$($dlg.FileName)"
}

function Start-JobRun([switch]$Resume) {
  $job = $null
  if ($Resume -and $jobsList.SelectedItem) {
    $job = Join-Path (Join-Path $env:USERPROFILE "ggps-jobs") ([string]$jobsList.SelectedItem)
  } elseif ($Resume) {
    $job = Join-Path $env:USERPROFILE "ggps-jobs\20260906-160452-stitchedhighpass"
  }
  if ($Resume -and $job -and (Test-Path (Join-Path $job "images"))) {
    $script:jobDir = $job
  } else {
    if ($script:inputs.Count -eq 0) {
      [System.Windows.Forms.MessageBox]::Show("Drop a video or photo folder first.", "Nothing queued", "OK", "Information") | Out-Null
      return
    }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $safe = ($sceneBox.Text -replace '[^A-Za-z0-9_-]', '_').Trim('_')
    if (-not $safe) { $safe = "job" }
    $script:jobDir = Join-Path $env:USERPROFILE ("ggps-jobs\" + $stamp + "-" + $safe)
    New-Item -ItemType Directory -Force -Path $script:jobDir | Out-Null
  }
  $script:logFile = Join-Path $script:jobDir "drop.log"
  $script:logPos = 0
  if (-not (Test-Path $script:logFile)) { Set-Content $script:logFile "" }
  $run = Join-Path $here "run_job.ps1"
  $argList = New-Object System.Collections.Generic.List[string]
  $argList.AddRange(@("-NoProfile","-ExecutionPolicy","Bypass","-File","`"$run`"","-JobDir","`"$($script:jobDir)`"","-SceneName","`"$($sceneBox.Text)`"","-Fps","$($fpsBox.Value)","-LogPath","`"$($script:logFile)`"","-Mode",$script:mode,"-ExportFormat","spz")) | Out-Null
  if ($chkTrain.Checked) { $argList.Add("-Train") }
  if ($chkIngest.Checked) { $argList.Add("-Ingest") }
  if ($chkLarge.Checked -and $script:mode -eq "360") { $argList.Add("-LargeOutdoor") }
  if ($qual.SelectedIndex -eq 1) { $argList.Add("-Iters"); $argList.Add("30000") } else { $argList.Add("-Iters"); $argList.Add("7000") }
  if ($Resume) { $argList.Add("-SkipExtract"); $argList.Add("-SkipBlur") }
  if ($script:inputs.Count -gt 0) {
    $argList.Add("-InputPaths")
    foreach ($p in $script:inputs) { $argList.Add("`"$p`"") }
  } elseif ($Resume) {
    $argList.Add("-SkipExtract")
    $argList.Add("-InputPaths")
    $argList.Add("`"$($script:jobDir)\images`"")
  }
  $btnStart.Enabled = $false
  $prog.Style = "Marquee"
  $stage.Text = "Working..."
  Add-UiLog ("Start " + $script:mode + "  " + $script:jobDir)
  $script:proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList.ToArray() -PassThru -WindowStyle Hidden
  $timer.Start()
}

$tabs.add_SelectedIndexChanged({
  if ($tabs.SelectedIndex -eq 1) { $script:mode = "2d" } else { $script:mode = "360" }
  Set-ModeUi
})
$preset.add_SelectedIndexChanged({
  switch ($preset.SelectedIndex) {
    0 { $fpsBox.Value = 2 }
    1 { $fpsBox.Value = 1 }
    2 { $fpsBox.Value = [decimal]0.5 }
  }
})
$drop.add_DragEnter({ param($s,$e) if ($e.Data.GetDataPresent([Windows.Forms.DataFormats]::FileDrop)) { $e.Effect = "Copy" } })
$drop.add_DragDrop({
  param($s,$e)
  foreach ($p in [string[]]$e.Data.GetData([Windows.Forms.DataFormats]::FileDrop)) { Add-InputPath $p }
})
$miAdd.add_Click({
  $d = New-Object System.Windows.Forms.OpenFileDialog
  $d.Multiselect = $true
  $d.Filter = "Media (*.mp4;*.mov;*.jpg;*.png)|*.mp4;*.mov;*.mkv;*.jpg;*.jpeg;*.png|All|*.*"
  if ($d.ShowDialog() -eq "OK") { foreach ($p in $d.FileNames) { Add-InputPath $p } }
})
$miFolder.add_Click({
  $d = New-Object System.Windows.Forms.FolderBrowserDialog
  if ($d.ShowDialog() -eq "OK") { Add-InputPath $d.SelectedPath }
})
$btnStart.add_Click({ Start-JobRun })
$btnContinue.add_Click({ Start-JobRun -Resume })
$btnExport.add_Click({ Show-ExportDialog })
$miExport.add_Click({ Show-ExportDialog })
$miExit.add_Click({ $form.Close() })
$miJobs.add_Click({ Start-Process explorer.exe (Join-Path $env:USERPROFILE "ggps-jobs") })
$btnOpen.add_Click({
  $t = $script:jobDir
  if (-not $t) { $t = Join-Path $env:USERPROFILE "ggps-jobs" }
  if (Test-Path $t) { Start-Process explorer.exe $t }
})
$jobsList.add_DoubleClick({
  if ($jobsList.SelectedItem) {
    Start-Process explorer.exe (Join-Path (Join-Path $env:USERPROFILE "ggps-jobs") ([string]$jobsList.SelectedItem))
  }
})
$miHow.add_Click({
  $m = @"
360 tab: stitched equirect video or panos. GGPS on the 3090. Default save is Twin SPZ.

Phone and drone tab: iPhone/drone photos or 2D video. Postshot on the 3090. Same SPZ export.

stitchedhighpass.mp4 is 6 min 54 s at 5.7K. Use Long campus loop (0.5 fps, ~207 stills). Extract already finished. Click Continue last extract to skip the 7 GB decode and run cameras + train.

Export... lets you pick SPZ (default), PLY, .splat, or HTML, and the save folder.

Gaussian is not an OBJ mesh. Use SPZ in Twin. Sparse points are in the job folder if you need a point cloud.
"@
  [System.Windows.Forms.MessageBox]::Show($m, "How this works", "OK", "Information") | Out-Null
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500
$timer.add_Tick({
  if ($script:logFile -and (Test-Path $script:logFile)) {
    try {
      $fs = [IO.File]::Open($script:logFile, "Open", "Read", "ReadWrite")
      $fs.Seek($script:logPos, "Begin") | Out-Null
      $sr = New-Object IO.StreamReader $fs
      $chunk = $sr.ReadToEnd()
      $script:logPos = $fs.Position
      $sr.Close(); $fs.Close()
      if ($chunk) {
        $logBox.AppendText($chunk)
        if ($chunk -match "STAGE extract") { $stage.Text = "Extracting stills..." }
        elseif ($chunk -match "STAGE sfm") { $stage.Text = "Estimating cameras..." }
        elseif ($chunk -match "STAGE train") { $stage.Text = "Training Gaussian splat..." }
        elseif ($chunk -match "STAGE export") { $stage.Text = "Packing Twin SPZ..." }
        elseif ($chunk -match "STAGE ingest") { $stage.Text = "Opening Twin viewer..." }
      }
    } catch {}
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
    $share = Join-Path $script:jobDir "share.json"
    if (Test-Path $spz) { $stage.Text = "Done. Use Export to save the splat." ; $outBox.BackColor = $okBg ; $outBox.Text = "Splat ready: $spz" }
    else { $stage.Text = "Finished without a splat. See log." }
    if (Test-Path $share) {
      $u = (Get-Content $share -Raw | ConvertFrom-Json).shareUrl
      if ($u) { $outBox.Text = "Twin: $u" ; Start-Process $u }
    }
    Add-UiLog ("exit " + $code)
  }
})
$form.add_FormClosed({ $timer.Stop() })

Set-ModeUi
Refresh-Jobs
Add-UiLog "Slate360 Research Studio. Research only."
Add-UiLog "PanoLOG=$(if ($script:panoReady) { 'ready' } else { 'missing' })  Postshot=$(Test-Path $postshot)"
Add-UiLog "stitchedhighpass.mp4 extract already produced 207 stills. Select that job and Continue last extract."

[void]$form.ShowDialog()
