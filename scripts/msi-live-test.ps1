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
$userTarget = Join-Path $job ('NotebookAid space ' + [char]0x4e2d + [char]0x6587)
$machineTarget = Join-Path $env:ProgramFiles ('NotebookAid MSI Test ' + [Guid]::NewGuid().ToString('N'))
$hostNames = @('de.zub_systems.notebookaid','de.zub_systems.notebookaid_t02')
$identity = 'Software\NotebookAid\MSI'
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
[ComImport, Guid("000214F9-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface NativeMsiTestShellLink {
    [PreserveSig] int GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder path, int length, IntPtr data, uint flags);
}
public static class NativeMsiTestPaths {
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern uint GetLongPathName(string path, StringBuilder result, uint length);
    public static string Expand(string path) {
        var result = new StringBuilder(32768);
        uint length = GetLongPathName(path, result, (uint)result.Capacity);
        if (length == 0 || length >= result.Capacity) throw new System.IO.IOException("Cannot normalize shortcut target: " + path);
        return result.ToString();
    }
    public static string ShortcutTarget(string path) {
        object link = Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("00021401-0000-0000-C000-000000000046")));
        try {
            ((System.Runtime.InteropServices.ComTypes.IPersistFile)link).Load(path, 0);
            var target = new StringBuilder(32768);
            int result = ((NativeMsiTestShellLink)link).GetPath(target, target.Capacity, IntPtr.Zero, 4);
            if (result != 0 || target.Length == 0) throw new System.IO.IOException("Cannot read Unicode shortcut target.");
            return target.ToString();
        } finally { Marshal.FinalReleaseComObject(link); }
    }
}
'@
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
    $data = Get-Content -LiteralPath (Join-Path $Target 'installation.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($data.owner -ne 'NotebookAid.Installation.v1' -or $data.installer -ne 'msi' -or $data.scope -ne $Scope) { throw 'Wrong MSI installation metadata.' }
    foreach ($file in @('NotebookAid.exe','NotebookAid.Bridge.exe','NotebookAid.Passkey.exe','NotebookAid.SetupSupport.exe')) {
        if (!(Test-Path -LiteralPath (Join-Path $Target $file))) { throw "Installed application resource missing: $file" }
    }
    $hive = if ($Scope -eq 'machine') {'HKLM'} else {'HKCU'}
    $installer = New-Object -ComObject WindowsInstaller.Installer
    $products = @($installer.RelatedProducts('{2A38E827-A9E4-4B31-A9D5-ED345CB44129}'))
    if ($products.Count -ne 1) { throw "Expected one MSI product in the upgrade family; found $($products.Count)." }
    if ($installer.ProductInfo($products[0], 'InstalledProductName') -ne 'NotebookAid' -or $installer.ProductInfo($products[0], 'VersionString') -ne $ExpectedVersion) { throw 'MSI registered product name or version is incorrect.' }
    $menu = [Environment]::GetFolderPath($(if ($Scope -eq 'machine') {'CommonPrograms'} else {'Programs'}))
    $desktop = [Environment]::GetFolderPath($(if ($Scope -eq 'machine') {'CommonDesktopDirectory'} else {'DesktopDirectory'}))
    $shortcut = Join-Path $menu 'NotebookAid.lnk'
    if (!(Test-Path -LiteralPath $shortcut) -or (Test-Path -LiteralPath (Join-Path $desktop 'NotebookAid.lnk'))) { throw 'MSI shortcut selection or scope is incorrect.' }
    $actualTarget = [NativeMsiTestPaths]::ShortcutTarget($shortcut)
    $expectedTarget = Join-Path $Target 'NotebookAid.exe'
    if ([NativeMsiTestPaths]::Expand($actualTarget) -ne [NativeMsiTestPaths]::Expand($expectedTarget)) { throw "MSI Start menu shortcut target is incorrect: $actualTarget; expected $expectedTarget" }
    foreach ($name in $hostNames) {
        $key = $hive + ':\Software\Mozilla\NativeMessagingHosts\' + $name
        $manifest = (Get-Item -LiteralPath $key).GetValue('')
        if (!$manifest.StartsWith($Target + '\')) { throw 'MSI bridge scope or path is incorrect.' }
        $document = Get-Content -LiteralPath $manifest -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($document.name -ne $name -or $document.path -ne (Join-Path $Target 'NotebookAid.Bridge.exe')) { throw 'Invalid MSI bridge manifest.' }
    }
}
$userArgs = 'ALLUSERS=2 MSIINSTALLPERUSER=1 INSTALLDESKTOPSHORTCUT=0 INSTALLSTARTMENUSHORTCUT=1 INSTALLFOLDER="' + $userTarget + '"'
$machineArgs = 'ALLUSERS=1 INSTALLDESKTOPSHORTCUT=0 INSTALLSTARTMENUSHORTCUT=1 INSTALLFOLDER="' + $machineTarget + '"'
function Assert-RolledBack([string]$Target, [string]$Hive) {
    foreach ($file in @('NotebookAid.exe','installation.json','native-host.json','native-host-legacy.json')) {
        if (Test-Path -LiteralPath (Join-Path $Target $file)) { throw "Fresh installation rollback left a file: $file" }
    }
    foreach ($name in $hostNames) {
        $key = $Hive + ':\Software\Mozilla\NativeMessagingHosts\' + $name
        if ((Test-Path -LiteralPath $key) -and (Get-Item -LiteralPath $key).GetValue('')) { throw 'Fresh rollback left a native bridge registration.' }
    }
    $installer = New-Object -ComObject WindowsInstaller.Installer
    if (@($installer.RelatedProducts('{2A38E827-A9E4-4B31-A9D5-ED345CB44129}')).Count -ne 0) { throw 'Fresh rollback left an installed MSI product.' }
}
function Assert-FixtureFailure {
    $log = Join-Path $job ("msi-$script:counter.log")
    if (!(Select-String -LiteralPath $log -SimpleMatch 'CustomAction FixtureFailure returned actual error code 1603' -Quiet)) { throw 'The rollback fixture did not reach its deferred failure action.' }
}
Run-Msi '/i' $failedPackage $userArgs $true
Assert-FixtureFailure
Assert-RolledBack $userTarget HKCU
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
Assert-FixtureFailure
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
Run-Msi '/i' $failedPackage $machineArgs $true
Assert-FixtureFailure
Assert-RolledBack $machineTarget HKLM
Run-Msi '/i' $package $machineArgs
Assert-Installed $machineTarget machine $version
Run-Msi '/i' $failedPackage $machineArgs $true
Assert-FixtureFailure
Assert-Installed $machineTarget machine $version
Run-Msi '/fa' $package $machineArgs
Assert-Installed $machineTarget machine $version
Run-Msi '/x' $package $machineArgs
if ((Test-Path -LiteralPath (Join-Path $machineTarget 'NotebookAid.exe')) -or (Test-Path -LiteralPath ('HKLM:\' + $identity))) { throw 'Machine uninstall failed.' }
[ordered]@{version=$version;currentUser=$true;allUsers=$true;upgradeSynthetic=$true;reinstall=$true;repair=$true;rollback=$true;machineRollback=$true;freshRollback=$true;machineFreshRollback=$true;downgradeRejected=$true;crossScopeRejected=$true;foreignStatePreserved=$true;shadowedBridgeRejected=$true;stableProductName=$true;unsignedUpdateRejected=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $job 'report.json')
Get-Content -LiteralPath (Join-Path $job 'report.json')
