<#
  Builds a lean WebExtension folder (and optional .zip) for AMO / Chrome upload.
  Copies only runtime files referenced by manifest.json (no .git, docs, dev scripts, or samples).

  Usage (from repo root):
    powershell -ExecutionPolicy Bypass -File scripts/package-for-store.ps1
    powershell -ExecutionPolicy Bypass -File scripts/package-for-store.ps1 -Zip
    powershell -ExecutionPolicy Bypass -File scripts/package-for-store.ps1 -Zip -IncludeReadme
    scripts/package-for-store.bat
    scripts/package-for-store.bat -IncludeReadme

  The .bat passes -NoPause so only the cmd window prompts once. For CI/automation, pass -NoPause when invoking this .ps1 directly.
#>
[CmdletBinding()]
param(
  [switch] $Zip,
  [switch] $IncludeReadme,
  [switch] $NoPause
)

try {
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$distRoot = Join-Path $repoRoot "dist"
$folderName = "sntys-store-upload-$stamp-TEMP"
$dest = Join-Path $distRoot $folderName

$toCopy = @(
  "manifest.json",
  "icons\icon16.png",
  "icons\icon48.png",
  "icons\icon128.png",
  "src\content\content.js",
  "src\content\styles.css",
  "src\popup\popup.html",
  "src\popup\popup.js",
  "src\popup\popup.css"
)

New-Item -ItemType Directory -Force -Path $dest | Out-Null

foreach ($rel in $toCopy) {
  $srcPath = Join-Path $repoRoot $rel
  if (-not (Test-Path $srcPath)) {
    throw "Missing required file: $srcPath"
  }
  $destPath = Join-Path $dest $rel
  $parent = Split-Path $destPath -Parent
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item -Force $srcPath $destPath
}

if ($IncludeReadme) {
  $readme = Join-Path $repoRoot "README.md"
  if (Test-Path $readme) {
    Copy-Item -Force $readme (Join-Path $dest "README.md")
  }
}

Write-Host ""
Write-Host "Pack folder ready (TEMP - safe to delete after upload):"
Write-Host "  $dest"
Write-Host ""

if ($Zip) {
  # Both assemblies are required on Windows PowerShell 5.1 for ZipArchiveMode / ZipFile.
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zipPath = Join-Path $distRoot "$folderName.zip"
  if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
  }
  # AMO and PKWARE APPNOTE 4.4.17.1 require '/' in stored entry names. Compress-Archive uses '\' on Windows,
  # which triggers "Invalid file name in archive" on Mozilla (see mozilla/addons-linter#4673).
  $destFull = (Resolve-Path -LiteralPath $dest).Path
  # Use $zipArchive (not $zip): PowerShell treats $zip and the -Zip switch parameter as the same variable.
  $zipArchive = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -LiteralPath $destFull -Recurse -File | ForEach-Object {
      $rel = $_.FullName.Substring($destFull.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
      # Avoid ZipFile::CreateEntryFromFile: not present on some Windows/.NET stacks; CreateEntry + CopyTo is portable.
      $entry = $zipArchive.CreateEntry($rel)
      $entryStream = $entry.Open()
      try {
        $fileStream = [System.IO.File]::OpenRead($_.FullName)
        try {
          $fileStream.CopyTo($entryStream)
        } finally {
          $fileStream.Dispose()
        }
      } finally {
        $entryStream.Dispose()
      }
    }
  } finally {
    $zipArchive.Dispose()
  }
  Write-Host "Zip created (POSIX / in entry paths):"
  Write-Host "  $zipPath"
  Write-Host ""
}

Write-Host "Next: upload the zip (or zip the folder yourself). Remove dist\$folderName when done."
} finally {
  if (-not $NoPause -and [Environment]::UserInteractive) {
    Write-Host ""
    Write-Host "Press any key to exit..."
    try {
      $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    } catch {
      Read-Host "Press Enter to exit" | Out-Null
    }
  }
}
