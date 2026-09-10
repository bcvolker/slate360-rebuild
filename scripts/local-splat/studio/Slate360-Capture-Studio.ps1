# Slate360 Capture Studio — desktop operator app.
# Drop a capture (or paste a phone capture ID) -> Gaussian splat -> Twin viewer. Free, local, RTX.
# Engine: engine\run-job.ps1 (pull -> ffmpeg -> pycolmap -> Brush -> walk/mesh -> 8-bit SPZ -> publish).
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$engine = Join-Path $here "engine\run-job.ps1"
$jobsRoot = Join-Path $env:USERPROFILE "Slate360Jobs"
$settingsPath = Join-Path $env:APPDATA "Slate360\capture-studio.json"
New-Item -ItemType Directory -Force -Path $jobsRoot, (Split-Path -Parent $settingsPath) | Out-Null
# ---------------------------------------------------------------- theme (Graphite)
$Theme = @{
  canvas = [System.Drawing.ColorTranslator]::FromHtml("#0B0F15")
  panel  = [System.Drawing.ColorTranslator]::FromHtml("#11161E")
  panel2 = [System.Drawing.ColorTranslator]::FromHtml("#161C26")
  line   = [System.Drawing.ColorTranslator]::FromHtml("#232A34")
  text   = [System.Drawing.ColorTranslator]::FromHtml("#E7EAEE")
  muted  = [System.Drawing.ColorTranslator]::FromHtml("#8A94A3")
  accent = [System.Drawing.ColorTranslator]::FromHtml("#3D8EFF")
  warn   = [System.Drawing.ColorTranslator]::FromHtml("#E0A046")
  bad    = [System.Drawing.ColorTranslator]::FromHtml("#F07A6E")
}
$Fonts = @{
  title = New-Object System.Drawing.Font("Segoe UI Semibold", 18)
  h     = New-Object System.Drawing.Font("Segoe UI Semibold", 10.5)
  body  = New-Object System.Drawing.Font("Segoe UI", 9.5)
  small = New-Object System.Drawing.Font("Segoe UI", 8.5)
  mono  = New-Object System.Drawing.Font("Consolas", 8.5)
  label = New-Object System.Drawing.Font("Consolas", 8)
}
$script:settings = @{ exportDir = (Join-Path $env:USERPROFILE "Desktop\Slate360Exports"); publish = $true; lastMode = "phone"; quality = 2; brighten = $false }
if (Test-Path -LiteralPath $settingsPath) {
  try { $saved = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json; foreach ($p in $saved.PSObject.Properties) { $script:settings[$p.Name] = $p.Value } } catch {}
}
function Save-Settings { ($script:settings | ConvertTo-Json) | Set-Content -LiteralPath $settingsPath -Encoding UTF8 }
$script:mode = [string]$script:settings.lastMode
if ($script:mode -notin @("phone", "360", "2d")) { $script:mode = "phone" }
$script:inputs = New-Object System.Collections.Generic.List[string]
$script:probe = $null
$script:proc = $null
$script:jobDir = $null
$script:logOffset = 0
$script:shareUrl = $null
$script:exportPaths = @()
# ---------------------------------------------------------------- helpers
function New-Label([string]$text, [int]$x, [int]$y, [int]$w, $font, $color, [int]$h = 20) {
  $l = New-Object System.Windows.Forms.Label
  $l.Text = $text; $l.Location = New-Object System.Drawing.Point($x, $y); $l.Size = New-Object System.Drawing.Size($w, $h)
  $l.Font = $font; $l.ForeColor = $color; $l.BackColor = [System.Drawing.Color]::Transparent
  return $l
}
function New-Eyebrow([string]$text, [int]$x, [int]$y, [int]$w = 300) { return (New-Label $text.ToUpperInvariant() $x $y $w $Fonts.label $Theme.muted 16) }
function New-Panel([int]$x, [int]$y, [int]$w, [int]$h) {
  $p = New-Object System.Windows.Forms.Panel
  $p.Location = New-Object System.Drawing.Point($x, $y); $p.Size = New-Object System.Drawing.Size($w, $h)
  $p.BackColor = $Theme.panel
  $p.Add_Paint({ param($s, $e) $pen = New-Object System.Drawing.Pen($Theme.line); $e.Graphics.DrawRectangle($pen, 0, 0, $s.Width - 1, $s.Height - 1); $pen.Dispose() })
  return $p
}
function New-Button([string]$text, [int]$x, [int]$y, [int]$w, [int]$h, [bool]$primary = $false) {
  $b = New-Object System.Windows.Forms.Button
  $b.Text = $text; $b.Location = New-Object System.Drawing.Point($x, $y); $b.Size = New-Object System.Drawing.Size($w, $h)
  $b.FlatStyle = "Flat"; $b.Font = $(if ($primary) { $Fonts.h } else { $Fonts.body }); $b.Cursor = "Hand"
  if ($primary) { $b.BackColor = $Theme.accent; $b.ForeColor = $Theme.canvas; $b.FlatAppearance.BorderSize = 0 }
  else { $b.BackColor = $Theme.panel2; $b.ForeColor = $Theme.text; $b.FlatAppearance.BorderColor = $Theme.line }
  return $b
}
function New-Combo([int]$x, [int]$y, [int]$w, [string[]]$items) {
  $c = New-Object System.Windows.Forms.ComboBox
  $c.Location = New-Object System.Drawing.Point($x, $y); $c.Size = New-Object System.Drawing.Size($w, 26)
  $c.DropDownStyle = "DropDownList"; $c.FlatStyle = "Flat"; $c.Font = $Fonts.body
  $c.BackColor = $Theme.panel2; $c.ForeColor = $Theme.text
  foreach ($i in $items) { [void]$c.Items.Add($i) }
  $c.SelectedIndex = 0
  return $c
}
function New-Check([string]$text, [int]$x, [int]$y, [int]$w, [bool]$checked) {
  $k = New-Object System.Windows.Forms.CheckBox
  $k.Text = $text; $k.Location = New-Object System.Drawing.Point($x, $y); $k.Size = New-Object System.Drawing.Size($w, 24)
  $k.Font = $Fonts.body; $k.ForeColor = $Theme.text; $k.Checked = $checked; $k.FlatStyle = "Flat"
  return $k
}
function New-Text([int]$x, [int]$y, [int]$w) {
  $t = New-Object System.Windows.Forms.TextBox
  $t.Location = New-Object System.Drawing.Point($x, $y); $t.Size = New-Object System.Drawing.Size($w, 26)
  $t.Font = $Fonts.body; $t.BackColor = $Theme.panel2; $t.ForeColor = $Theme.text; $t.BorderStyle = "FixedSingle"
  return $t
}
function Fmt-Seconds([double]$s) { $ts = [TimeSpan]::FromSeconds([Math]::Max(0, $s)); if ($ts.TotalHours -ge 1) { return $ts.ToString("h\:mm\:ss") } return $ts.ToString("m\:ss") }
function To-Wsl([string]$winPath) {
  $full = [System.IO.Path]::GetFullPath($winPath)
  if ($full -match '^([A-Za-z]):\\(.*)$') { return "/mnt/" + $Matches[1].ToLowerInvariant() + "/" + ($Matches[2] -replace '\\', '/') }
  return $winPath
}
function Quote([string]$s) { return '"' + ($s -replace '"', '\"') + '"' }

