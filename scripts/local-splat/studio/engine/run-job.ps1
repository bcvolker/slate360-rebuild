# Slate360 Capture Studio — job engine (Windows side).
# Drop -> probe -> extract -> prepare -> cameras -> train -> pack -> export -> share.
# Free, local, commercially clean: ffmpeg (LGPL), pycolmap (BSD), Brush (Apache-2.0),
# our own SPZ packer. Prints machine-readable lines the studio UI renders:
#   STAGE <id> <label>   PROGRESS <id> <n> <N>   INFO <text>   RESULT <key> <value>   DONE <code>
param(
  [string[]]$InputPaths,
  [ValidateSet("360","2d")][string]$Mode = "2d",
  [string]$Name = "",
  [string]$JobDir = "",
  [double]$Fps = 0,
  [ValidateSet("preview","standard","final")][string]$Quality = "preview",
  [string]$ExportDir = "",
  [string[]]$Formats = @("spz"),
  [switch]$Ingest,
  [switch]$Resume,
  [ValidateSet("","cameras","train","pack")][string]$SkipTo = "",
  [int]$FacePx = 1600,
  [int]$MaxResolution = 0,   # 0 = by quality: preview 1280 / standard 1920 / final 2560 (12 MP stills deserve it)
  [int]$Faces = 4,
  [string]$WslDistro = "Ubuntu-22.04",
  [string]$WslPython = "/home/rian_/venvs/kitchen-apriltag/bin/python",
  [string]$BrushExe = "",
  [string]$LogPath = "",
  [string]$RequestFile = ""
)

$ErrorActionPreference = "Stop"
if ($RequestFile -and (Test-Path -LiteralPath $RequestFile)) {
  # The studio hands over one JSON file instead of a command line, so paths with spaces never get re-split.
  $req = Get-Content -LiteralPath $RequestFile -Raw | ConvertFrom-Json
  if ($req.inputPaths) { $InputPaths = @($req.inputPaths) }
  if ($req.mode) { $Mode = [string]$req.mode }
  if ($req.name -ne $null) { $Name = [string]$req.name }
  if ($req.jobDir) { $JobDir = [string]$req.jobDir }
  if ($req.fps -ne $null) { $Fps = [double]$req.fps }
  if ($req.quality) { $Quality = [string]$req.quality }
  if ($req.exportDir) { $ExportDir = [string]$req.exportDir }
  if ($req.formats) { $Formats = @($req.formats) }
  if ($req.ingest -eq $true) { $Ingest = $true }
  if ($req.resume -eq $true) { $Resume = $true }
  if ($req.facePx) { $FacePx = [int]$req.facePx }
  if ($req.maxResolution) { $MaxResolution = [int]$req.maxResolution }
  if ($req.faces) { $Faces = [int]$req.faces }
  if ($req.skipTo) { $SkipTo = [string]$req.skipTo }
}
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $here "..\..\..\..")).Path
$jobsRoot = Join-Path $env:USERPROFILE "Slate360Jobs"
$script:status = [ordered]@{ stage = "import"; stages = [ordered]@{}; result = [ordered]@{}; error = $null; startedAt = (Get-Date).ToString("o") }
$script:code = 0

