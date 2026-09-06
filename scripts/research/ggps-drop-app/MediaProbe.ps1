# Probe dropped 360 media. Research helper, no secrets.
$ErrorActionPreference = "Continue"

function Get-FfprobeExe {
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
  $hit = Get-Command ffprobe -ErrorAction SilentlyContinue
  if ($hit) { return $hit.Source }
  $ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($ffmpeg) {
    $sibling = Join-Path (Split-Path -Parent $ffmpeg.Source) "ffprobe.exe"
    if (Test-Path -LiteralPath $sibling) { return $sibling }
  }
  $winget = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") -Recurse -Filter "ffprobe.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($winget) { return $winget.FullName }
  return $null
}

function Get-FfprobeJson([string]$path) {
  $exe = Get-FfprobeExe
  if (-not $exe) { return $null }
  $raw = & $exe -v error -print_format json -show_entries stream=width,height,codec_name,codec_type -show_entries format=duration,size -i $path
  if (-not $raw) { return $null }
  if ($raw -is [array]) { $raw = [string]::Join("`n", $raw) }
  try { return ($raw | ConvertFrom-Json) } catch { return $null }
}

function Get-SuggestedFps([double]$durationSec) {
  if ($durationSec -le 0) { return 1.0 }
  if ($durationSec -lt 40) { return 2.0 }
  if ($durationSec -lt 180) { return 1.0 }
  return 0.5
}

function Format-MediaSummary($info) {
  if (-not $info) { return "Could not read this file." }
  $dur = [double]$info.duration
  $fps = Get-SuggestedFps $dur
  $n = [int][Math]::Round($dur * $fps)
  $ratio = 0
  if ($info.height -gt 0) { $ratio = [Math]::Round($info.width / [double]$info.height, 2) }
  $erp = ""
  if ($ratio -ge 1.7 -and $ratio -le 2.4) { $erp = "Looks like a stitched 360 panorama (2:1)." }
  elseif ($info.width -gt 0) { $erp = "Aspect $ratio is not 2:1. GGPS wants equirect stills." }
  $mb = [Math]::Round($info.bytes / 1MB, 1)
  $lines = New-Object System.Collections.Generic.List[string]
  $lines.Add(("{0}s  |  {1}x{2}  |  {3}  |  {4} MB" -f [int]$dur, $info.width, $info.height, $info.codec, $mb))
  if ($erp) { $lines.Add($erp) }
  $lines.Add(("Suggested extract: {0} frame(s) per second  (~{1} stills)." -f $fps, $n))
  $lines.Add("1 fps = one still per second of walking. Use 2 fps only if you walked fast.")
  return ($lines -join [Environment]::NewLine)
}

function Get-VideoInfo([string]$path) {
  $item = Get-Item -LiteralPath $path
  $info = @{
    path = $item.FullName
    name = $item.Name
    bytes = $item.Length
    duration = 0.0
    width = 0
    height = 0
    codec = ""
    suggestedFps = 1.0
    isVideo = $true
  }
  $j = Get-FfprobeJson $item.FullName
  if ($j) {
    if ($j.format.duration) { $info.duration = [double]$j.format.duration }
    $vs = @($j.streams | Where-Object { $_.codec_type -eq "video" })
    if ($vs.Count -gt 0) {
      $info.width = [int]$vs[0].width
      $info.height = [int]$vs[0].height
      $info.codec = [string]$vs[0].codec_name
    }
  }
  $info.suggestedFps = Get-SuggestedFps $info.duration
  return $info
}

function Test-PanoLogReady {
  $out = wsl -d Ubuntu-22.04 -- bash -lc 'if [ -x "$HOME/miniconda3/envs/PanoLOG/bin/python" ] || [ -x "$HOME/mambaforge/envs/PanoLOG/bin/python" ] || [ -x "$HOME/anaconda3/envs/PanoLOG/bin/python" ]; then echo PANOLOG_READY; else echo PANOLOG_MISSING; fi'
  $line = (@($out) | Select-Object -Last 1).ToString().Trim()
  return ($line -eq "PANOLOG_READY")
}
