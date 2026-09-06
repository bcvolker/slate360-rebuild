# GGPS research pipeline (Windows). Research - not for customer jobs.
param(
  [string[]]$InputPaths,
  [string]$JobDir,
  [double]$Fps = 1,
  [string]$SceneName = "",
  [switch]$LargeOutdoor,
  [switch]$Train,
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
if ($SceneName) { Write-Log "scene=$SceneName" }

$copied = 0
foreach ($s in $stills) {
  $dest = Join-Path $imgDir ([IO.Path]::GetFileName($s))
  Copy-Item -LiteralPath $s -Destination $dest -Force
  $copied++
}
Write-Log "copied $copied stills"

if ($videos.Count -gt 0) {
  $ff = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if (-not $ff) { Write-Log "ffmpeg missing"; exit 1 }
  if ($Fps -lt 0.5 -or $Fps -gt 4) { $Fps = 2 }
  $vi = 0
  foreach ($v in $videos) {
    $vi++
    $pattern = Join-Path $imgDir ("v{0}_{1}_%05d.jpg" -f $vi, [IO.Path]::GetFileNameWithoutExtension($v))
    Write-Log "STAGE extract"
    Write-Log "ffmpeg extract $Fps fps from $v"
    & ffmpeg -y -hide_banner -loglevel error -i $v -vf "fps=$Fps" -q:v 2 $pattern
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed" }
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
  if (-not (Test-EquirectSize $sz.W $sz.H)) {
    Write-Log ("WARN not ~2:1 ERP, skipping {0} {1}x{2}" -f $f.Name, $sz.W, $sz.H)
    continue
  }
  $sh = Get-Sharpness $f.FullName
  $kept.Add([pscustomobject]@{ File = $f; Sharp = $sh; W = $sz.W; H = $sz.H })
}

if ($kept.Count -lt 20) {
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

$wslScene = ConvertTo-WslPath $JobDir
$wslGgps = ConvertTo-WslPath $ggps
$wslScript = ConvertTo-WslPath (Join-Path $here "wsl\run_pipeline.sh")
$trainFlag = ""
if ($Train) { $trainFlag = "--train" }
$largeFlag = ""
if ($LargeOutdoor) { $largeFlag = "--large-outdoor" }

Write-Log "STAGE sfm"
Write-Log 'WSL pipeline (OpenSfM spherical / GGPS wrap)'
$bash = "bash `"$wslScript`" --scene `"$wslScene`" --ggps `"$wslGgps`" $trainFlag $largeFlag"
Write-Log $bash
& wsl -d Ubuntu-22.04 -- bash -lc $bash
$code = $LASTEXITCODE
Write-Log ("wsl exit=$code")

$exportDir = Join-Path $JobDir "export"
New-Item -ItemType Directory -Force -Path $exportDir | Out-Null
$plyHits = @(Get-ChildItem -LiteralPath $JobDir -Recurse -Filter "point_cloud.ply" -ErrorAction SilentlyContinue)
$splatPath = $null
if ($plyHits.Count -gt 0) {
  $splatPath = Join-Path $exportDir "gaussian.ply"
  Copy-Item -LiteralPath $plyHits[0].FullName -Destination $splatPath -Force
  Write-Log "STAGE export"
  Write-Log "Gaussian PLY copied to $splatPath"
} else {
  Write-Log "No point_cloud.ply yet. That is the Gaussian splat file. Training did not finish."
}

$readme = @(
  "Research - not for customer jobs",
  "job: $JobDir",
  "exit: $code",
  "frames: $imgDir",
  "gaussian ply: $(if ($splatPath) { $splatPath } else { 'NOT CREATED - need conda env PanoLOG then re-run Train' })",
  "This is a .ply for local inspect. The Twin share viewer wants .spz from Postshot, not this research PLY."
) -join [Environment]::NewLine
Set-Content -LiteralPath (Join-Path $JobDir "README.txt") -Value $readme -Encoding UTF8

$last = @{
  jobDir = $JobDir
  ggps = $ggps
  exitCode = $code
  researchOnly = $true
  ingest = $false
  ply = $splatPath
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