function Emit([string]$line) {
  # Console.Out, not Write-Output: functions that emit progress also `return` exit codes,
  # and Write-Output would pollute those return values.
  [Console]::Out.WriteLine($line)
  if ($LogPath) { Add-Content -LiteralPath $LogPath -Value ("[{0:HH:mm:ss}] {1}" -f (Get-Date), $line) }
}
function Save-Status {
  if ($script:JobDir) { ($script:status | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath (Join-Path $script:JobDir "status.json") -Encoding UTF8 }
}
function Stage([string]$id, [string]$label) {
  $script:status.stage = $id
  $script:status.stages[$id] = [ordered]@{ state = "running"; label = $label; startedAt = (Get-Date).ToString("o") }
  Save-Status
  Emit "STAGE $id $label"
}
function StageDone([string]$id, [string]$detail = "") {
  if ($script:status.stages.Contains($id)) { $script:status.stages[$id].state = "done"; $script:status.stages[$id].detail = $detail }
  Save-Status
  Emit "STAGEDONE $id $detail"
}
function Fail([string]$id, [string]$msg, [int]$exit) {
  if ($script:status.stages.Contains($id)) { $script:status.stages[$id].state = "failed"; $script:status.stages[$id].detail = $msg }
  $script:status.error = $msg
  Save-Status
  Emit "ERROR $msg"
  Emit "DONE $exit"
  exit $exit
}
function Result([string]$key, [string]$value) {
  $script:status.result[$key] = $value
  Save-Status
  Emit "RESULT $key $value"
}
function To-Wsl([string]$winPath) {
  $full = [System.IO.Path]::GetFullPath($winPath)
  if ($full -match '^([A-Za-z]):\\(.*)$') { return "/mnt/" + $Matches[1].ToLowerInvariant() + "/" + ($Matches[2] -replace '\\', '/') }
  throw "not a Windows path: $winPath"
}
function Invoke-Wsl([string[]]$argv, [string]$stageId = "") {
  # Every argument is passed as its own argv element: spaces in "Brian PC" survive.
  # ErrorActionPreference must be Continue here: under Stop, PowerShell 5.1 turns the FIRST
  # stderr line of a native command (pycolmap logs everything to stderr) into a terminating error.
  $ErrorActionPreference = "Continue"
  $all = @("-d", $WslDistro, "--") + $argv
  & wsl.exe @all 2>&1 | ForEach-Object {
    $line = [string]$_
    if ($line -match '^(STAGE|PROGRESS|INFO|RESULT) ') {
      if ($line -match '^PROGRESS (\S+) (\d+) (\d+)$' -and $stageId) { Emit ("PROGRESS {0} {1} {2}" -f $stageId, $Matches[2], $Matches[3]) }
      elseif ($line -match '^RESULT ') { Emit $line }
      else { Emit ("INFO " + ($line -replace '^(STAGE|INFO) ', '')) }
    } else { if ($LogPath) { Add-Content -LiteralPath $LogPath -Value $line } }
  }
  return $LASTEXITCODE
}
function Find-Brush {
  if ($BrushExe -and (Test-Path -LiteralPath $BrushExe)) { return $BrushExe }
  $candidates = @(
    (Join-Path $env:USERPROFILE "Desktop\Slate360Research\engines\brush\brush_app.exe"),
    "C:\research\brush\brush_app.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\brush\brush_app.exe")
  )
  foreach ($c in $candidates) { if (Test-Path -LiteralPath $c) { return $c } }
  $cmd = Get-Command brush_app.exe -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  return $null
}
function Get-VideoDuration([string]$path) {
  $probe = Get-Command ffprobe -ErrorAction SilentlyContinue
  if (-not $probe) { return 0 }
  $raw = & $probe.Source -v error -show_entries format=duration -of csv=p=0 -i $path 2>$null
  $d = 0.0
  [double]::TryParse(([string]$raw).Trim(), [ref]$d) | Out-Null
  return $d
}

# ---------------------------------------------------------------- inputs / job dir
$stillExt = @(".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp")
$videoExt = @(".mp4", ".mov", ".mkv", ".webm", ".m4v")
$stepsByQuality = @{ preview = 7000; standard = 15000; final = 30000 }
$steps = $stepsByQuality[$Quality]
# Training resolution follows quality unless the request pins it. Phone stills are now 4032x3024
# (build #87+); training them at 1920 threw away most of that detail.
if ($MaxResolution -le 0) { $MaxResolution = @{ preview = 1280; standard = 1920; final = 2560 }[$Quality] }