# ---------------------------------------------------------------- form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Slate360 Capture Studio"
$form.Size = New-Object System.Drawing.Size(1200, 860)
$form.MinimumSize = New-Object System.Drawing.Size(1100, 780)
$form.StartPosition = "CenterScreen"
$form.BackColor = $Theme.canvas
$form.ForeColor = $Theme.text
$form.Font = $Fonts.body

# header
$form.Controls.Add((New-Label "Slate360 Capture Studio" 24 18 500 $Fonts.title $Theme.text 34))
$subtitle = New-Label "Phone capture or camera footage  ->  Gaussian splat + LiDAR mesh  ->  the twin on the phone" 24 54 800 $Fonts.body $Theme.muted
$form.Controls.Add($subtitle)

# mode switch (segmented)
$btnPhone = New-Button "Phone capture" 24 86 170 34
$btn360 = New-Button "360 camera" 194 86 150 34
$btn2d = New-Button "Photos or video" 344 86 150 34
$form.Controls.AddRange(@($btnPhone, $btn360, $btn2d))
$modeHint = New-Label "" 510 92 660 $Fonts.small $Theme.muted
$form.Controls.Add($modeHint)

# ---------------------------------------------------------------- left: capture
$left = New-Panel 24 136 372 560
$form.Controls.Add($left)
$left.Controls.Add((New-Eyebrow "Capture" 16 12))
# phone: capture ID
$idLabel = New-Label "Capture ID from the phone" 16 34 340 $Fonts.h $Theme.text
$idBox = New-Text 16 58 340
$idHint = New-Label "On the phone: open the twin, tap Copy capture ID, paste it here. The build publishes back into that same twin." 16 88 340 $Fonts.small $Theme.muted 60
$left.Controls.AddRange(@($idLabel, $idBox, $idHint))
# files: drop zone
$drop = New-Object System.Windows.Forms.Label
$drop.Location = New-Object System.Drawing.Point(16, 34); $drop.Size = New-Object System.Drawing.Size(340, 120)
$drop.Text = "Drop a video, a folder of photos, or a raw .insv here"
$drop.TextAlign = "MiddleCenter"; $drop.Font = $Fonts.h; $drop.ForeColor = $Theme.muted; $drop.BackColor = $Theme.panel2
$drop.BorderStyle = "FixedSingle"; $drop.AllowDrop = $true
$left.Controls.Add($drop)
$btnFiles = New-Button "Add files..." 16 162 165 30
$btnFolder = New-Button "Add folder..." 191 162 165 30
$btnClear = New-Button "Clear" 16 198 340 26
$left.Controls.AddRange(@($btnFiles, $btnFolder, $btnClear))
$left.Controls.Add((New-Eyebrow "In this capture" 16 236))
$inv = New-Object System.Windows.Forms.ListView
$inv.Location = New-Object System.Drawing.Point(16, 256); $inv.Size = New-Object System.Drawing.Size(340, 190)
$inv.View = "Details"; $inv.FullRowSelect = $true; $inv.HeaderStyle = "Nonclickable"; $inv.BorderStyle = "None"
$inv.BackColor = $Theme.panel2; $inv.ForeColor = $Theme.text; $inv.Font = $Fonts.small
[void]$inv.Columns.Add("Data", 110); [void]$inv.Columns.Add("Detail", 120); [void]$inv.Columns.Add("Used for", 106)
$left.Controls.Add($inv)
$invNote = New-Label "Add a capture to see what it contains." 16 452 340 $Fonts.small $Theme.muted 96
$left.Controls.Add($invNote)

