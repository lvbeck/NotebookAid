param(
    [Parameter(Mandatory=$true)][string]$InstallerPath,
    [Parameter(Mandatory=$true)][string]$Version,
    [Parameter(Mandatory=$true)][string]$Publisher,
    [Parameter(Mandatory=$true)][string]$Sha256,
    [Parameter(Mandatory=$true)][string]$Root,
    [switch]$Install,
    [int]$ParentProcessId = 0
)
$ErrorActionPreference = 'Stop'
$lock = $null
try {
    if ($Version -notmatch '^\d+\.\d+\.\d+$' -or $Sha256 -notmatch '^[a-f0-9]{64}$' -or $Publisher.Length -gt 256 -or !$Publisher.Trim()) { throw 'Invalid update identity.' }
    $Root = [IO.Path]::GetFullPath($Root).TrimEnd('\')
    $InstallerPath = [IO.Path]::GetFullPath($InstallerPath)
    if ([IO.Path]::GetFileName($InstallerPath) -ne "NotebookAid-$Version-Setup-x64.msi") { throw 'Unexpected MSI filename.' }
    foreach ($item in @($InstallerPath, $Root)) {
        for ($current = $item; $current; $current = [IO.Path]::GetDirectoryName($current)) {
            if ((Test-Path -LiteralPath $current) -and ((Get-Item -LiteralPath $current -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Linked update paths are not allowed.' }
        }
    }
    $installation = Get-Content -LiteralPath (Join-Path $Root 'installation.json') -Raw | ConvertFrom-Json
    if ($installation.owner -ne 'NotebookAid.Installation.v1' -or $installation.installer -ne 'msi' -or $installation.scope -notin @('user','machine')) { throw 'The installed application is not an MSI installation.' }
    $lock = [IO.File]::Open($InstallerPath, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    if ((Get-FileHash -LiteralPath $InstallerPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $Sha256) { throw 'MSI checksum mismatch.' }
    $signature = Get-AuthenticodeSignature -LiteralPath $InstallerPath
    if ($signature.Status -ne 'Valid' -or !$signature.SignerCertificate -or $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) -cne $Publisher) { throw 'The MSI signature or publisher could not be verified.' }
    $installer = New-Object -ComObject WindowsInstaller.Installer
    $database = $installer.OpenDatabase($InstallerPath, 0)
    foreach ($entry in @(@{Name='ProductName';Value='NotebookAid'},@{Name='ProductVersion';Value=$Version},@{Name='UpgradeCode';Value='{2A38E827-A9E4-4B31-A9D5-ED345CB44129}'})) {
        $view = $database.OpenView("SELECT ``Value`` FROM ``Property`` WHERE ``Property`` = '$($entry.Name)'"); $view.Execute(); $record = $view.Fetch()
        if (!$record -or $record.StringData(1) -cne $entry.Value) { throw 'The MSI product identity does not match NotebookAid.' }
        $view.Close(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($view)
    }
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($database)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($installer)
    if (!$Install) { Write-Output 'NotebookAid MSI update verified.'; exit 0 }
    if ($ParentProcessId -le 0) { throw 'Missing parent application process.' }
    $parent = Get-Process -Id $ParentProcessId -ErrorAction SilentlyContinue
    if ($parent -and !$parent.WaitForExit(60000)) { throw 'NotebookAid did not exit; the update was not started.' }
    $arguments = '/i "' + $InstallerPath + '" /norestart INSTALLFOLDER="' + $Root + '"'
    $arguments += if ($installation.scope -eq 'machine') { ' ALLUSERS=1' } else { ' ALLUSERS=2 MSIINSTALLPERUSER=1' }
    $start = [Diagnostics.ProcessStartInfo]::new((Join-Path $env:WINDIR 'System32/msiexec.exe'), $arguments)
    $start.UseShellExecute = $true
    if ($installation.scope -eq 'machine') { $start.Verb = 'runas' }
    $process = [Diagnostics.Process]::Start($start); $process.WaitForExit()
    if ($process.ExitCode -notin @(0, 1602, 3010)) { throw "Windows Installer returned $($process.ExitCode)." }
} catch {
    if ($Install) { Add-Type -AssemblyName System.Windows.Forms; [void][Windows.Forms.MessageBox]::Show($_.Exception.Message, 'NotebookAid update') }
    else { [Console]::Error.WriteLine($_.Exception.Message) }
    exit 1
} finally { if ($lock) { $lock.Dispose() } }