if (-not $JobDir) {
  $safe = ($Name -replace '[^A-Za-z0-9_-]', '_').Trim('_'); if (-not $safe) { $safe = $Mode + "-capture" }
  $JobDir = Join-Path $jobsRoot ((Get-Date -Format "yyyyMMdd-HHmmss") + "-" + $safe)
}
$script:JobDir = $JobDir
$imgDir = Join-Path $JobDir "images"
$exportJob = Join-Path $JobDir "export"
New-Item -ItemType Directory -Force -Path $imgDir, $exportJob | Out-Null
if (-not $LogPath) { $LogPath = Join-Path $JobDir "engine.log" }
$wslJob = "/home/rian_/slate-jobs/" + (Split-Path -Leaf $JobDir)
$script:status.jobDir = $JobDir; $script:status.mode = $Mode; $script:status.quality = $Quality; $script:status.steps = $steps
Save-Status
Emit "INFO job $JobDir"
Emit "INFO mode $Mode quality $Quality steps $steps"

$files = New-Object System.Collections.Generic.List[string]
foreach ($p in @($InputPaths)) {
  if (-not $p) { continue }
  if (-not (Test-Path -LiteralPath $p)) { Fail "import" "missing input: $p" 2 }
  $item = Get-Item -LiteralPath $p
  if ($item.PSIsContainer) { Get-ChildItem -LiteralPath $item.FullName -File -Recurse | ForEach-Object { $files.Add($_.FullName) } }
  else { $files.Add($item.FullName) }
}
$stills = @($files | Where-Object { $stillExt -contains [IO.Path]::GetExtension($_).ToLowerInvariant() })
$videos = @($files | Where-Object { $videoExt -contains [IO.Path]::GetExtension($_).ToLowerInvariant() })
$raw360 = @($files | Where-Object { @(".insv", ".insp") -contains [IO.Path]::GetExtension($_).ToLowerInvariant() })