# ---------------------------------------------------------------- middle: settings
$mid = New-Panel 412 136 372 560
$form.Controls.Add($mid)
$mid.Controls.Add((New-Eyebrow "Settings" 16 12))
$mid.Controls.Add((New-Label "Coverage" 16 34 120 $Fonts.h $Theme.text))
$coverage = New-Combo 16 56 340 @("Normal walk  -  1 still per second", "Short walk  -  2 stills per second", "Long walk  -  1 still every 2 seconds", "Photos only  -  use every file")
$mid.Controls.Add($coverage)
$coverageHint = New-Label "How many frames are pulled from video. More frames = better coverage, longer solve." 16 84 340 $Fonts.small $Theme.muted 30
$mid.Controls.Add($coverageHint)
$mid.Controls.Add((New-Label "Quality" 16 120 120 $Fonts.h $Theme.text))
$quality = New-Combo 16 142 340 @("Preview  -  7,000 steps at 1280 px, about 5 min", "Standard  -  15,000 steps at 1920 px, about 10 min", "Final  -  30,000 steps at 2560 px, about 25 min")
$quality.SelectedIndex = [Math]::Min(2, [Math]::Max(0, [int]$script:settings.quality))
$mid.Controls.Add($quality)
$mid.Controls.Add((New-Label "Times are for one room on the RTX 3090. Final is what gets sent to a client." 16 170 340 $Fonts.small $Theme.muted 30))
$brighten = New-Check "Brighten dark footage before solving (gamma 1.4)" 16 202 340 ([bool]$script:settings.brighten)
$mid.Controls.Add($brighten)
$mid.Controls.Add((New-Label "Also save" 16 234 120 $Fonts.h $Theme.text))
$mid.Controls.Add((New-Label "Always: full-detail SPZ + phone SPZ + walkthrough files (+ LiDAR mesh when the phone captured one)" 16 256 340 $Fonts.small $Theme.muted 30))
$fmtPly = New-Check "PLY  -  full-precision research copy" 16 288 340 $false
$fmtSplat = New-Check ".splat  -  other viewers" 16 312 170 $false
$fmtHtml = New-Check "HTML  -  double-click preview" 186 312 170 $false
$mid.Controls.AddRange(@($fmtPly, $fmtSplat, $fmtHtml))
$mid.Controls.Add((New-Label "Name" 16 344 120 $Fonts.h $Theme.text))
$nameBox = New-Text 16 366 340
$mid.Controls.Add($nameBox)
$mid.Controls.Add((New-Label "Save to" 16 398 120 $Fonts.h $Theme.text))
$exportBox = New-Text 16 420 262
$exportBox.Text = [string]$script:settings.exportDir
$btnBrowse = New-Button "Browse..." 284 420 72 26
$mid.Controls.AddRange(@($exportBox, $btnBrowse))
$publish = New-Check "Publish to the Twin viewer and give me a link" 16 452 340 ([bool]$script:settings.publish)
$mid.Controls.Add($publish)
$btnCreate = New-Button "Build the twin" 16 484 340 40 $true
$btnCancel = New-Button "Cancel" 16 528 340 26
$btnCancel.Enabled = $false
$mid.Controls.AddRange(@($btnCreate, $btnCancel))

# ---------------------------------------------------------------- right: progress
$right = New-Panel 800 136 372 560
$form.Controls.Add($right)
$right.Controls.Add((New-Eyebrow "Progress" 16 12))
$stageDefs = @(
  @("pull", "Pull the phone capture"),
  @("import", "Read the capture"),
  @("extract", "Pull stills from video"),
  @("prepare", "Check sharpness"),
  @("cameras", "Solve camera positions"),
  @("train", "Train the Gaussian splat"),
  @("walk", "Build the walkthrough"),
  @("mesh", "Mesh the LiDAR"),
  @("pack", "Pack for the Twin viewer"),
  @("export", "Save files"),
  @("share", "Publish to the twin")
)
$script:stageRows = @{}
$y = 34
foreach ($d in $stageDefs) {
  $icon = New-Label ([string][char]0x25CB) 16 $y 20 $Fonts.body $Theme.muted 18
  $lbl = New-Label $d[1] 40 $y 180 $Fonts.body $Theme.muted 18
  $det = New-Label "" 222 $y 134 $Fonts.small $Theme.muted 18
  $right.Controls.AddRange(@($icon, $lbl, $det))
  $script:stageRows[$d[0]] = @{ icon = $icon; label = $lbl; detail = $det }
  $y += 28
}
$bar = New-Object System.Windows.Forms.ProgressBar
$bar.Location = New-Object System.Drawing.Point(16, 350); $bar.Size = New-Object System.Drawing.Size(340, 8); $bar.Style = "Continuous"
$right.Controls.Add($bar)
$etaLbl = New-Label "" 16 362 340 $Fonts.small $Theme.muted
$right.Controls.Add($etaLbl)
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(16, 384); $logBox.Size = New-Object System.Drawing.Size(340, 130)
$logBox.Multiline = $true; $logBox.ReadOnly = $true; $logBox.ScrollBars = "Vertical"; $logBox.Font = $Fonts.mono
$logBox.BackColor = $Theme.canvas; $logBox.ForeColor = $Theme.muted; $logBox.BorderStyle = "None"
$right.Controls.Add($logBox)
$btnOpenExport = New-Button "Open folder" 16 522 108 28
$btnOpenShare = New-Button "Open link" 128 522 108 28
$btnCopyShare = New-Button "Copy link" 240 522 116 28
$btnOpenExport.Enabled = $false; $btnOpenShare.Enabled = $false; $btnCopyShare.Enabled = $false
$right.Controls.AddRange(@($btnOpenExport, $btnOpenShare, $btnCopyShare))

