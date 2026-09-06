# GGPS research pipeline (Windows). Research - not for customer jobs.
param(
  [string[]]$InputPaths,
  [string]$JobDir,
  [double]$Fps = 1,
  [string]$SceneName = "",
  [switch]$LargeOutdoor,
  [switch]$Train,
  [switch]$Ingest,
  [int]$Iters = 7000,
  [string]$Mode = "360",
  [switch]$SkipExtract,
  [switch]$SkipBlur,
  [string]$ExportFormat = "spz",
  [string]$ExportPath = "",
  [switch]$SelfTest,
  [string]$LogPath
)

$ErrorActionPreference = "Stop"
$env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "Find-Ggps.ps1")

function Write-Log([string]$msg) {
  $line = "[{0:HH:mm:ss}] {1}" -f (Get-Date), $msg
  Write-Output $line
  if ($LogPath) {
    Add-Content -LiteralPath $LogPath -Value $line
  }
}

function ConvertTo-WslPath([string]$winPath) {
  $full = [System.IO.Path]::GetFullPath($winPath)
  if ($full -match '^([A-Za-z]):\\(.*)$') {
    $drive = $Matches[1].ToLowerInvariant()
    $rest = ($Matches[2] -replace '\\', '/')
    return "/mnt/$drive/$rest"
  }
  throw "not a Windows path: $winPath"
}

function Test-EquirectSize([int]$w, [int]$h) {
  if ($h -le 0) { return $false }
  $r = $w / [double]$h
  return ($r -ge 1.7 -and $r -le 2.4)
}

function Get-ImageSize([string]$file) {
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromFile($file)
  try { return @{ W = $img.Width; H = $img.Height } }
  finally { $img.Dispose() }
}

function Get-Sharpness([string]$file) {
  Add-Type -AssemblyName System.Drawing
  $bmp = New-Object System.Drawing.Bitmap $file
  try {
    $w = [Math]::Max(1, [int]($bmp.Width / 8))
    $h = [Math]::Max(1, [int]($bmp.Height / 8))
    $small = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($small)
    $g.DrawImage($bmp, 0, 0, $w, $h)
    $g.Dispose()
    $sum = 0.0
    $sum2 = 0.0
    $n = 0
    for ($y = 1; $y -lt $h - 1; $y++) {
      for ($x = 1; $x -lt $w - 1; $x++) {
        $c = $small.GetPixel($x, $y)
        $l = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
        $l2 = 0.299 * $small.GetPixel($x - 1, $y).R + 0.587 * $small.GetPixel($x - 1, $y).G + 0.114 * $small.GetPixel($x - 1, $y).B
        $r2 = 0.299 * $small.GetPixel($x + 1, $y).R + 0.587 * $small.GetPixel($x + 1, $y).G + 0.114 * $small.GetPixel($x + 1, $y).B
        $u = 0.299 * $small.GetPixel($x, $y - 1).R + 0.587 * $small.GetPixel($x, $y - 1).G + 0.114 * $small.GetPixel($x, $y - 1).B
        $d = 0.299 * $small.GetPixel($x, $y + 1).R + 0.587 * $small.GetPixel($x, $y + 1).G + 0.114 * $small.GetPixel($x, $y + 1).B
        $lap = [Math]::Abs(4 * $l - $l2 - $r2 - $u - $d)
        $sum += $lap
        $sum2 += $lap * $lap
        $n++
      }
    }
    $small.Dispose()
    if ($n -eq 0) { return 0 }
    $mean = $sum / $n
    return [Math]::Sqrt([Math]::Max(0, $sum2 / $n - $mean * $mean))
  }
  finally { $bmp.Dispose() }
}

$ggps = Find-GgpsRoot
if ($SelfTest) {
  Write-Log "Research - not for customer jobs"
  if ($ggps) { Write-Log "GGPS_ROOT=$ggps" } else { Write-Log (Get-GgpsMissingHelp) }
  $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
  Write-Log ("ffmpeg=" + $(if ($ff) { $ff.Source } else { "MISSING" }))
  $wsl = Get-Command wsl -ErrorAction SilentlyContinue
  Write-Log ("wsl=" + $(if ($wsl) { "yes" } else { "MISSING" }))
  if (-not $ggps) { exit 1 }
  exit 0
}

if (-not $ggps) {
  Write-Log (Get-GgpsMissingHelp)
  exit 1
}

