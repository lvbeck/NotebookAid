$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Invalid package version' }
$bundle = Join-Path $workspace "release/NotebookAid-$version-win-x64.zip"
$target = [IO.Path]::GetFullPath('C:\Softwares\NotebookAid-win32-x64')
if ($target -ne 'C:\Softwares\NotebookAid-win32-x64') { throw 'Unexpected target' }

function Assert-PlainTree([string]$Root) {
    $item = Get-Item -LiteralPath $Root -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked path rejected: $Root" }
    if ($item.PSIsContainer) {
        foreach ($child in Get-ChildItem -LiteralPath $Root -Force) { Assert-PlainTree $child.FullName }
    }
}
function Assert-TargetReady {
    foreach ($ancestor in @('C:\Softwares', $target)) {
        if ((Test-Path -LiteralPath $ancestor) -and ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked target rejected' }
    }
    if (Get-Process -Name NotebookAid,NotebookAid.Bridge,NotebookAid.Passkey -ErrorAction SilentlyContinue) { throw 'Exit NotebookAid and its native helpers before preparing the portable folder.' }
    if (Test-Path -LiteralPath $target) {
        Assert-PlainTree $target
        $data = Get-ChildItem -LiteralPath $target -Recurse -Force | Where-Object {
            $_.Name -in @('library.json','settings.json','libraries.json','notes','userData','portable_data') -or $_.Extension -in @('.sqlite','.db')
        }
        if ($data) { throw 'Possible user data found in the portable folder. Inspect it before replacing files.' }
    }
}
Assert-TargetReady
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($bundle)
try {
    # Read and hash every ZIP file before removing the installed program files.
    $files = @{}
    foreach ($entry in $archive.Entries) {
        $name = $entry.FullName.Replace('\','/')
        $prefix = 'NotebookAid-win32-x64/'
        if (-not $name.StartsWith($prefix) -or $name.Contains(':')) { throw 'Unexpected archive root' }
        $relative = $name.Substring($prefix.Length)
        if (-not $relative) { continue }
        $resolved = [IO.Path]::GetFullPath((Join-Path $target $relative))
        if (-not $resolved.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe archive entry' }
        if ($name.EndsWith('/')) { continue }
        if ($files.ContainsKey($resolved)) { throw 'Duplicate archive entry' }
        $stream = $entry.Open()
        $algorithm = [Security.Cryptography.SHA256]::Create()
        try { $hash = [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','') }
        finally { $stream.Dispose(); $algorithm.Dispose() }
        $files[$resolved] = @{ Entry=$entry; Hash=$hash }
    }
    foreach ($required in @('NotebookAid.exe','NotebookAid.Passkey.exe','resources/app.asar')) {
        if (-not $files.ContainsKey([IO.Path]::GetFullPath((Join-Path $target $required)))) { throw "Missing package file: $required" }
    }
    # No folder backup: retained release ZIPs are the rollback source.
    Assert-TargetReady
    if (-not (Test-Path -LiteralPath $target)) { New-Item -ItemType Directory -Path $target | Out-Null }
    foreach ($child in Get-ChildItem -LiteralPath $target -Force) {
        $resolved = [IO.Path]::GetFullPath($child.FullName)
        if (-not $resolved.StartsWith($target + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Removal outside target rejected' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
    foreach ($path in $files.Keys) {
        New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($path)) -Force | Out-Null
        [IO.Compression.ZipFileExtensions]::ExtractToFile($files[$path].Entry, $path)
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $files[$path].Hash) { throw "Deployed file mismatch: $path" }
    }
} finally { $archive.Dispose() }
if (Test-Path -LiteralPath (Join-Path $target 'NotebookAid-win32-x64')) { throw 'Nested package directory detected' }
$job = Join-Path $workspace ('output/portable-preparation/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $job -Force | Out-Null
$report = [ordered]@{ version=$version; target=$target; bundle=$bundle; sha256=(Get-FileHash -LiteralPath $bundle).Hash; backupCreated=$false; verified=$true }
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $job 'deployment.json') -Encoding utf8
$report | ConvertTo-Json
