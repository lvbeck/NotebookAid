$ErrorActionPreference = 'Stop'
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $workspace 'release'
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Invalid package version' }
$packageRoot = Join-Path (Join-Path $releaseRoot $version) 'NotebookAid-win32-x64'
$addonArchive = Join-Path $releaseRoot 'NotebookAid.zip'
$addonPath = Join-Path $releaseRoot 'NotebookAid.xpi'
$bundlePath = Join-Path $releaseRoot "NotebookAid-$version-win-x64.zip"
foreach ($target in @($packageRoot, $addonArchive, $addonPath, $bundlePath)) {
    if (-not ([System.IO.Path]::GetFullPath($target).StartsWith($workspace + '\', [System.StringComparison]::OrdinalIgnoreCase))) { throw 'Output is outside the workspace' }
}
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'NotebookAid.exe'))) { throw 'Build the application package first' }
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t02-testing.md') -Destination (Join-Path $packageRoot 'T02-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t03-testing.md') -Destination (Join-Path $packageRoot 'T03-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t03a-testing.md') -Destination (Join-Path $packageRoot 'T03A-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t03b-testing.md') -Destination (Join-Path $packageRoot 'T03B-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t03c-testing.md') -Destination (Join-Path $packageRoot 'T03C-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t04-testing.md') -Destination (Join-Path $packageRoot 'T04-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/html-import-policy.md') -Destination (Join-Path $packageRoot 'html-import-policy.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t07-testing.md') -Destination (Join-Path $packageRoot 'T07-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t10-testing.md') -Destination (Join-Path $packageRoot 'T10-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t11-testing.md') -Destination (Join-Path $packageRoot 'T11-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t12-testing.md') -Destination (Join-Path $packageRoot 'T12-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t09-testing.md') -Destination (Join-Path $packageRoot 'T09-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t09-restore-testing.md') -Destination (Join-Path $packageRoot 'T09-RESTORE-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t09-appearance-testing.md') -Destination (Join-Path $packageRoot 'T09-APPEARANCE-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t08-testing.md') -Destination (Join-Path $packageRoot 'T08-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t08-security-design.md') -Destination (Join-Path $packageRoot 't08-security-design.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t06a-testing.md') -Destination (Join-Path $packageRoot 'T06A-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t06-testing.md') -Destination (Join-Path $packageRoot 'T06-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t05-testing.md') -Destination (Join-Path $packageRoot 'T05-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t05a-testing.md') -Destination (Join-Path $packageRoot 'T05A-TESTING.md') -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$addonRoot = Join-Path $workspace 'thunderbird'
$addonStream = [IO.File]::Open($addonArchive, [IO.FileMode]::Create)
$addonZip = New-Object IO.Compression.ZipArchive($addonStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($source in Get-ChildItem -LiteralPath $addonRoot -Recurse -File) {
        $entryName = $source.FullName.Substring($addonRoot.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($addonZip, $source.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($addonZip, (Join-Path $workspace 'LICENSE'), 'LICENSE', [IO.Compression.CompressionLevel]::Optimal) | Out-Null
} finally { $addonZip.Dispose(); $addonStream.Dispose() }
Copy-Item -LiteralPath $addonArchive -Destination $addonPath -Force
Copy-Item -LiteralPath $addonPath -Destination (Join-Path $packageRoot 'NotebookAid.xpi') -Force
$compatPath = Join-Path $releaseRoot 'NotebookAid-Compatibility.xpi'
$compatRoot = Join-Path $workspace 'thunderbird-compat'
$compatStream = [IO.File]::Open($compatPath, [IO.FileMode]::Create)
$compatZip = New-Object IO.Compression.ZipArchive($compatStream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($source in Get-ChildItem -LiteralPath $compatRoot -Recurse -File) {
        $entryName = $source.FullName.Substring($compatRoot.Length + 1).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($compatZip, $source.FullName, $entryName, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($compatZip, (Join-Path $workspace 'LICENSE'), 'LICENSE', [IO.Compression.CompressionLevel]::Optimal) | Out-Null
} finally { $compatZip.Dispose(); $compatStream.Dispose() }
Copy-Item -LiteralPath $compatPath -Destination (Join-Path $packageRoot 'NotebookAid-Compatibility.xpi') -Force
Compress-Archive -LiteralPath $packageRoot -DestinationPath $bundlePath -CompressionLevel Optimal -Force
$hashes = @($bundlePath, $addonPath, $compatPath) | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($_))"
}
[System.IO.File]::WriteAllLines((Join-Path $releaseRoot 'SHA256SUMS.txt'), $hashes, [System.Text.UTF8Encoding]::new($false))
Write-Output $bundlePath
Write-Output $hashes