if (-not $InputPaths -or $InputPaths.Count -eq 0) {
  Write-Log "no inputs"
  exit 2
}

$stillExt = @(".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp")
$videoExt = @(".mp4", ".mov", ".mkv", ".webm")
$files = New-Object System.Collections.Generic.List[string]
foreach ($p in $InputPaths) {
  if (-not (Test-Path -LiteralPath $p)) { throw "missing input: $p" }
  $item = Get-Item -LiteralPath $p
  if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $item.FullName -File -Recurse | ForEach-Object { $files.Add($_.FullName) }
  } else {
    $files.Add($item.FullName)
  }
}

$insv = @($files | Where-Object { [IO.Path]::GetExtension($_).ToLowerInvariant() -eq ".insv" })
if ($insv.Count -gt 0) {
  Write-Log 'Rejected raw .insv. Stitch in Insta360 Studio first: horizon lock ON; tilt recovery and vibration reduction OFF.'
  exit 4
}

$stills = @($files | Where-Object { $stillExt -contains [IO.Path]::GetExtension($_).ToLowerInvariant() })
$videos = @($files | Where-Object { $videoExt -contains [IO.Path]::GetExtension($_).ToLowerInvariant() })
if ($stills.Count -eq 0 -and $videos.Count -eq 0) {
  Write-Log 'drop stitched equirect stills jpg/png ~2:1 or stitched equirect mp4'
  exit 2
}

if (-not $JobDir) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $safe = "job"
  if ($SceneName) {
    $safe = ($SceneName -replace '[^A-Za-z0-9_-]', '_').Trim('_')
    if (-not $safe) { $safe = "job" }
  }
  $JobDir = Join-Path $env:USERPROFILE ("ggps-jobs\" + $stamp + "-" + $safe)
}
$imgDir = Join-Path $JobDir "images"
New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
if ($LogPath) {
  $logParent = Split-Path -Parent $LogPath
  if ($logParent) { New-Item -ItemType Directory -Force -Path $logParent | Out-Null }
}
Write-Log "Research - not for customer jobs"
Write-Log "STAGE import"
Write-Log "job=$JobDir"
Write-Log "GGPS=$ggps"
Write-Log ("mode=" + $Mode)
if ($SceneName) { Write-Log "scene=$SceneName" }
$is2d = ($Mode -eq "2d")

$existing = @(Get-ChildItem -LiteralPath $imgDir -File -ErrorAction SilentlyContinue)
if ($SkipExtract -and $existing.Count -ge 20) {
  Write-Log ("Reuse $($existing.Count) existing frames; skip extract")
} else {
$copied = 0
foreach ($s in $stills) {
  $dest = Join-Path $imgDir ([IO.Path]::GetFileName($s))
  Copy-Item -LiteralPath $s -Destination $dest -Force
  $copied++
}
Write-Log "copied $copied stills"

if ($videos.Count -gt 0 -and -not $is2d) {
  $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ff) { Write-Log "ffmpeg missing"; exit 1 }
  if ($Fps -lt 0.5 -or $Fps -gt 4) { $Fps = 2 }
  $vi = 0
  foreach ($v in $videos) {
    $vi++
    $pattern = Join-Path $imgDir ("v{0}_{1}_%05d.jpg" -f $vi, [IO.Path]::GetFileNameWithoutExtension($v))
    Write-Log "STAGE extract"
    Write-Log "ffmpeg extract $Fps fps from $v"
    Write-Log "HEVC 360 decode can take several minutes. New jpgs appear in images\ while this runs."
    $ffArgs = @("-y","-hide_banner","-loglevel","info","-stats","-i",$v,"-vf","fps=$Fps","-q:v","2",$pattern)
    & ffmpeg @ffArgs
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed" }
  }
}
}

$frames = @(Get-ChildItem -LiteralPath $imgDir -File | Where-Object { $stillExt -contains $_.Extension.ToLowerInvariant() })
if ($frames.Count -eq 1) {
  Write-Log "One single pano is not enough. Need a walk with overlap."
  exit 5
}