# ---------------------------------------------------------------- bottom: recent jobs
$form.Controls.Add((New-Eyebrow "Recent jobs   (double-click to open the folder)" 24 708 500))
$jobs = New-Object System.Windows.Forms.ListView
$jobs.Location = New-Object System.Drawing.Point(24, 728); $jobs.Size = New-Object System.Drawing.Size(1148, 66)
$jobs.View = "Details"; $jobs.FullRowSelect = $true; $jobs.HeaderStyle = "Nonclickable"; $jobs.BorderStyle = "None"
$jobs.BackColor = $Theme.panel; $jobs.ForeColor = $Theme.text; $jobs.Font = $Fonts.small
foreach ($c in @(@("Job", 320), @("Mode", 60), @("Quality", 80), @("Status", 140), @("Result", 540))) { [void]$jobs.Columns.Add($c[0], $c[1]) }
$form.Controls.Add($jobs)

$status = New-Object System.Windows.Forms.StatusStrip
$status.BackColor = $Theme.panel; $status.SizingGrip = $false
$statusLbl = New-Object System.Windows.Forms.ToolStripStatusLabel
$statusLbl.Text = "Checking tools..."; $statusLbl.ForeColor = $Theme.muted
[void]$status.Items.Add($statusLbl)
$form.Controls.Add($status)

# ---------------------------------------------------------------- mode
function Set-Mode([string]$m) {
  $script:mode = $m
  $script:settings.lastMode = $m; Save-Settings
  foreach ($pair in @(@($btnPhone, "phone"), @($btn360, "360"), @($btn2d, "2d"))) {
    $b = $pair[0]; $on = ($pair[1] -eq $m)
    if ($on) { $b.BackColor = $Theme.panel2; $b.ForeColor = $Theme.accent; $b.FlatAppearance.BorderColor = $Theme.accent } else { $b.BackColor = $Theme.canvas; $b.ForeColor = $Theme.muted; $b.FlatAppearance.BorderColor = $Theme.line }
  }
  $phone = ($m -eq "phone")
  foreach ($c in @($idLabel, $idBox, $idHint)) { $c.Visible = $phone }
  foreach ($c in @($drop, $btnFiles, $btnFolder, $btnClear)) { $c.Visible = -not $phone }
  $coverage.Enabled = -not $phone
  switch ($m) {
    "phone" { $modeHint.Text = "A scan from the Slate360 app: photos + LiDAR + poses. Metric, measurable, published back to the same twin."; $publish.Text = "Publish into the phone's twin (it turns Ready)" }
    "360" { $modeHint.Text = "Raw .insv straight off the camera, or a stitched equirect MP4 / 2:1 stills. 8K, shutter 1/250+, lights on."; $publish.Text = "Publish to the Twin viewer and give me a link" }
    default { $modeHint.Text = "Regular video or photos from a phone, drone, or any camera. One lens per capture (iPhone: 1x Wide)."; $publish.Text = "Publish to the Twin viewer and give me a link" }
  }
}
$btnPhone.Add_Click({ Set-Mode "phone" })
$btn360.Add_Click({ Set-Mode "360" })
$btn2d.Add_Click({ Set-Mode "2d" })

