param([string]$Root,[string]$Mode)
$global:MockBridgeRecords = @{}
$global:MockBridgeWrites = 0
$registryRoot = 'HKCU:\Software\Mozilla\NativeMessagingHosts\'
$legacy = $registryRoot + 'de.zub_systems.notebookaid_t02'
$current = $registryRoot + 'de.zub_systems.notebookaid'
$manifest = Join-Path $Root 'native-host.json'
$global:MockBridgeRecords[$legacy] = $manifest
if ($Mode -eq 'foreign') { $global:MockBridgeRecords[$current] = 'C:\Other\native-host.json' }
function Test-Path { param([string]$LiteralPath,[string]$Path) $p=if($LiteralPath){$LiteralPath}else{$Path}; if(-not $p){throw ('Missing mock path: '+$args+' literal='+$LiteralPath+' path='+$Path)}; if($p.StartsWith('HKCU:')){return $global:MockBridgeRecords.ContainsKey($p)}; Microsoft.PowerShell.Management\Test-Path -LiteralPath $p }
function Get-Item { param([string]$LiteralPath,[string]$Path) $p=if($LiteralPath){$LiteralPath}else{$Path}; if(-not $p){throw ('Missing mock path: '+$args+' literal='+$LiteralPath+' path='+$Path)}; if($p.StartsWith('HKCU:')){$object=[pscustomobject]@{MockValue=$global:MockBridgeRecords[$p]}; $object | Add-Member -MemberType ScriptMethod -Name GetValue -Value {param($name) $this.MockValue}; return $object}; Microsoft.PowerShell.Management\Get-Item -LiteralPath $p }
function New-Item { param([string]$Path,[string]$ItemType,[switch]$Force) if($Path.StartsWith('HKCU:')){if(-not $global:MockBridgeRecords.ContainsKey($Path)){$global:MockBridgeRecords[$Path]=$null};return}; Microsoft.PowerShell.Management\New-Item -Path $Path -ItemType $ItemType -Force:$Force }
function Set-Item { param([string]$LiteralPath,[string]$Value) $global:MockBridgeWrites++;if($Mode -eq 'failure' -and $global:MockBridgeWrites -eq 2){throw 'Injected registry failure'};$global:MockBridgeRecords[$LiteralPath]=$Value }
function Remove-Item { param([string]$LiteralPath) if($LiteralPath.StartsWith('HKCU:')){$global:MockBridgeRecords.Remove($LiteralPath);return}; Microsoft.PowerShell.Management\Remove-Item -LiteralPath $LiteralPath }
$errorText=$null
try { & (Join-Path $Root 'Register-Bridge.ps1') -WhatIf:($Mode -eq 'whatif') | Out-Null; if ($Mode -eq 'cleanup') { & (Join-Path $Root 'Register-Bridge.ps1') -RemoveLegacy | Out-Null } } catch {$errorText=$_.Exception.Message + ' | ' + $_.ScriptStackTrace}
[pscustomobject]@{Error=$errorText;Registry=$global:MockBridgeRecords;Manifest=(Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json);LegacyExists=(Microsoft.PowerShell.Management\Test-Path -LiteralPath (Join-Path $Root 'native-host-legacy.json'));Backups=@(Microsoft.PowerShell.Management\Get-ChildItem -LiteralPath (Join-Path $Root 'bridge-backups') -ErrorAction SilentlyContinue).Count} | ConvertTo-Json -Depth 8
