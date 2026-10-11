$ErrorActionPreference = 'Stop'
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $workspace 'release'
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Invalid package version' }
$packageRoot = Join-Path (Join-Path $releaseRoot $version) 'NotebookAid-win32-x64'
$addonArchive = Join-Path $releaseRoot 'NotebookAid-T02.zip'
$addonPath = Join-Path $releaseRoot 'NotebookAid-T02.xpi'
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
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t06a-testing.md') -Destination (Join-Path $packageRoot 'T06A-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t06-testing.md') -Destination (Join-Path $packageRoot 'T06-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t05-testing.md') -Destination (Join-Path $packageRoot 'T05-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t05a-testing.md') -Destination (Join-Path $packageRoot 'T05A-TESTING.md') -Force
Compress-Archive -Path @((Join-Path $workspace 'thunderbird/*'), (Join-Path $workspace 'LICENSE')) -DestinationPath $addonArchive -Force
Copy-Item -LiteralPath $addonArchive -Destination $addonPath -Force
Copy-Item -LiteralPath $addonPath -Destination (Join-Path $packageRoot 'NotebookAid-T02.xpi') -Force
Compress-Archive -LiteralPath $packageRoot -DestinationPath $bundlePath -CompressionLevel Optimal -Force
$hashes = @($bundlePath, $addonPath) | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($_))"
}
[System.IO.File]::WriteAllLines((Join-Path $releaseRoot 'SHA256SUMS.txt'), $hashes, [System.Text.UTF8Encoding]::new($false))
Write-Output $bundlePath
Write-Output $hashes