# ---------------------------------------------------------------- behaviour
function Add-Log([string]$t) { $logBox.AppendText($t + [Environment]::NewLine) }
function Reset-Stages {
  foreach ($k in $script:stageRows.Keys) { $r = $script:stageRows[$k]; $r.icon.Text = [string][char]0x25CB; $r.icon.ForeColor = $Theme.muted; $r.label.ForeColor = $Theme.muted; $r.detail.Text = "" }
  $bar.Value = 0; $etaLbl.Text = ""
}
function Set-Stage([string]$id, [string]$state, [string]$detail) {
  if (-not $script:stageRows.ContainsKey($id)) { return }
  $r = $script:stageRows[$id]
  switch ($state) {
    "running" { $r.icon.Text = [string][char]0x25CF; $r.icon.ForeColor = $Theme.accent; $r.label.ForeColor = $Theme.text }
    "done"    { $r.icon.Text = [string][char]0x2713; $r.icon.ForeColor = $Theme.accent; $r.label.ForeColor = $Theme.text }
    "failed"  { $r.icon.Text = [string][char]0x2715; $r.icon.ForeColor = $Theme.bad; $r.label.ForeColor = $Theme.bad }
    "skipped" { $r.icon.Text = [string][char]0x2013; $r.icon.ForeColor = $Theme.muted }
  }
  if ($detail -ne $null) { $r.detail.Text = $detail }
}
function Refresh-Jobs {
  $jobs.Items.Clear()
  $dirs = @(Get-ChildItem -LiteralPath $jobsRoot -Directory -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 30)
  foreach ($d in $dirs) {
    $st = Join-Path $d.FullName "status.json"
    $mode = ""; $q = ""; $state = "no status"; $res = ""
    if (Test-Path -LiteralPath $st) {
      try {
        $j = Get-Content -LiteralPath $st -Raw | ConvertFrom-Json
        $mode = [string]$j.mode; $q = [string]$j.quality
        if ($j.error) { $state = "failed: " + $j.stage } elseif ($j.stage -eq "done") { $state = $(if ($j.result.share) { "published" } else { "twin ready" }) } else { $state = "stopped at " + $j.stage }
        if ($j.result.share) { $res = [string]$j.result.share } elseif ($j.result.spz) { $res = [string]$j.result.spz }
      } catch {}
    }
    $item = New-Object System.Windows.Forms.ListViewItem($d.Name)
    [void]$item.SubItems.Add($mode); [void]$item.SubItems.Add($q); [void]$item.SubItems.Add($state); [void]$item.SubItems.Add($res)
    $item.Tag = $d.FullName
    [void]$jobs.Items.Add($item)
  }
}
function Add-Inputs([string[]]$paths) {
  foreach ($p in $paths) { if ($p -and -not $script:inputs.Contains($p)) { $script:inputs.Add($p) } }
  $n = $script:inputs.Count
  $drop.Text = if ($n -eq 0) { "Drop a video, a folder of photos, or a raw .insv here" } else { "$n item(s) added" + [Environment]::NewLine + (Split-Path -Leaf $script:inputs[0]) + $(if ($n -gt 1) { " ..." } else { "" }) }
  $drop.ForeColor = if ($n -eq 0) { $Theme.muted } else { $Theme.text }
  if (-not $nameBox.Text -and $n -gt 0) { $nameBox.Text = [IO.Path]::GetFileNameWithoutExtension((Split-Path -Leaf $script:inputs[0])) }
  Start-Probe
}
function Start-Probe {
  $inv.Items.Clear(); $script:probe = $null
  if ($script:inputs.Count -eq 0) { $invNote.Text = "Add a capture to see what it contains."; return }
  $invNote.Text = "Reading the capture..."
  $tmp = Join-Path $env:TEMP ("slate-probe-" + [Guid]::NewGuid().ToString("N") + ".json")
  $py = "/home/rian_/venvs/kitchen-apriltag/bin/python"
  $probeScript = (Join-Path $here "engine\probe.py")
  $argv = @("-d", "Ubuntu-22.04", "--", $py, (To-Wsl $probeScript), "--out", (To-Wsl $tmp), "--inputs")
  foreach ($p in $script:inputs) { $argv += (To-Wsl $p) }
  $script:probeFile = $tmp
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "wsl.exe"; $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true; $psi.RedirectStandardOutput = $true
  $psi.Arguments = ($argv | ForEach-Object { if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ } }) -join " "
  $script:probeProc = [System.Diagnostics.Process]::Start($psi)
}
function Show-Probe($p) {
  $inv.Items.Clear()
  $s = $p.summary
  $c = $s.counts
  function Row([string]$a, [string]$b, [string]$d) { $i = New-Object System.Windows.Forms.ListViewItem($a); [void]$i.SubItems.Add($b); [void]$i.SubItems.Add($d); [void]$inv.Items.Add($i) }
  $vids = @($p.items | Where-Object { $_.role -eq "video" })
  foreach ($v in $vids) { Row ("Video " + $v.kind) ("{0}x{1}  {2}s  {3}" -f $v.width, $v.height, [int]$v.duration_s, $v.codec) "Splat (appearance)" }
  if ($c.still360 -gt 0) { Row "360 photos" ("{0} files" -f $c.still360) "Splat (appearance)" }
  if ($c.still2d -gt 0) { Row "Photos" ("{0} files" -f $c.still2d) "Splat (appearance)" }
  if ($c.raw360 -gt 0) { Row "Raw .insv" ("{0} files" -f $c.raw360) "Unwrapped here (no Studio needed)" }
  if ($s.has_arkit_poses) { Row "iPhone LiDAR / ARKit" "depth + poses" "Metric frame + mesh" }
  if ($c.lidar -gt 0) { Row "Point cloud" ("{0} files" -f $c.lidar) "Mesh (geometry)" }
  if ($s.has_gps) { Row "GPS" "in photo/video metadata" "Stored; not used in the solve" }
  if ($s.has_gnss_log) { Row "RTK / GNSS log" ("{0} files" -f $c.gnss) "Stored; georeference later" }
  if ($c.logs -gt 0) { Row "Flight / sensor logs" ("{0} files" -f $c.logs) "Stored" }
  $cams = @($s.cameras); $camText = if ($cams.Count -gt 0) { "Camera: " + ($cams -join ", ") + ". " } else { "" }
  $note = $camText + "Looks like " + $(switch ($s.primary) { "360" { "a 360 capture" } "2d" { "a 2D capture" } "mixed" { "a mix of 360 and 2D" } "raw360" { "a raw 360 recording (unwrapped automatically)" } default { "nothing usable" } }) + "."
  foreach ($w in @($s.warnings)) { if ($w -and $w -notmatch 'insv') { $note += [Environment]::NewLine + $w } }
  $invNote.Text = $note
  $invNote.ForeColor = if (@($s.warnings | Where-Object { $_ -and $_ -notmatch 'insv' }).Count -gt 0) { $Theme.warn } else { $Theme.muted }
  if ($s.primary -in @("360", "raw360") -and $script:mode -ne "360") { Set-Mode "360" }
  elseif ($s.primary -eq "2d" -and $script:mode -ne "2d") { Set-Mode "2d" }
  $fpsIdx = switch ([double]$s.suggested_fps) { 2.0 { 1 } 0.5 { 2 } default { 0 } }
  if ($vids.Count -gt 0 -or $c.raw360 -gt 0) { $coverage.SelectedIndex = $(if ($c.raw360 -gt 0) { 1 } else { $fpsIdx }) } elseif ($c.still2d + $c.still360 -gt 0) { $coverage.SelectedIndex = 3 }
  Update-CoverageHint
}
function Update-CoverageHint {
  $fps = switch ($coverage.SelectedIndex) { 0 { 1.0 } 1 { 2.0 } 2 { 0.5 } default { 0 } }
  $secs = 0.0; if ($script:probe) { $secs = [double]$script:probe.summary.video_seconds }
  if ($fps -gt 0 -and $secs -gt 0) { $coverageHint.Text = ("About {0} stills from {1} of video." -f [int]([Math]::Round($secs * $fps)), (Fmt-Seconds $secs)) }
  elseif ($fps -eq 0) { $coverageHint.Text = "Every dropped photo is used as-is." }
  else { $coverageHint.Text = "How many frames are pulled from video. More frames = better coverage, longer solve." }
}
$coverage.Add_SelectedIndexChanged({ Update-CoverageHint })