# ---------------------------------------------------------------- import + probe
if (-not $SkipTo) {
  Stage "import" "Reading the capture"
  if ($raw360.Count -gt 0) { Fail "import" "Raw .insv found. Stitch in Insta360 Studio first (horizon lock on; tilt recovery and vibration reduction off), then drop the MP4." 4 }
  if (-not $Resume -and $stills.Count -eq 0 -and $videos.Count -eq 0) { Fail "import" "Nothing usable dropped. Add a video or a folder of photos." 2 }
  if ($files.Count -gt 0) {
    $probeOut = Join-Path $JobDir "probe.json"
    $probeArgs = @($WslPython, (To-Wsl (Join-Path $here "probe.py")), "--out", (To-Wsl $probeOut), "--inputs")
    foreach ($p in @($InputPaths)) { if ($p) { $probeArgs += (To-Wsl $p) } }
    Invoke-Wsl $probeArgs "import" | Out-Null
    if (Test-Path -LiteralPath $probeOut) {
      $probe = Get-Content -LiteralPath $probeOut -Raw | ConvertFrom-Json
      $s = $probe.summary
      Result "probe" $probeOut
      Emit ("INFO detected: {0}; cameras: {1}; gps={2} lidar={3} arkit={4} gnss={5}" -f $s.primary, ($s.cameras -join ", "), $s.has_gps, $s.has_lidar, $s.has_arkit_poses, $s.has_gnss_log)
      if ($Fps -le 0 -and $s.suggested_fps) { $Fps = [double]$s.suggested_fps }
      foreach ($w in @($s.warnings)) { if ($w) { Emit "INFO warning: $w" } }
      if ($s.primary -eq "360" -and $Mode -eq "2d") { Emit "INFO warning: this looks like 360 footage but the 2D tab is selected." }
      if ($s.primary -eq "2d" -and $Mode -eq "360") { Emit "INFO warning: this looks like 2D footage but the 360 tab is selected." }
    }
  }
  if ($Fps -le 0) { $Fps = 1.0 }
  StageDone "import" ("{0} video(s), {1} still(s)" -f $videos.Count, $stills.Count)

  # ---------------------------------------------------------------- extract
  Stage "extract" "Pulling stills from video"
  $existing = @(Get-ChildItem -LiteralPath $imgDir -File -ErrorAction SilentlyContinue)
  if ($Resume -and $existing.Count -ge 20) {
    StageDone "extract" ("Reusing {0} stills already extracted" -f $existing.Count)
  } else {
    $copied = 0
    foreach ($s in $stills) { Copy-Item -LiteralPath $s -Destination (Join-Path $imgDir ([IO.Path]::GetFileName($s))) -Force; $copied++ }
    if ($copied) { Emit "INFO copied $copied stills" }
    $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
    if ($videos.Count -gt 0 -and -not $ff) { Fail "extract" "ffmpeg is not installed (winget install Gyan.FFmpeg)" 1 }
    $vi = 0
    foreach ($v in $videos) {
      $vi++
      $dur = Get-VideoDuration $v
      $expected = [int][Math]::Max(1, [Math]::Round($dur * $Fps))
      $pattern = Join-Path $imgDir ("v{0}_%05d.jpg" -f $vi)
      Emit ("INFO {0}: {1}s at {2} stills/s -> ~{3} stills" -f [IO.Path]::GetFileName($v), [int]$dur, $Fps, $expected)
      $ffArgs = @("-y", "-hide_banner", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-i", $v, "-vf", "fps=$Fps", "-q:v", "2", $pattern)
      $ErrorActionPreference = "Continue"  # ffmpeg warnings on stderr must not abort the job (PS 5.1)
      & $ff.Source @ffArgs 2>&1 | ForEach-Object {
        $line = [string]$_
        if ($line -match '^out_time_ms=(\d+)') { $done = [Math]::Min($expected, [int]([double]$Matches[1] / 1e6 * $Fps)); Emit ("PROGRESS extract {0} {1}" -f $done, $expected) }
        elseif ($line -notmatch '^[a-z_0-9]+=') { Add-Content -LiteralPath $LogPath -Value $line }
      }
      if ($LASTEXITCODE -ne 0) { Fail "extract" "ffmpeg failed on $v" 1 }
    }
    $ErrorActionPreference = "Stop"
    $count = @(Get-ChildItem -LiteralPath $imgDir -File).Count
    if ($count -lt 20) { Fail "extract" "Only $count stills. A splat needs a walk with overlap (20+ frames)." 5 }
    StageDone "extract" "$count stills"
  }

  # ---------------------------------------------------------------- prepare (Linux disk + sharpness)
  Stage "prepare" "Checking frame sharpness"
  $rc = Invoke-Wsl @("bash", "-c", "rm -rf '$wslJob' && mkdir -p '$wslJob' && cp -r '$(To-Wsl $imgDir)' '$wslJob/images'") "prepare"
  if ($rc -ne 0) { Fail "prepare" "could not copy frames to the Linux disk" 1 }
  $rc = Invoke-Wsl @($WslPython, (To-Wsl (Join-Path $here "frames.py")), "--images", "$wslJob/images", "--keep-list", "$wslJob/frames.json") "prepare"
  if ($rc -ne 0) { Fail "prepare" "too few sharp frames to train" 5 }
  Invoke-Wsl @("cp", "$wslJob/frames.json", (To-Wsl (Join-Path $JobDir "frames.json"))) | Out-Null
  $fr = Get-Content -LiteralPath (Join-Path $JobDir "frames.json") -Raw | ConvertFrom-Json
  StageDone "prepare" ("{0} frames kept, {1} blurry dropped" -f $fr.kept, $fr.dropped)
}

# ---------------------------------------------------------------- cameras (SfM)
$datasetDir = Join-Path $JobDir "dataset"
if (-not $SkipTo -or $SkipTo -eq "cameras") {
  Stage "cameras" "Solving camera positions"
  $sfmArgs = @($WslPython, (To-Wsl (Join-Path $here "sfm.py")), "--mode", $Mode, "--images", "$wslJob/images", "--out", "$wslJob/sfm", "--face-px", "$FacePx", "--faces", "$Faces")
  $rc = Invoke-Wsl $sfmArgs "cameras"
  if ($rc -ne 0) { Fail "cameras" "Camera solve failed (code $rc). Usually: too little overlap, or the walk is too fast." 6 }
  if (Test-Path -LiteralPath $datasetDir) { Remove-Item -LiteralPath $datasetDir -Recurse -Force }
  $rc = Invoke-Wsl @("bash", "-c", "cp -rL '$wslJob/sfm/brush' '$(To-Wsl $datasetDir)' && cp '$wslJob/sfm/sfm_report.json' '$(To-Wsl (Join-Path $JobDir 'sfm_report.json'))'") "cameras"
  if ($rc -ne 0) { Fail "cameras" "could not copy the camera solve back" 1 }
  $sr = Get-Content -LiteralPath (Join-Path $JobDir "sfm_report.json") -Raw | ConvertFrom-Json
  Result "cameras" ("{0}/{1} images registered, {2} points" -f $sr.registered_images, $sr.total_images, $sr.points3d)
  StageDone "cameras" ("{0} of {1} images placed, {2} 3D points, {3}s" -f $sr.registered_images, $sr.total_images, $sr.points3d, $sr.seconds)
}

# ---------------------------------------------------------------- train (Brush, Windows, RTX)
$plyPath = Join-Path $exportJob "gaussian.ply"
if (-not $SkipTo -or $SkipTo -in @("cameras", "train")) {
  Stage "train" "Training the Gaussian splat"
  $brush = Find-Brush
  if (-not $brush) { Fail "train" "Brush (brush_app.exe) not found. Expected at Desktop\Slate360Research\engines\brush\." 1 }
  if (-not (Test-Path -LiteralPath (Join-Path $datasetDir "sparse\0"))) { Fail "train" "No camera solve in $datasetDir" 6 }
  if (Test-Path -LiteralPath $plyPath) { Remove-Item -LiteralPath $plyPath -Force }
  $brushArgs = @($datasetDir, "--total-steps", "$steps", "--max-resolution", "$MaxResolution", "--sh-degree", "3", "--export-every", "$steps", "--export-path", $exportJob, "--export-name", "gaussian.ply")
  Emit ("INFO brush " + ($brushArgs -join " "))
  $t0 = Get-Date
  # Brush prints nothing while training, so progress is estimated from elapsed time
  # (measured ~40 steps/s on the 3090 for a room; 20/s is the conservative default).
  $stepsPerSec = 20.0
  $brushLog = Join-Path $JobDir "brush.log"
  $p = Start-Process -FilePath $brush -ArgumentList ($brushArgs | ForEach-Object { if ($_ -match '\s') { '"' + $_ + '"' } else { $_ } }) -PassThru -WindowStyle Hidden -RedirectStandardOutput $brushLog -RedirectStandardError (Join-Path $JobDir "brush.err")
  while (-not $p.HasExited) {
    Start-Sleep -Seconds 2
    $est = [int][Math]::Min($steps - 1, ((Get-Date) - $t0).TotalSeconds * $stepsPerSec)
    Emit ("PROGRESS train {0} {1}" -f $est, $steps)
  }
  $brushExit = $p.ExitCode
  foreach ($f in @($brushLog, (Join-Path $JobDir "brush.err"))) { if (Test-Path -LiteralPath $f) { Get-Content -LiteralPath $f | ForEach-Object { if ($_) { Add-Content -LiteralPath $LogPath -Value ("brush: " + $_) } } } }
  Emit ("PROGRESS train {0} {0}" -f $steps)
  if (-not (Test-Path -LiteralPath $plyPath)) {
    $any = @(Get-ChildItem -LiteralPath $exportJob -Filter "*.ply" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
    if ($any.Count -gt 0) { Copy-Item -LiteralPath $any[0].FullName -Destination $plyPath -Force }
  }
  if (-not (Test-Path -LiteralPath $plyPath)) { Fail "train" "Brush finished (exit $brushExit) but wrote no PLY" 8 }
  $mins = [Math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
  Result "ply" $plyPath
  StageDone "train" ("{0} steps in {1} min" -f $steps, $mins)
}

# ---------------------------------------------------------------- pack (8-bit SH, SPZ v3)
$spzPath = Join-Path $exportJob "gaussian.spz"
Stage "pack" "Packing for the Twin viewer"
if (-not (Test-Path -LiteralPath $plyPath)) { Fail "pack" "no gaussian.ply to pack" 8 }
$rc = Invoke-Wsl @($WslPython, (To-Wsl (Join-Path $here "pack_spz.py")), "--in", (To-Wsl $plyPath), "--out", (To-Wsl $spzPath), "--report", (To-Wsl (Join-Path $JobDir "spz_report.json"))) "pack"
if ($rc -ne 0 -or -not (Test-Path -LiteralPath $spzPath)) { Fail "pack" "SPZ packing failed" 9 }
$pr = Get-Content -LiteralPath (Join-Path $JobDir "spz_report.json") -Raw | ConvertFrom-Json
Result "spz" $spzPath
StageDone "pack" ("{0:N0} splats, SH{1} at 8-bit, {2} MB" -f $pr.splats, $pr.sh_degree, [Math]::Round($pr.bytes / 1MB, 1))

# ---------------------------------------------------------------- export copies
Stage "export" "Saving files"
$base = if ($Name) { ($Name -replace '[^A-Za-z0-9 _-]', '').Trim() } else { Split-Path -Leaf $JobDir }
if (-not $base) { $base = "splat" }
if (-not $ExportDir) { $ExportDir = Join-Path $env:USERPROFILE "Desktop\Slate360Exports" }
New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null
$saved = @()
foreach ($fmt in @($Formats)) {
  switch ($fmt.ToLowerInvariant()) {
    "spz" { $d = Join-Path $ExportDir "$base.spz"; Copy-Item -LiteralPath $spzPath -Destination $d -Force; $saved += $d }
    "ply" { $d = Join-Path $ExportDir "$base.ply"; Copy-Item -LiteralPath $plyPath -Destination $d -Force; $saved += $d }
    { $_ -in @("splat", "html") } {
      $d = Join-Path $ExportDir ("$base." + $_)
      Push-Location $repoRoot
      try { & node (Join-Path $repoRoot "scripts\research\ggps-drop-app\convert-splat.mjs") --in $plyPath --out $d --format $_ 2>&1 | ForEach-Object { Add-Content -LiteralPath $LogPath -Value ([string]$_) } } finally { Pop-Location }
      if (Test-Path -LiteralPath $d) { $saved += $d }
    }
  }
}
foreach ($s in $saved) { Result "saved" $s }
StageDone "export" ("{0} file(s) in {1}" -f $saved.Count, $ExportDir)

# ---------------------------------------------------------------- share (optional)
if ($Ingest) {
  Stage "share" "Publishing to the Twin viewer"
  Push-Location $repoRoot
  try {
    $title = if ($Name) { $Name } else { "Capture " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
    & node (Join-Path $repoRoot "scripts\local-splat\ingest-splat.mjs") --file $spzPath --title $title 2>&1 | ForEach-Object { Add-Content -LiteralPath $LogPath -Value ([string]$_) }
    $shareFile = Join-Path $repoRoot "tmp\local-splat-last-share.json"
    if (Test-Path -LiteralPath $shareFile) {
      Copy-Item -LiteralPath $shareFile -Destination (Join-Path $JobDir "share.json") -Force
      $url = (Get-Content -LiteralPath $shareFile -Raw | ConvertFrom-Json).shareUrl
      if ($url) { Result "share" $url; StageDone "share" $url } else { StageDone "share" "no link returned" }
    } else { StageDone "share" "ingest produced no share file" }
  } finally { Pop-Location }
}

$script:status.stage = "done"; $script:status.finishedAt = (Get-Date).ToString("o"); Save-Status
Emit "DONE 0"
exit 0
