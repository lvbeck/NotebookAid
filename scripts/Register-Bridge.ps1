[CmdletBinding(SupportsShouldProcess)]
param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$packageRoot = $PSScriptRoot
$hostName = 'de.zub_systems.notebookaid_t02'
$registryPath = "HKCU:\Software\Mozilla\NativeMessagingHosts\$hostName"
$manifestPath = Join-Path $packageRoot 'native-host.json'
if ($Remove) {
    if (Test-Path -LiteralPath $registryPath) {
        $currentValue = (Get-Item -LiteralPath $registryPath).GetValue('')
        if ($currentValue -ne $manifestPath) { throw 'The registration belongs to another package. No changes were made.' }
        if ($PSCmdlet.ShouldProcess($registryPath, 'Remove NotebookAid T02 bridge registration')) { Remove-Item -LiteralPath $registryPath }
    }
    Write-Output 'NotebookAid T02 bridge registration removed. Application and test data were retained.'
    return
}
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'NotebookAid.exe'))) { throw 'Run this script from the extracted test package.' }
if (-not (Test-Path -LiteralPath (Join-Path $packageRoot 'NotebookAid.Bridge.exe'))) { throw 'Bridge executable is missing.' }
if (Test-Path -LiteralPath $registryPath) {
    $existingValue = (Get-Item -LiteralPath $registryPath).GetValue('')
    if ($existingValue -ne $manifestPath) { throw 'A different T02 package is already registered. Remove its registration first.' }
}
if ($PSCmdlet.ShouldProcess($registryPath, 'Register NotebookAid T02 Native Messaging host for the current user')) {
    $manifest = @{ name=$hostName; description='NotebookAid T02 bridge'; path=(Join-Path $packageRoot 'NotebookAid.Bridge.exe'); type='stdio'; allowed_extensions=@('notebookaid-t02@zub-systems.de') }
    [System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
    New-Item -Path $registryPath -Force | Out-Null
    Set-Item -LiteralPath $registryPath -Value $manifestPath
    Write-Output 'Registered for the current user. Keep this extracted package in place during testing.'
}