function Start-Job {
  $captureId = $idBox.Text.Trim()
  if ($script:mode -eq "phone") {
    if ($captureId -notmatch '^[0-9a-fA-F-]{32,36}$') { [System.Windows.Forms.MessageBox]::Show("Paste the capture ID from the phone (open the twin, tap Copy capture ID).", "No capture ID") | Out-Null; return }
  } elseif ($script:inputs.Count -eq 0) { [System.Windows.Forms.MessageBox]::Show("Add a video, a folder of photos, or a raw .insv first.", "Nothing to process") | Out-Null; return }
  $fps = switch ($coverage.SelectedIndex) { 0 { 1 } 1 { 2 } 2 { 0.5 } default { 0 } }
  $q = @("preview", "standard", "final")[$quality.SelectedIndex]
  $formats = @("spz"); if ($fmtPly.Checked) { $formats += "ply" }; if ($fmtSplat.Checked) { $formats += "splat" }; if ($fmtHtml.Checked) { $formats += "html" }
  $script:settings.exportDir = $exportBox.Text; $script:settings.publish = $publish.Checked; $script:settings.quality = $quality.SelectedIndex; $script:settings.brighten = $brighten.Checked; Save-Settings
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safe = ($nameBox.Text -replace '[^A-Za-z0-9_-]', '_').Trim('_'); if (-not $safe) { $safe = $(if ($captureId) { "phone-" + $captureId.Substring(0, 8) } else { $script:mode + "-capture" }) }
  $script:jobDir = Join-Path $jobsRoot ($stamp + "-" + $safe)
  New-Item -ItemType Directory -Force -Path $script:jobDir | Out-Null
  $script:stdout = Join-Path $script:jobDir "engine.out"
  $script:logOffset = 0; $script:shareUrl = $null; $script:exportPaths = @()
  Reset-Stages; $logBox.Clear()
  $btnOpenExport.Enabled = $false; $btnOpenShare.Enabled = $false; $btnCopyShare.Enabled = $false
  # One JSON request file instead of a command line: paths with spaces are never re-split.
  $request = [ordered]@{
    inputPaths = @($script:inputs); mode = $script:mode; quality = $q; fps = $fps; jobDir = $script:jobDir
    exportDir = $exportBox.Text; formats = $formats; name = $nameBox.Text; ingest = [bool]$publish.Checked
    captureId = $captureId; gamma = $(if ($brighten.Checked) { 1.4 } else { 1.0 })
  }
  $reqPath = Join-Path $script:jobDir "request.json"
  ($request | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath $reqPath -Encoding UTF8
  $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Quote $engine), "-RequestFile", (Quote $reqPath))
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"; $psi.Arguments = ($args -join " ")
  $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true; $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
  $script:proc = New-Object System.Diagnostics.Process
  $script:proc.StartInfo = $psi
  $script:outWriter = [System.IO.StreamWriter]::new($script:stdout, $false)
  $script:proc.add_OutputDataReceived({ param($s, $e) if ($e.Data -ne $null) { $script:outWriter.WriteLine($e.Data); $script:outWriter.Flush() } })
  $script:proc.add_ErrorDataReceived({ param($s, $e) if ($e.Data -ne $null) { $script:outWriter.WriteLine("ERR " + $e.Data); $script:outWriter.Flush() } })
  [void]$script:proc.Start()
  $script:proc.BeginOutputReadLine(); $script:proc.BeginErrorReadLine()
  $script:started = Get-Date
  $btnCreate.Enabled = $false; $btnCancel.Enabled = $true
  Add-Log ("Started " + $script:mode + " job: " + (Split-Path -Leaf $script:jobDir))
  $timer.Start()
}
$stageWeights = @{ pull = 6; import = 2; extract = 8; prepare = 4; cameras = 28; train = 38; walk = 3; mesh = 3; pack = 3; export = 2; share = 3 }
$script:progress = @{}
function Update-Bar([string]$stageId, [int]$done, [int]$total) {
  if ($total -gt 0) { $script:progress[$stageId] = [Math]::Min(1.0, $done / [double]$total) }
  $sum = 0.0; $tot = 0.0
  foreach ($k in $stageWeights.Keys) { $tot += $stageWeights[$k]; if ($script:progress.ContainsKey($k)) { $sum += $stageWeights[$k] * $script:progress[$k] } }
  $bar.Value = [int][Math]::Min(100, [Math]::Round(100 * $sum / $tot))
  $elapsed = ((Get-Date) - $script:started).TotalSeconds
  $etaLbl.Text = "Elapsed " + (Fmt-Seconds $elapsed) + $(if ($bar.Value -gt 5 -and $bar.Value -lt 100) { "   ·   about " + (Fmt-Seconds ($elapsed * (100 - $bar.Value) / $bar.Value)) + " left" } else { "" })
}
function Handle-Line([string]$line) {
  if ($line -match '^STAGE (\S+) (.*)$') { Set-Stage $Matches[1] "running" ""; $script:progress[$Matches[1]] = 0.0; Update-Bar $Matches[1] 0 0; Add-Log $Matches[2] }
  elseif ($line -match '^PROGRESS (\S+) (\d+) (\d+)$') { Update-Bar $Matches[1] ([int]$Matches[2]) ([int]$Matches[3]); Set-Stage $Matches[1] "running" ("{0} / {1}" -f $Matches[2], $Matches[3]) }
  elseif ($line -match '^STAGEDONE (\S+) ?(.*)$') { Set-Stage $Matches[1] "done" $Matches[2]; $script:progress[$Matches[1]] = 1.0; Update-Bar $Matches[1] 1 1; if ($Matches[2]) { Add-Log $Matches[2] } }
  elseif ($line -match '^INFO (.*)$') { Add-Log $Matches[1] }
  elseif ($line -match '^RESULT saved (.*)$') { $script:exportPaths += $Matches[1]; $btnOpenExport.Enabled = $true }
  elseif ($line -match '^RESULT share (\S+)') { $script:shareUrl = $Matches[1]; $btnOpenShare.Enabled = $true; $btnCopyShare.Enabled = $true; Add-Log ("Link: " + $script:shareUrl) }
  elseif ($line -match '^RESULT ') { }
  elseif ($line -match '^ERROR (.*)$') { Add-Log ("Problem: " + $Matches[1]); if ($script:lastStage) { Set-Stage $script:lastStage "failed" $Matches[1] } }
  elseif ($line -match '^DONE (\d+)$') { Finish-Job ([int]$Matches[1]) }
  if ($line -match '^STAGE (\S+)') { $script:lastStage = $Matches[1] }
}
function Finish-Job([int]$code) {
  $timer.Stop()
  try { if ($script:outWriter) { $script:outWriter.Flush() } } catch {}
  $btnCreate.Enabled = $true; $btnCancel.Enabled = $false
  if ($code -eq 0) {
    foreach ($k in $script:stageRows.Keys) { if ($script:stageRows[$k].icon.Text -eq [string][char]0x25CB) { Set-Stage $k "skipped" "" } }
    $bar.Value = 100
    $etaLbl.Text = "Done in " + (Fmt-Seconds (((Get-Date) - $script:started).TotalSeconds))
    Add-Log $(if ($script:shareUrl) { "Published. Open the link, or open the twin on the phone." } else { "Twin built. Files are in the save folder." })
    if ($script:shareUrl) { $subtitle.Text = "Latest: " + $script:shareUrl }
  } else { $etaLbl.Text = "Stopped." }
  Refresh-Jobs
}
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 500
$timer.Add_Tick({
  if ($script:stdout -and (Test-Path -LiteralPath $script:stdout)) {
    try {
      $fs = [System.IO.File]::Open($script:stdout, "Open", "Read", "ReadWrite")
      try {
        if ($fs.Length -gt $script:logOffset) {
          $fs.Seek($script:logOffset, "Begin") | Out-Null
          $sr = New-Object System.IO.StreamReader($fs)
          $chunk = $sr.ReadToEnd()
          $script:logOffset = $fs.Length
          foreach ($line in ($chunk -split "`r?`n")) { if ($line.Trim()) { Handle-Line $line.Trim() } }
        }
      } finally { $fs.Dispose() }
    } catch {}
  }
  if ($script:proc -and $script:proc.HasExited -and $timer.Enabled) {
    Start-Sleep -Milliseconds 300
    if ($script:proc.ExitCode -ne 0 -and $btnCancel.Enabled) { Finish-Job $script:proc.ExitCode }
  }
})
$probeTimer = New-Object System.Windows.Forms.Timer
$probeTimer.Interval = 400
$probeTimer.Add_Tick({
  if ($script:probeProc -and $script:probeProc.HasExited -and $script:probeFile -and (Test-Path -LiteralPath $script:probeFile)) {
    try { $script:probe = Get-Content -LiteralPath $script:probeFile -Raw | ConvertFrom-Json; Show-Probe $script:probe } catch { $invNote.Text = "Could not read this capture." }
    Remove-Item -LiteralPath $script:probeFile -ErrorAction SilentlyContinue
    $script:probeFile = $null; $script:probeProc = $null
  }
})
$probeTimer.Start()