$kept = New-Object System.Collections.Generic.List[object]
foreach ($f in $frames) {
  $sz = Get-ImageSize $f.FullName
  if (-not $is2d -and -not (Test-EquirectSize $sz.W $sz.H)) {
    Write-Log ("WARN not ~2:1 ERP, skipping {0} {1}x{2}" -f $f.Name, $sz.W, $sz.H)
    continue
  }
  if ($SkipBlur -or $videos.Count -gt 0) {
    $kept.Add([pscustomobject]@{ File = $f; Sharp = 99; W = $sz.W; H = $sz.H })
    continue
  }
  $sh = Get-Sharpness $f.FullName
  $kept.Add([pscustomobject]@{ File = $f; Sharp = $sh; W = $sz.W; H = $sz.H })
}

$allowVideo2d = $is2d -and $videos.Count -gt 0
if ($kept.Count -lt 20 -and -not $allowVideo2d) {
  Write-Log ("Need ~20+ stills after extract/filter; have {0}. Refuse to train." -f $kept.Count)
  exit 5
}

$sortedSharp = @($kept | Sort-Object Sharp)
$cut = $sortedSharp[[Math]::Floor($sortedSharp.Count * 0.15)].Sharp
$dropped = 0
foreach ($k in $kept) {
  if ($k.Sharp -lt $cut -and $k.Sharp -lt 12) {
    Remove-Item -LiteralPath $k.File.FullName -Force
    $dropped++
  }
}
$left = @(Get-ChildItem -LiteralPath $imgDir -File | Where-Object { $stillExt -contains $_.Extension.ToLowerInvariant() })
Write-Log ("frames kept={0} blur-dropped={1} sharpness-cut={2:N1}" -f $left.Count, $dropped, $cut)
if ($left.Count -lt 20) {
  Write-Log "too few sharp frames; refuse to train"
  exit 5
}

$code = 0
if ($is2d) {
  $cli = Join-Path $env:ProgramFiles "Jawset Postshot\bin\postshot-cli.exe"
  if (-not (Test-Path -LiteralPath $cli)) { Write-Log "Postshot CLI missing"; exit 1 }
  $psht = Join-Path $JobDir "scene.psht"
  $kSteps = 30
  if ($Iters -ge 20000) { $kSteps = 60 }
  Write-Log "STAGE train-2d Postshot"
  $imports = New-Object System.Collections.Generic.List[string]
  if ($frames.Count -ge 20) { $imports.Add($imgDir) }
  else { foreach ($v in $videos) { $imports.Add($v) } }
  $trainArgs = @("train","--gpu","0","-p","Splat3","--pose-quality","4","--max-image-size","3840","-s","$kSteps","--output",$psht)
  foreach ($im in $imports) { $trainArgs += @("--import",$im) }
  Write-Log ("postshot " + ($trainArgs -join " "))
  & $cli @trainArgs
  $code = $LASTEXITCODE
  Write-Log ("postshot train exit=$code")
  if ($code -eq 0 -and (Test-Path -LiteralPath $psht)) {
    $rawSpz = Join-Path $JobDir "postshot.spz"
    Write-Log "STAGE export-2d"
    & $cli @("export","--file",$psht,"--export-splat",$rawSpz,"--spz-version","3")
    $code = $LASTEXITCODE
    if (Test-Path -LiteralPath $rawSpz) {
      New-Item -ItemType Directory -Force -Path (Join-Path $JobDir "export") | Out-Null
      Copy-Item $rawSpz (Join-Path $JobDir "export\gaussian.spz") -Force
    }
  }
} else {
  $wslScene = ConvertTo-WslPath $JobDir
  $wslGgps = ConvertTo-WslPath $ggps
  $wslScript = ConvertTo-WslPath (Join-Path $here "wsl\run_pipeline.sh")
  if ($Iters -lt 1000) { $Iters = 7000 }
  if ($Iters -gt 30000) { $Iters = 30000 }
  Write-Log "STAGE sfm"
  Write-Log "WSL OpenSfM spherical then GGPS train"
  $wslArgs = @("-d","Ubuntu-22.04","--","bash",$wslScript,"--scene",$wslScene,"--ggps",$wslGgps,"--iters","$Iters")
  if ($Train) { $wslArgs += "--train" }
  if ($LargeOutdoor) { $wslArgs += "--large-outdoor" }
  Write-Log ("wsl " + ($wslArgs -join " "))
  & wsl.exe @wslArgs
  $code = $LASTEXITCODE
  Write-Log ("wsl exit=$code")
}

