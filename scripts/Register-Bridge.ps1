[CmdletBinding(SupportsShouldProcess)]
param([switch]$Remove, [switch]$RemoveLegacy)
$ErrorActionPreference = 'Stop'
if ($Remove -and $RemoveLegacy) { throw 'Choose either Remove or RemoveLegacy.' }
$packageRoot = $PSScriptRoot
$hostName = 'de.zub_systems.notebookaid'
$extensionId = 'notebookaid@zub-systems.de'
# Retain the legacy endpoint only for compatibility with installed older addons.
$legacyHostName = 'de.zub_systems.notebookaid_t02'
$legacyExtensionId = 'notebookaid-t02@zub-systems.de'
$registryRoot = 'HKCU:\Software\Mozilla\NativeMessagingHosts'
$manifestPath = Join-Path $packageRoot 'native-host.json'
$legacyManifestPath = Join-Path $packageRoot 'native-host-legacy.json'
$paths = @((Join-Path $registryRoot $hostName), (Join-Path $registryRoot $legacyHostName))
$snapshot = @{}
foreach ($path in $paths) {
    $exists = Test-Path -LiteralPath $path
    $value = if ($exists) { (Get-Item -LiteralPath $path).GetValue('') } else { $null }
    if ($exists -and $value -notin @($manifestPath, $legacyManifestPath)) { throw 'The registration belongs to another package directory. No changes were made. Remove it using that package before registering this one.' }
    $snapshot[$path] = @{ Exists=$exists; Value=$value }
}
if (-not $Remove -and -not $RemoveLegacy) {
    foreach ($file in @('NotebookAid.exe','NotebookAid.Bridge.exe')) {
        $target = Join-Path $packageRoot $file
        if (-not (Test-Path -LiteralPath $target)) { throw "Required package file is missing: $file" }
        if ((Get-Item -LiteralPath $target).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked executable rejected.' }
    }
}
$previous = @{}
foreach ($file in @($manifestPath,$legacyManifestPath)) {
    if (Test-Path -LiteralPath $file) {
        if ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked manifest rejected.' }
        $text = Get-Content -LiteralPath $file -Raw
        $document = $text | ConvertFrom-Json
        if ($document.name -notin @($hostName,$legacyHostName)) { throw 'An unrelated native manifest exists. No changes were made.' }
        $previous[$file] = $text
    } else { $previous[$file] = $null }
}
$operation = if ($Remove) { 'Remove NotebookAid bridge registrations' } elseif ($RemoveLegacy) { 'Remove NotebookAid legacy compatibility registration' } else { 'Register NotebookAid bridge and migrate compatible registration' }
if ($PSCmdlet.ShouldProcess($registryRoot, $operation)) {
    $backupRoot = if ($env:NOTEBOOKAID_TEST_HOME) { Join-Path $env:NOTEBOOKAID_TEST_HOME 'bridge-backups' } else { Join-Path ([Environment]::GetFolderPath('ApplicationData')) 'NotebookAid\bridge-backups' }
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    $backup = Join-Path $backupRoot ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString() + '.json')
    [IO.File]::WriteAllText($backup, (@{version=1; registry=$snapshot; manifests=$previous} | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    try {
        if ($RemoveLegacy) {
            $legacyPath = Join-Path $registryRoot $legacyHostName
            if ($snapshot[$legacyPath].Exists) { Remove-Item -LiteralPath $legacyPath }
        } elseif ($Remove) {
            foreach ($path in $paths) { if ($snapshot[$path].Exists) { Remove-Item -LiteralPath $path } }
        } else {
            foreach ($item in @(@{Name=$hostName;Id=$extensionId;File=$manifestPath},@{Name=$legacyHostName;Id=$legacyExtensionId;File=$legacyManifestPath})) {
                $document = @{name=$item.Name; description='NotebookAid bridge'; path=(Join-Path $packageRoot 'NotebookAid.Bridge.exe'); type='stdio'; allowed_extensions=@($item.Id)}
                $temporary = $item.File + '.pending-' + [Guid]::NewGuid().ToString()
                [IO.File]::WriteAllText($temporary, ($document | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
                if (Test-Path -LiteralPath $item.File) { [IO.File]::Replace($temporary,$item.File,[NullString]::Value) } else { [IO.File]::Move($temporary,$item.File) }
                $path = Join-Path $registryRoot $item.Name
                New-Item -Path $path -Force | Out-Null
                Set-Item -LiteralPath $path -Value $item.File
            }
        }
    } catch {
        $failure = $_
        foreach ($file in $previous.Keys) { if ($null -ne $previous[$file]) { [IO.File]::WriteAllText($file,$previous[$file],[Text.UTF8Encoding]::new($false)) } elseif (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file } }
        foreach ($path in $paths) { if ($snapshot[$path].Exists) { New-Item -Path $path -Force | Out-Null; Set-Item -LiteralPath $path -Value $snapshot[$path].Value } elseif (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path } }
        throw $failure
    }
    Write-Output "NotebookAid bridge registration updated. Rollback snapshot: $backup"
}
