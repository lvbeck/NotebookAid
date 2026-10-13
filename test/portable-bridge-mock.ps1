param([string]$Root,[string]$Mode)
$ErrorActionPreference='Stop'
$target=Join-Path $Root 'portable'
$global:MockRegistry=@{}
foreach($entry in @(@{Name='de.zub_systems.notebookaid';File='native-host.json'},@{Name='de.zub_systems.notebookaid_t02';File='native-host-legacy.json'})) {
    if($Mode -eq 'both' -or ($Mode -eq 'current' -and $entry.File -eq 'native-host.json')) {$global:MockRegistry['HKCU:\Software\Mozilla\NativeMessagingHosts\'+$entry.Name]=Join-Path $target $entry.File}
    elseif($Mode -eq 'foreign'){$global:MockRegistry['HKCU:\Software\Mozilla\NativeMessagingHosts\'+$entry.Name]='C:\Other\native-host.json'}
}
function Test-Path {param([string]$LiteralPath)if($LiteralPath.StartsWith('HKCU:')){return $global:MockRegistry.ContainsKey($LiteralPath)};Microsoft.PowerShell.Management\Test-Path -LiteralPath $LiteralPath}
function Get-Item {param([string]$LiteralPath,[switch]$Force)if($LiteralPath.StartsWith('HKCU:')){$item=[pscustomobject]@{Value=$global:MockRegistry[$LiteralPath]};$item|Add-Member ScriptMethod GetValue {param($name)$this.Value};return $item};Microsoft.PowerShell.Management\Get-Item -LiteralPath $LiteralPath -Force:$Force}
function Get-Process {param($Name,$ErrorAction)}
function Get-FileHash {param([string]$LiteralPath,[string]$Algorithm)$stream=[IO.File]::OpenRead($LiteralPath);$hash=[Security.Cryptography.SHA256]::Create();try{[pscustomobject]@{Hash=[BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-','')}}finally{$stream.Dispose();$hash.Dispose()}}
$source=Get-Content -LiteralPath 'scripts/Prepare-TestPortable.ps1' -Raw
$source=$source.Replace('$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ''..''))','$workspace = '''+$Root.Replace("'","''")+'''')
$source=$source.Replace('C:\Softwares\NotebookAid-win32-x64',$target).Replace("@('C:\Softwares', `$target)","@('$Root', `$target)")
& ([scriptblock]::Create($source))