$exportDir = Join-Path $JobDir "export"
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null
$plyHits = @(Get-ChildItem -LiteralPath $JobDir -Recurse -Filter "point_cloud.ply" -ErrorAction SilentlyContinue)
$splatPath = $null
$spzPath = $null
$shareUrl = $null
$readySpz = Join-Path $exportDir "gaussian.spz"
if (Test-Path -LiteralPath $readySpz) { $spzPath = $readySpz }
if ($plyHits.Count -gt 0) {
  $splatPath = Join-Path $exportDir "gaussian.ply"
  Copy-Item -LiteralPath $plyHits[0].FullName -Destination $splatPath -Force
  Write-Log "STAGE export"
  Write-Log "Gaussian PLY $splatPath"
  if (-not $spzPath) {
    $spzPath = Join-Path $exportDir "gaussian.spz"
    $convert = Join-Path $here "convert-splat.mjs"
    Write-Log "PLY to SPZ v3 for Twin viewer"
    & node $convert --in $splatPath --out $spzPath --format spz
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $spzPath)) {
      Write-Log "SPZ convert failed. PLY is still in export."
      $spzPath = $null
    } else {
      Write-Log "SPZ $spzPath"
    }
  }
} elseif (-not $spzPath) {
  Write-Log "No Gaussian output yet."
}

$fmt = $ExportFormat.ToLowerInvariant()
if (-not $fmt) { $fmt = "spz" }
$srcForUser = $null
if ($fmt -eq "spz") { $srcForUser = $spzPath }
elseif ($fmt -eq "ply") { $srcForUser = $splatPath }
elseif ($splatPath -and $fmt -in @("splat","html")) {
  $srcForUser = Join-Path $exportDir ("gaussian" + $(if ($fmt -eq "html") { ".html" } else { ".splat" }))
  & node (Join-Path $here "convert-splat.mjs") --in $splatPath --out $srcForUser --format $fmt
  if (-not (Test-Path -LiteralPath $srcForUser)) { $srcForUser = $null }
}
if ($ExportPath -and $srcForUser) {
  $destDir = Split-Path -Parent $ExportPath
  if ($destDir) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
  Copy-Item -LiteralPath $srcForUser -Destination $ExportPath -Force
  Write-Log "Saved $ExportPath"
}

if ($Ingest -and $spzPath) {
  Write-Log "STAGE ingest Twin"
  Push-Location C:\s360-desktop
  try {
    $title = $SceneName
    if (-not $title) { $title = "GGPS research " + (Get-Date -Format "yyyy-MM-dd HH:mm") }
    & node .\scripts\local-splat\ingest-splat.mjs --file $spzPath --title $title
    $shareFile = Join-Path C:\s360-desktop "tmp\local-splat-last-share.json"
    if (Test-Path -LiteralPath $shareFile) {
      Copy-Item -LiteralPath $shareFile -Destination (Join-Path $JobDir "share.json") -Force
      $shareUrl = (Get-Content -LiteralPath $shareFile -Raw | ConvertFrom-Json).shareUrl
      Write-Log "twin share $shareUrl"
    }
  } finally { Pop-Location }
}

$readme = @(
  "Research - not for customer jobs",
  "job: $JobDir",
  "exit: $code",
  "frames: $imgDir",
  "gaussian ply: $(if ($splatPath) { $splatPath } else { 'NOT CREATED' })",
  "gaussian spz: $(if ($spzPath) { $spzPath } else { 'NOT CREATED' })",
  "twin share: $(if ($shareUrl) { $shareUrl } else { 'not ingested' })",
  "Open gaussian.spz in the Twin / Spark viewer. That is the inspectable splat."
) -join [Environment]::NewLine
Set-Content -LiteralPath (Join-Path $JobDir "README.txt") -Value $readme -Encoding UTF8

$last = @{
  jobDir = $JobDir
  ggps = $ggps
  exitCode = $code
  researchOnly = $true
  ingest = $false
  ply = $splatPath
  spz = $spzPath
  shareUrl = $shareUrl
  sceneName = $SceneName
}
$last | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $JobDir "last-run.json") -Encoding UTF8
$jobsRoot = Join-Path $env:USERPROFILE "ggps-jobs"
New-Item -ItemType Directory -Force -Path $jobsRoot | Out-Null
$last | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $jobsRoot "last-job.json") -Encoding UTF8
if ($code -eq 42) {
  Write-Log 'SfM done. Train skipped until conda env PanoLOG exists. See docs/research/GGPS_DROP_APP.md.'
  exit 0
}
exit $code
