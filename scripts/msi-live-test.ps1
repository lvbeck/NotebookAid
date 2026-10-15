$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') { throw 'Run MSI installation tests only on a disposable GitHub Actions runner.' }
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
$parts = $version.Split('.') | ForEach-Object { [int]$_ }
$older = "$($parts[0]).$($parts[1]).$($parts[2]-1)"
$newer = "$($parts[0]).$($parts[1]).$($parts[2]+1)"
$package = Join-Path $workspace "release/msi/NotebookAid-$version-Setup-x64.msi"
$oldPackage = Join-Path $workspace "output/msi-fixtures/older/NotebookAid-$older-Setup-x64.msi"
$failedPackage = Join-Path $workspace "output/msi-fixtures/failure/NotebookAid-$newer-Setup-x64.msi"
$job = Join-Path $workspace ('output/msi-live/' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $job -Force | Out-Null
$userTarget = Join-Path $job 'NotebookAid space 中文'
$machineTarget = Join-Path $env:ProgramFiles ('NotebookAid MSI Test ' + [Guid]::NewGuid().ToString('N'))
$hostNames = @('de.zub_systems.notebookaid','de.zub_systems.notebookaid_t02')
$identity = 'Software\NotebookAid\MSI'
foreach ($hive in @('HKCU','HKLM')) {
    if (Test-Path -LiteralPath ($hive + ':\' + $identity)) { throw 'Existing MSI installation must not be changed.' }
    if (Test-Path -LiteralPath ($hive + ':\Software\Microsoft\Windows\CurrentVersion\Uninstall\1585ae4a-41ea-4f85-aa30-75cf234c17ac')) { throw 'Existing NSIS installation must not be changed.' }
    foreach ($name in $hostNames) { if (Test-Path -LiteralPath ($hive + ':\Software\Mozilla\NativeMessagingHosts\' + $name)) {
        if ((Get-Item -LiteralPath ($hive + ':\Software\Mozilla\NativeMessagingHosts\' + $name)).GetValue('')) { throw 'An existing bridge must not be changed by MSI tests.' }
    } }
}
$counter = 0
function Run-Msi([string]$Mode, [string]$File, [string]$Arguments, [bool]$Failure = $false) {
    $script:counter++
    $log = Join-Path $job ("msi-$script:counter.log")
    $start = [Diagnostics.ProcessStartInfo]::new((Join-Path $env:WINDIR 'System32/msiexec.exe'), ($Mode + ' "' + $File + '" /qn /norestart /l*v "' + $log + '" ' + $Arguments))
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true; $start.WindowStyle = 'Hidden'
    $process = [Diagnostics.Process]::Start($start)
    if (!$process.WaitForExit(240000)) { throw "Windows Installer exceeded the timeout: $log" }
    if ($Failure) { if ($process.ExitCode -eq 0) { throw "Expected MSI rejection: $log" } }
    elseif ($process.ExitCode -notin @(0,3010)) { throw "MSI returned $($process.ExitCode): $log" }
}
function Assert-Installed([string]$Target, [string]$Scope, [string]$ExpectedVersion) {
    $data = Get-Content -LiteralPath (Join-Path $Target 'installation.json') -Raw | ConvertFrom-Json
    if ($data.owner -ne 'NotebookAid.Installation.v1' -or $data.installer -ne 'msi' -or $data.scope -ne $Scope) { throw 'Wrong MSI installation metadata.' }
    if (!(Test-Path -LiteralPath (Join-Path $Target 'NotebookAid.exe'))) { throw 'Installed application missing.' }
    $hive = if ($Scope -eq 'machine') {'HKLM'} else {'HKCU'}
    $entries = @(Get-ChildItem ($hive + ':\Software\Microsoft\Windows\CurrentVersion\Uninstall') | ForEach-Object {Get-ItemProperty -LiteralPath $_.PSPath} | Where-Object {$_.DisplayName -like 'NotebookAid*'})
    if ($entries.Count -ne 1 -or $entries[0].DisplayName -ne 'NotebookAid' -or $entries[0].DisplayVersion -ne $ExpectedVersion -or $entries[0].WindowsInstaller -ne 1) { throw 'MSI uninstall identity, name or version is incorrect.' }
    foreach ($name in $hostNames) {
        $key = $hive + ':\Software\Mozilla\NativeMessagingHosts\' + $name
        $manifest = (Get-Item -LiteralPath $key).GetValue('')
        if (!$manifest.StartsWith($Target + '\')) { throw 'MSI bridge scope or path is incorrect.' }
        $document = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
        if ($document.name -ne $name -or $document.path -ne (Join-Path $Target 'NotebookAid.Bridge.exe')) { throw 'Invalid MSI bridge manifest.' }
    }
}
$userArgs = 'ALLUSERS=2 MSIINSTALLPERUSER=1 INSTALLDESKTOPSHORTCUT=0 INSTALLSTARTMENUSHORTCUT=1 INSTALLFOLDER="' + $userTarget + '"'
$machineArgs = 'ALLUSERS=1 INSTALLDESKTOPSHORTCUT=0 INSTALLSTARTMENUSHORTCUT=1 INSTALLFOLDER="' + $machineTarget + '"'
# Older and failure packages contain synthetic program files; they are not historical release binaries.
Run-Msi '/i' $oldPackage $userArgs
Assert-Installed $userTarget user $older
Run-Msi '/i' $package $userArgs
Assert-Installed $userTarget user $version
Run-Msi '/i' $package $userArgs
Assert-Installed $userTarget user $version
$verifyArgs = 'msi-verify "' + $package + '" ' + $version + ' "Jin Lu" ' + (Get-FileHash -LiteralPath $package).Hash.ToLowerInvariant() + ' "' + $userTarget + '"'
$verifyStart = [Diagnostics.ProcessStartInfo]::new((Join-Path $userTarget 'NotebookAid.SetupSupport.exe'), $verifyArgs)
$verifyStart.UseShellExecute = $false; $verifyStart.CreateNoWindow = $true; $verifyStart.RedirectStandardError = $true
$verifyProcess = [Diagnostics.Process]::Start($verifyStart); $verifyError = $verifyProcess.StandardError.ReadToEnd(); $verifyProcess.WaitForExit()
if ($verifyProcess.ExitCode -ne 1 -or $verifyError -notmatch 'Authenticode signature is not trusted') { throw 'The native MSI updater must reject the unsigned test package.' }
Remove-Item -LiteralPath (Join-Path $userTarget 'NotebookAid-LICENSE.txt')
Run-Msi '/fa' $package $userArgs
if (!(Test-Path -LiteralPath (Join-Path $userTarget 'NotebookAid-LICENSE.txt'))) { throw 'MSI repair failed.' }
Run-Msi '/i' $failedPackage $userArgs $true
Assert-Installed $userTarget user $version
Run-Msi '/i' $oldPackage $userArgs $true
Assert-Installed $userTarget user $version
Run-Msi '/i' $package $machineArgs $true
Assert-Installed $userTarget user $version
# Unowned files and a bridge subsequently registered elsewhere must survive uninstall.
$preserved = Join-Path $userTarget 'keep-user-file.txt'; Set-Content -LiteralPath $preserved -Value 'Synthetic preservation fixture.'
$foreignKey = 'HKCU:\Software\Mozilla\NativeMessagingHosts\' + $hostNames[0]
$foreign = Join-Path $job 'foreign-host.json'
Set-Content -LiteralPath $foreign -Value '{}'
Set-Item -LiteralPath $foreignKey -Value $foreign
Run-Msi '/x' $package $userArgs
if (!(Test-Path -LiteralPath $preserved) -or (Get-Item -LiteralPath $foreignKey).GetValue('') -ne $foreign -or (Test-Path -LiteralPath (Join-Path $userTarget 'NotebookAid.exe'))) { throw 'Uninstall failed to preserve unowned state.' }
Run-Msi '/i' $package $machineArgs $true
if ((Get-Item -LiteralPath $foreignKey).GetValue('') -ne $foreign) { throw 'All-user install changed a shadowing user bridge.' }
Remove-Item -LiteralPath $foreignKey
Run-Msi '/i' $package $machineArgs
Assert-Installed $machineTarget machine $version
Run-Msi '/i' $failedPackage $machineArgs $true
Assert-Installed $machineTarget machine $version
Run-Msi '/fa' $package $machineArgs
Assert-Installed $machineTarget machine $version
Run-Msi '/x' $package $machineArgs
if ((Test-Path -LiteralPath (Join-Path $machineTarget 'NotebookAid.exe')) -or (Test-Path -LiteralPath ('HKLM:\' + $identity))) { throw 'Machine uninstall failed.' }
[ordered]@{version=$version;currentUser=$true;allUsers=$true;upgradeSynthetic=$true;reinstall=$true;repair=$true;rollback=$true;machineRollback=$true;downgradeRejected=$true;crossScopeRejected=$true;foreignStatePreserved=$true;shadowedBridgeRejected=$true;stableProductName=$true;unsignedUpdateRejected=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $job 'report.json')
Get-Content -LiteralPath (Join-Path $job 'report.json')
