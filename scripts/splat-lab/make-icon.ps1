$ErrorActionPreference = "Stop"
$repo = "C:\s360"
$svg = Join-Path $repo "assets\brand\slate360-icon.svg"
$outDir = Join-Path $repo "scripts\splat-lab"
$png = Join-Path $outDir "slate360-splat-lab.png"
$ico = Join-Path $outDir "slate360-splat-lab.ico"
$html = Join-Path $env:TEMP "slate360-icon.html"
$shot = Join-Path $env:TEMP "slate360-icon-shot.png"

$htmlDoc = @"
<!doctype html>
<html><head><style>
html,body{margin:0;background:#0B0F15;width:256px;height:256px;overflow:hidden}
img{width:256px;height:256px;display:block}
</style></head><body>
<img src="file:///$($svg.Replace('\','/'))" alt="Slate360" />
</body></html>
"@
Set-Content -LiteralPath $html -Value $htmlDoc -Encoding UTF8

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path -LiteralPath $edge)) { $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" }
if (Test-Path -LiteralPath $shot) { Remove-Item -LiteralPath $shot -Force }
if (Test-Path -LiteralPath $edge) {
  $p = Start-Process -FilePath $edge -ArgumentList @(
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--window-size=256,256", "--screenshot=$shot", $html
  ) -PassThru -Wait -WindowStyle Hidden
  $deadline = (Get-Date).AddSeconds(15)
  while (-not (Test-Path -LiteralPath $shot) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (-not (Test-Path -LiteralPath $shot)) {
    Write-Host "Edge screenshot missing after $($p.ExitCode)"
  }
}

Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(255, 11, 15, 21))
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
if (Test-Path -LiteralPath $shot) {
  $src = [System.Drawing.Image]::FromFile($shot)
  $g.DrawImage($src, 0, 0, 256, 256)
  $src.Dispose()
} else {
  $teal = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 230, 153))
  $font = New-Object System.Drawing.Font("Segoe UI Semibold", 72)
  $g.DrawString("S", $font, $teal, 70, 50)
  $font.Dispose(); $teal.Dispose()
}
$bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)

function Get-BgraBottomUp([System.Drawing.Bitmap]$src, [int]$size) {
  $scaled = New-Object System.Drawing.Bitmap $size, $size
  $sg = [System.Drawing.Graphics]::FromImage($scaled)
  $sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $sg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $sg.DrawImage($src, 0, 0, $size, $size)
  $sg.Dispose()
  $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $data = $scaled.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $raw = New-Object byte[] ($size * $size * 4)
  [Runtime.InteropServices.Marshal]::Copy($data.Scan0, $raw, 0, $raw.Length)
  $scaled.UnlockBits($data)
  $scaled.Dispose()
  $row = $size * 4
  $flipped = New-Object byte[] $raw.Length
  for ($y = 0; $y -lt $size; $y++) {
    [Array]::Copy($raw, ($size - 1 - $y) * $row, $flipped, $y * $row, $row)
  }
  return $flipped
}

function New-AndMask([int]$size) {
  $stride = [int](([Math]::Ceiling($size / 32.0)) * 4)
  return New-Object byte[] ($stride * $size)
}

$sizes = @(16, 32, 48, 256)
$images = @()
foreach ($s in $sizes) {
  $pixels = Get-BgraBottomUp $bmp $s
  $and = New-AndMask $s
  $header = New-Object byte[] 40
  $header[0] = 40
  [BitConverter]::GetBytes([int32]$s).CopyTo($header, 4)
  [BitConverter]::GetBytes([int32]($s * 2)).CopyTo($header, 8)
  [BitConverter]::GetBytes([int16]1).CopyTo($header, 12)
  [BitConverter]::GetBytes([int16]32).CopyTo($header, 14)
  $xorLen = $pixels.Length
  $andLen = $and.Length
  [BitConverter]::GetBytes([int32]($xorLen + $andLen)).CopyTo($header, 20)
  $blob = New-Object byte[] ($header.Length + $xorLen + $andLen)
  [Array]::Copy($header, 0, $blob, 0, $header.Length)
  [Array]::Copy($pixels, 0, $blob, $header.Length, $xorLen)
  [Array]::Copy($and, 0, $blob, $header.Length + $xorLen, $andLen)
  $images += @{ size = $s; blob = $blob }
}

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $ms
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]$images.Count)
$offset = 6 + (16 * $images.Count)
foreach ($img in $images) {
  $w = if ($img.size -ge 256) { [byte]0 } else { [byte]$img.size }
  $bw.Write($w)
  $bw.Write($w)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$img.blob.Length)
  $bw.Write([uint32]$offset)
  $offset += $img.blob.Length
}
foreach ($img in $images) { $bw.Write($img.blob) }
$bw.Flush()
[System.IO.File]::WriteAllBytes($ico, $ms.ToArray())
$bw.Dispose(); $ms.Dispose()
$g.Dispose(); $bmp.Dispose()
Write-Host "Wrote $ico ($((Get-Item $ico).Length) bytes)"
