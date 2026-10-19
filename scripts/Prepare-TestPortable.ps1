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
    if (Get-Process -Name NotebookAid,NotebookAid.Bridge,NotebookAid.Passkey,NotebookAid.Print,NotebookAid.McpCrypt -ErrorAction SilentlyContinue) { throw 'Exit NotebookAid and its native helpers before preparing the portable folder.' }
    if (Test-Path -LiteralPath $target) {
        Assert-PlainTree $target
        $data = Get-ChildItem -LiteralPath $target -Recurse -Force | Where-Object {
            $_.Name -in @('library.json','settings.json','libraries.json','notes','userData','portable_data','mcp-profiles','mcp-plugins','external-clients.json','app-passkeys.json') -or $_.Extension -in @('.sqlite','.db')
        }
        if ($data) { throw 'Possible user data found in the portable folder. Inspect it before replacing files.' }
    }
}
Assert-TargetReady
$registeredHosts = @()
foreach ($hostEntry in @(@{Name='de.zub_systems.notebookaid';Id='notebookaid@zub-systems.de';File='native-host.json'},@{Name='de.zub_systems.notebookaid_t02';Id='notebookaid-t02@zub-systems.de';File='native-host-legacy.json'})) {
    $key = 'HKCU:\Software\Mozilla\NativeMessagingHosts\' + $hostEntry.Name
    $manifest = Join-Path $target $hostEntry.File
    if ((Test-Path -LiteralPath $key) -and ((Get-Item -LiteralPath $key).GetValue('') -eq $manifest)) { $registeredHosts += $hostEntry }
}
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
    foreach ($required in @('NotebookAid.exe','NotebookAid.Passkey.exe','NotebookAid.Print.exe','NotebookAid.Bridge.exe','NotebookAid.McpCrypt.exe','resources/app.asar','resources/mcp/server.cjs','resources/mcp/components.json','resources/mcp/THIRD-PARTY-NOTICES.txt','MCP-FINAL-TESTING.md')) {
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
# Recreate only registrations already owned by this portable directory.
foreach ($hostEntry in $registeredHosts) {
    $document = @{name=$hostEntry.Name;description='NotebookAid bridge';path=(Join-Path $target 'NotebookAid.Bridge.exe');type='stdio';allowed_extensions=@($hostEntry.Id)}
    $manifest = Join-Path $target $hostEntry.File
    [IO.File]::WriteAllText($manifest, ($document | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
    $restored = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    if ($restored.name -ne $hostEntry.Name -or $restored.path -ne (Join-Path $target 'NotebookAid.Bridge.exe') -or $restored.allowed_extensions.Count -ne 1 -or $restored.allowed_extensions[0] -ne $hostEntry.Id) { throw 'Restored bridge manifest mismatch' }
}
if (Test-Path -LiteralPath (Join-Path $target 'NotebookAid-win32-x64')) { throw 'Nested package directory detected' }
$job = Join-Path $workspace ('output/portable-preparation/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $job -Force | Out-Null
$report = [ordered]@{ version=$version; target=$target; bundle=$bundle; sha256=(Get-FileHash -LiteralPath $bundle).Hash; backupCreated=$false; verified=$true; bridgeManifestsRestored=$registeredHosts.Count }
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $job 'deployment.json') -Encoding utf8
$report | ConvertTo-Json