# events
$drop.Add_DragEnter({ param($s, $e) if ($e.Data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) { $e.Effect = "Copy"; $drop.BackColor = $Theme.line } })
$drop.Add_DragLeave({ $drop.BackColor = $Theme.panel2 })
$drop.Add_DragDrop({ param($s, $e) $drop.BackColor = $Theme.panel2; Add-Inputs @($e.Data.GetData([System.Windows.Forms.DataFormats]::FileDrop)) })
$btnFiles.Add_Click({ $d = New-Object System.Windows.Forms.OpenFileDialog; $d.Multiselect = $true; $d.Filter = "Video, photos, raw 360|*.mp4;*.mov;*.mkv;*.jpg;*.jpeg;*.png;*.insv|All files|*.*"; if ($d.ShowDialog() -eq "OK") { Add-Inputs $d.FileNames } })
$btnFolder.Add_Click({ $d = New-Object System.Windows.Forms.FolderBrowserDialog; if ($d.ShowDialog() -eq "OK") { Add-Inputs @($d.SelectedPath) } })
$btnClear.Add_Click({ $script:inputs.Clear(); $nameBox.Text = ""; Add-Inputs @() })
$btnBrowse.Add_Click({ $d = New-Object System.Windows.Forms.FolderBrowserDialog; $d.SelectedPath = $exportBox.Text; if ($d.ShowDialog() -eq "OK") { $exportBox.Text = $d.SelectedPath } })
$btnCreate.Add_Click({ Start-Job })
$btnCancel.Add_Click({ if ($script:proc -and -not $script:proc.HasExited) { try { & taskkill.exe /PID $script:proc.Id /T /F | Out-Null } catch {} ; Add-Log "Cancelled."; Finish-Job 130 } })
$btnOpenExport.Add_Click({ if ($script:exportPaths.Count -gt 0) { Start-Process explorer.exe ("/select," + $script:exportPaths[0]) } else { Start-Process explorer.exe $exportBox.Text } })
$btnOpenShare.Add_Click({ if ($script:shareUrl) { Start-Process $script:shareUrl } })
$btnCopyShare.Add_Click({ if ($script:shareUrl) { [System.Windows.Forms.Clipboard]::SetText($script:shareUrl); Add-Log "Link copied." } })
$jobs.Add_DoubleClick({ if ($jobs.SelectedItems.Count -gt 0) { Start-Process explorer.exe ([string]$jobs.SelectedItems[0].Tag) } })

