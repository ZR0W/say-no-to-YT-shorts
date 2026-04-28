$ErrorActionPreference = "Stop"

$sourceDir = "C:\Users\Rowla\Downloads\favicon_io"
$repoRoot = Split-Path $PSScriptRoot -Parent
$iconDir = Join-Path $repoRoot "icons"

New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

$icon16Source = Join-Path $sourceDir "favicon-16x16.png"
$masterSource = Join-Path $sourceDir "android-chrome-512x512.png"

if (-not (Test-Path $icon16Source)) {
  throw "Missing source icon: $icon16Source"
}

if (-not (Test-Path $masterSource)) {
  throw "Missing source icon: $masterSource"
}

Copy-Item -Force $icon16Source (Join-Path $iconDir "icon16.png")
Write-Host "Copied icon16.png"

Add-Type -AssemblyName System.Drawing
$master = New-Object System.Drawing.Bitmap $masterSource

foreach ($size in @(48, 128)) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($master, 0, 0, $size, $size)

  $outPath = Join-Path $iconDir ("icon{0}.png" -f $size)
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Host "Wrote $outPath"

  $graphics.Dispose()
  $bmp.Dispose()
}

$master.Dispose()
