$ErrorActionPreference = 'Stop'
$workspace = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $workspace 'release'
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') { throw 'Invalid package version' }
$packageRoot = Join-Path (Join-Path $releaseRoot $version) 'NotebookAid-win32-x64'
$addonPath = Join-Path $releaseRoot 'NotebookAid.xpi'
$bundlePath = Join-Path $releaseRoot "NotebookAid-$version-win-x64.zip"
foreach ($target in @($packageRoot, $addonPath, $bundlePath)) {
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
Copy-Item -LiteralPath (Join-Path $workspace 'docs/onboarding-testing.md') -Destination (Join-Path $packageRoot 'ONBOARDING-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/menu-testing.md') -Destination (Join-Path $packageRoot 'MENU-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/context-testing.md') -Destination (Join-Path $packageRoot 'CONTEXT-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/decrypt-testing.md') -Destination (Join-Path $packageRoot 'DECRYPT-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/easter-testing.md') -Destination (Join-Path $packageRoot 'EASTER-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/startup-testing.md') -Destination (Join-Path $packageRoot 'STARTUP-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t14-testing.md') -Destination (Join-Path $packageRoot 'T14-TESTING.md') -Force
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t13-testing.md') -Destination (Join-Path $packageRoot 'T13-TESTING.md') -Force
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
$compatPath = Join-Path $releaseRoot 'NotebookAid-Compatibility.xpi'
foreach ($name in @('NotebookAid.xpi', 'NotebookAid-Compatibility.xpi')) {
    $standalone = Join-Path $releaseRoot $name
    $embedded = Join-Path $packageRoot $name
    if (!(Test-Path -LiteralPath $embedded) -or (Get-FileHash -LiteralPath $embedded).Hash -ne (Get-FileHash -LiteralPath $standalone).Hash) { throw "Missing or mismatched packaged addon: $name" }
}
Copy-Item -LiteralPath (Join-Path $workspace 'docs/t15-testing.md') -Destination (Join-Path $packageRoot 'T15-TESTING.md') -Force
Compress-Archive -LiteralPath $packageRoot -DestinationPath $bundlePath -CompressionLevel Optimal -Force
$installerPattern = '^NotebookAid-' + [regex]::Escape($version) + '-Setup-x64\.exe(?:\.blockmap)?$'
$installerFiles = @(Get-ChildItem -LiteralPath (Join-Path $releaseRoot 'installer') -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match $installerPattern } | ForEach-Object FullName)
$hashes = @($bundlePath, $addonPath, $compatPath) + $installerFiles | ForEach-Object {
    $hash = Get-FileHash -LiteralPath $_ -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $([System.IO.Path]::GetFileName($_))"
}
[System.IO.File]::WriteAllLines((Join-Path $releaseRoot 'SHA256SUMS.txt'), $hashes, [System.Text.UTF8Encoding]::new($false))
Write-Output $bundlePath
Write-Output $hashes