# startup: environment check in the background
$envCheck = Join-Path $here "engine\check-env.ps1"
$script:envProc = Start-Process powershell.exe -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", (Quote $envCheck)) -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $env:TEMP "slate-env.json")
$envTimer = New-Object System.Windows.Forms.Timer
$envTimer.Interval = 700
$envTimer.Add_Tick({
  if ($script:envProc.HasExited) {
    $envTimer.Stop()
    try {
      $j = Get-Content -LiteralPath (Join-Path $env:TEMP "slate-env.json") -Raw | ConvertFrom-Json
      $parts = @()
      $parts += $(if ($j.gpu) { $j.gpu } else { "no NVIDIA GPU" })
      $parts += $(if ($j.brush) { "Brush " + $j.brushVersion } else { "Brush missing" })
      $parts += $(if ($j.pycolmap) { $j.pycolmap } else { "pycolmap missing (WSL)" })
      $parts += $(if ($j.ffmpeg) { "ffmpeg" } else { "ffmpeg missing" })
      $statusLbl.Text = ($parts -join "   ·   ")
      $statusLbl.ForeColor = if ($j.ok) { $Theme.muted } else { $Theme.warn }
      if (-not $j.ok) { $btnCreate.Enabled = $false; Add-Log "A required tool is missing. See the status bar." }
    } catch { $statusLbl.Text = "Tool check failed" }
  }
})
$envTimer.Start()

Set-Mode $script:mode
Refresh-Jobs
if ($env:SLATE_STUDIO_SELFTEST -eq "1") {
  # Build everything, run one probe of the pending inputs, then exit: used by CI/agents to prove the UI constructs.
  $form.Show(); [System.Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 800; [System.Windows.Forms.Application]::DoEvents()
  Write-Output ("SELFTEST ok controls=" + $form.Controls.Count + " jobs=" + $jobs.Items.Count + " mode=" + $script:mode)
  $form.Close(); exit 0
}
[void]$form.ShowDialog()
