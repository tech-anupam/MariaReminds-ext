Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $baseDir ".output"

$firefoxDir = Join-Path $outputDir "MariaRemindUs - FireFox Extension"
$chromeDir = Join-Path $outputDir "MariaRemindUs - Chrome & Microsoft Edge Extension"

$firefoxZip = Join-Path $outputDir "MariaRemindUs - FireFox Extension.zip"
$chromeZip = Join-Path $outputDir "MariaRemindUs - Chrome & Microsoft Edge Extension.zip"

$firefoxXpi = Join-Path $outputDir "MariaRemindUs-Firefox.xpi"
$firefoxCleanZip = Join-Path $outputDir "MariaRemindUs-Firefox.zip"
$chromeCleanZip = Join-Path $outputDir "MariaRemindUs-Chrome-Edge.zip"

Write-Host "Packaging Firefox extension to $firefoxZip..."
if (Test-Path $firefoxZip) { Remove-Item $firefoxZip -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($firefoxDir, $firefoxZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

# Create .xpi (standard Firefox add-on format) and clean .zip
Copy-Item $firefoxZip $firefoxXpi -Force
Copy-Item $firefoxZip $firefoxCleanZip -Force

Write-Host "Packaging Chrome/Edge extension to $chromeZip..."
if (Test-Path $chromeZip) { Remove-Item $chromeZip -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($chromeDir, $chromeZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item $chromeZip $chromeCleanZip -Force

Write-Host "Verifying Firefox ZIP entries:"
$ffZip = [System.IO.Compression.ZipFile]::OpenRead($firefoxZip)
foreach ($entry in $ffZip.Entries) {
    if ($entry.Name -eq "manifest.json") {
        Write-Host "  Found: $($entry.FullName)"
    }
}
$ffZip.Dispose()

Write-Host "Verifying Chrome ZIP entries:"
$chZip = [System.IO.Compression.ZipFile]::OpenRead($chromeZip)
foreach ($entry in $chZip.Entries) {
    if ($entry.Name -eq "manifest.json") {
        Write-Host "  Found: $($entry.FullName)"
    }
}
$chZip.Dispose()

Write-Host "Packaging completed successfully!"
