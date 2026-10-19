$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid version' }
$root = Join-Path $workspace "release/$version/NotebookAid-win32-x64"
$inventory = Get-Content -LiteralPath (Join-Path $root 'installation-files.json') -Raw | ConvertFrom-Json
if ($inventory.owner -ne 'NotebookAid.Installation.v1' -or $inventory.version -ne $version) { throw 'Invalid installation inventory' }
$count = 0
foreach ($entry in $inventory.files.PSObject.Properties) {
    $file = [IO.Path]::GetFullPath((Join-Path $root $entry.Name))
    if (-not $file.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe inventory entry' }
    if ((Get-FileHash -LiteralPath $file).Hash.ToLowerInvariant() -ne $entry.Value) { throw "Inventory mismatch: $($entry.Name)" }
    $count++
}
$verified = @()
foreach ($list in @('release/SHA256SUMS.txt','release/msi/SHA256-MSI.txt')) {
    foreach ($line in Get-Content -LiteralPath (Join-Path $workspace $list)) {
        if ($line -notmatch '^([a-f0-9]{64})  ([A-Za-z0-9.-]+)$') { throw 'Invalid checksum entry' }
        $hash = $Matches[1]; $name = $Matches[2]
        $folder = if ($name -match '\.msi$') { 'release/msi' } elseif ($name -match '-Setup-x64\.exe') { 'release/installer' } else { 'release' }
        if ((Get-FileHash -LiteralPath (Join-Path (Join-Path $workspace $folder) $name)).Hash.ToLowerInvariant() -ne $hash) { throw "Checksum mismatch: $name" }
        $verified += $name
    }
}
foreach ($name in @("NotebookAid-$version-win-x64.zip", "NotebookAid-$version-Setup-x64.exe", "NotebookAid-$version-Setup-x64.msi", 'NotebookAid.xpi', 'NotebookAid-Compatibility.xpi')) {
    if ($name -notin $verified) { throw "Missing checksum: $name" }
}
foreach ($name in @('Bridge','Passkey','Print','SetupSupport','McpCrypt')) {
    $metadata = (Get-Item -LiteralPath (Join-Path $root "NotebookAid.$name.exe")).VersionInfo
    if ($metadata.ProductName -ne 'NotebookAid' -or $metadata.ProductVersion -ne $version -or $metadata.FileVersion -ne "$version.0") { throw "Native metadata mismatch: $name" }
}
$components = Get-Content -LiteralPath (Join-Path $root 'resources/mcp/components.json') -Raw | ConvertFrom-Json
$catalog = Get-Content -LiteralPath (Join-Path $root 'distribution-dependencies.json') -Raw | ConvertFrom-Json
foreach ($component in $components) {
    if (-not ($catalog.components | Where-Object { $_.name -eq $component.name -and $_.version -eq $component.version -and 'resources/mcp/THIRD-PARTY-NOTICES.txt' -in $_.notices })) { throw 'MCP license inventory mismatch' }
}
if ($components.Count -ne 3) { throw 'Unexpected MCP component count' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$bundle = Join-Path $workspace "release/NotebookAid-$version-win-x64.zip"
$zip = [IO.Compression.ZipFile]::OpenRead($bundle)
$seen = @{}
try {
    foreach ($entry in $zip.Entries) {
        $name = $entry.FullName.Replace('\','/')
        if (-not $name.StartsWith('NotebookAid-win32-x64/') -or $name -match '(^/|:|(^|/)\.\.(/|$))') { throw 'Unsafe archive entry' }
        if ($name.EndsWith('/')) { continue }
        $relative = $name.Substring('NotebookAid-win32-x64/'.Length)
        if ($seen.ContainsKey($relative)) { throw 'Duplicate archive entry' }
        $seen[$relative] = $true
        $stream = $entry.Open(); $algorithm = [Security.Cryptography.SHA256]::Create()
        try { $hash = [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
        finally { $stream.Dispose(); $algorithm.Dispose() }
        if ((Get-FileHash -LiteralPath (Join-Path $root $relative)).Hash.ToLowerInvariant() -ne $hash) { throw "ZIP content mismatch: $relative" }
    }
    foreach ($file in @('NotebookAid.exe','NotebookAid.McpCrypt.exe','resources/app.asar','resources/mcp/server.cjs','resources/mcp/components.json','resources/mcp/THIRD-PARTY-NOTICES.txt','MCP-FINAL-TESTING.md','installation-files.json')) {
        if (-not $seen.ContainsKey($file)) { throw "Missing ZIP resource: $file" }
    }
    foreach ($file in $inventory.files.PSObject.Properties.Name) { if (-not $seen.ContainsKey($file)) { throw "Missing inventoried ZIP file: $file" } }
} finally { $zip.Dispose() }
foreach ($name in @('NotebookAid.xpi','NotebookAid-Compatibility.xpi')) {
    if ((Get-FileHash -LiteralPath (Join-Path $root $name)).Hash -ne (Get-FileHash -LiteralPath (Join-Path $workspace "release/$name")).Hash) { throw 'Embedded addon mismatch' }
}
$report = [ordered]@{ version=$version; inventoryFiles=$count; zipFiles=$seen.Count; checksums=$verified.Count; mcpLicensedComponents=$components.Count; nativeMetadataVerified=$true; xpiEmbedded=$true; zipSha256=(Get-FileHash -LiteralPath $bundle).Hash.ToLowerInvariant(); installationExecuted=$false }
$output = Join-Path $workspace 'output/mcp07'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$report | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'distribution-verification.json') -Encoding utf8
$report | ConvertTo-Json
