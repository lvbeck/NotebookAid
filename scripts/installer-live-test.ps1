$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content -LiteralPath (Join-Path $workspace 'package.json') -Raw | ConvertFrom-Json).version
$installer = Join-Path $workspace "release\installer\NotebookAid-$version-Setup-x64.exe"
$job = Join-Path $workspace ('output\installer-live\' + [Guid]::NewGuid().ToString('N'))
$target = [IO.Path]::GetFullPath((Join-Path $job 'NotebookAid space 中文'))
if (!$target.StartsWith((Join-Path $workspace 'output\installer-live') + '\')) { throw 'Unexpected live test target.' }
if (Get-Process -Name NotebookAid,NotebookAid.Bridge,NotebookAid.Passkey -ErrorAction SilentlyContinue) { throw 'Exit NotebookAid and helpers before the live installer test.' }
$appKey = 'HKCU:\Software\1585ae4a-41ea-4f85-aa30-75cf234c17ac'
$uninstallKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\1585ae4a-41ea-4f85-aa30-75cf234c17ac'
if ((Test-Path $appKey) -or (Test-Path $uninstallKey)) { throw 'An existing installed NotebookAid must not be modified by this test.' }
New-Item -ItemType Directory -Path $job -Force | Out-Null
$keys = @('de.zub_systems.notebookaid','de.zub_systems.notebookaid_t02') | ForEach-Object { 'HKCU:\Software\Mozilla\NativeMessagingHosts\' + $_ }
$before = @{}
foreach ($key in $keys) { $before[$key] = if (Test-Path -LiteralPath $key) { (Get-Item -LiteralPath $key).GetValue('') } else { $null } }
$before | Export-Clixml -LiteralPath (Join-Path $job 'bridge-before.clixml')
$shortcut = Join-Path ([Environment]::GetFolderPath('Programs')) 'NotebookAid.lnk'
$shortcutBackup = Join-Path $job 'start-menu-before.lnk'
if (Test-Path -LiteralPath $shortcut) { Copy-Item -LiteralPath $shortcut -Destination $shortcutBackup }
$env:NOTEBOOKAID_SETUP_TEST_BACKUPS = Join-Path $job 'program-backups'
function Run-Setup([string]$File, [string]$Arguments) {
    $start = [Diagnostics.ProcessStartInfo]::new($File, $Arguments)
    $start.UseShellExecute = $false; $start.CreateNoWindow = $true; $start.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
    $process = [Diagnostics.Process]::Start($start)
    if (!$process.WaitForExit(120000)) { throw 'Installer exceeded timeout; it was not force-stopped.' }
    if ($process.ExitCode -ne 0) { throw "Installer returned $($process.ExitCode)." }
}
function Assert-InstalledEntry {
    foreach ($name in @('NotebookAid.xpi','NotebookAid-Compatibility.xpi')) {
        $file = Join-Path $target $name
        if (!(Test-Path -LiteralPath $file) -or (Get-FileHash -LiteralPath $file).Hash -ne (Get-FileHash -LiteralPath (Join-Path $workspace ('release/' + $name))).Hash) { throw "NSIS installed addon missing or mismatched: $name" }
    }
    $entry = Get-ItemProperty -LiteralPath $uninstallKey
    if ($entry.DisplayName -ne 'NotebookAid' -or $entry.DisplayVersion -ne $version) { throw 'Installed application name or version is incorrect.' }
    $entries = @(Get-ChildItem 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall' | Where-Object {
        (Get-ItemProperty -LiteralPath $_.PSPath -ErrorAction SilentlyContinue).DisplayName -like 'NotebookAid*'
    })
    if ($entries.Count -ne 1) { throw 'Expected exactly one current-user NotebookAid uninstall entry.' }
}
try {
    Run-Setup $installer ('/S /currentuser /D=' + $target)
    if (!(Test-Path -LiteralPath (Join-Path $target 'NotebookAid.exe'))) { throw 'Installed executable missing.' }
    $installation = Get-Content -LiteralPath (Join-Path $target 'installation.json') -Raw | ConvertFrom-Json
    if ($installation.scope -ne 'user') { throw 'Wrong installation scope.' }
    foreach ($key in $keys) { if (!(Get-Item -LiteralPath $key).GetValue('').StartsWith($target + '\')) { throw 'Native bridge does not point to the live test installation.' } }
    $helper = Join-Path $target 'NotebookAid.SetupSupport.exe'
    & $helper check $target user
    if ($LASTEXITCODE -ne 0) { throw 'Installed program preflight failed.' }
    Assert-InstalledEntry
    # Simulate the previous version-suffixed uninstall entry before reinstalling.
    Set-ItemProperty -LiteralPath $uninstallKey -Name DisplayName -Value ('NotebookAid ' + $version)
    Run-Setup $installer ('/S /currentuser /D=' + $target)
    if (!(Test-Path -LiteralPath (Join-Path $target 'NotebookAid.exe'))) { throw 'Reinstallation failed.' }
    Assert-InstalledEntry
    $backupFiles = @(Get-ChildItem -LiteralPath $env:NOTEBOOKAID_SETUP_TEST_BACKUPS -Filter backup.json -Recurse)
    if ($backupFiles.Count -lt 2) { throw 'Reinstallation rollback copy missing.' }
    $uninstaller = Join-Path $target 'Uninstall NotebookAid.exe'
    Run-Setup $uninstaller '/S'
    for ($n = 0; $n -lt 200 -and ((Test-Path -LiteralPath (Join-Path $target 'NotebookAid.exe')) -or (Test-Path $appKey) -or (Test-Path $uninstallKey)); $n++) { Start-Sleep -Milliseconds 100 }
    if (Test-Path -LiteralPath (Join-Path $target 'NotebookAid.exe')) { throw 'Uninstaller did not remove the program.' }
    if ((Test-Path $appKey) -or (Test-Path $uninstallKey)) { throw 'Installer registry entries remain.' }
    [PSCustomObject]@{ version=$version; target=$target; installed=$true; addonsVerified=$true; reinstalled=$true; uninstalled=$true; nativeHosts=$true; stableUninstallName=$true; singleUserUninstallEntry=$true; backupCount=$backupFiles.Count; machineModeTested=$false } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $job 'report.json') -Encoding utf8
    Get-Content -LiteralPath (Join-Path $job 'report.json')
} finally {
    foreach ($key in $keys) {
        $current = if (Test-Path -LiteralPath $key) { (Get-Item -LiteralPath $key).GetValue('') } else { $null }
        if ($current -and !$current.StartsWith($target + '\') -and $current -ne $before[$key]) { throw 'External bridge registration changed during testing; do not overwrite it.' }
        if ($null -ne $before[$key]) { New-Item -Path $key -Force | Out-Null; Set-Item -LiteralPath $key -Value $before[$key] }
        elseif (Test-Path -LiteralPath $key) { Remove-Item -LiteralPath $key }
    }
    if (Test-Path -LiteralPath $shortcutBackup) { Copy-Item -LiteralPath $shortcutBackup -Destination $shortcut -Force }
    elseif (Test-Path -LiteralPath $shortcut) { Remove-Item -LiteralPath $shortcut }
    Remove-Item Env:\NOTEBOOKAID_SETUP_TEST_BACKUPS -ErrorAction SilentlyContinue
}
