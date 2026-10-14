[CmdletBinding()]
param([Parameter(Mandatory)][string]$BackupDirectory)
$ErrorActionPreference = 'Stop'
$backup = [IO.Path]::GetFullPath($BackupDirectory)
$record = Get-Content -LiteralPath (Join-Path $backup 'backup.json') -Raw | ConvertFrom-Json
if ($record.owner -ne 'NotebookAid.Installation.v1') { throw 'Unowned installation backup.' }
$helper = Join-Path $backup 'files\NotebookAid.SetupSupport.exe'
if (!(Test-Path -LiteralPath $helper)) { throw 'This backup has no setup recovery helper.' }
$expected = $record.hashes.'NotebookAid.SetupSupport.exe'
if ((Get-FileHash -LiteralPath $helper -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw 'Recovery helper hash mismatch.' }
if ($record.scope -eq 'machine' -and !([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Use an administrator PowerShell for an all-users installation.' }
& $helper restore $record.root $record.scope $backup
if ($LASTEXITCODE -ne 0) { throw 'Program recovery stopped. Keep all backup directories and review the reported reason.' }
Write-Output 'Program files and native bridge registrations restored. Notebook data was not changed. Run the retained matching installer again to repair Windows uninstall information.'
