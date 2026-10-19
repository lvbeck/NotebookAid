param([string]$Root)
$ErrorActionPreference = 'Stop'
$tokens = $null; $errors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path (Get-Location) 'scripts/Prepare-TestPortable.ps1'), [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Portable script syntax error' }
$definition = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Test-ExternalMcpBrokerProcess' }, $true)
. ([scriptblock]::Create($definition.Extent.Text))
$target = Join-Path $Root 'portable'
$external = Join-Path $Root 'installed/NotebookAid.exe'
$sibling = Join-Path $Root 'portable-other/NotebookAid.exe'
foreach ($file in @($external, $sibling, (Join-Path $target 'NotebookAid.exe'))) {
    New-Item -ItemType Directory -Path (Split-Path $file) -Force | Out-Null
    [IO.File]::WriteAllText($file, 'fixture')
}
function Record([int]$Id, [int]$Parent, [string]$Path, [string]$Arguments) {
    [pscustomobject]@{ Name='NotebookAid.exe'; ProcessId=$Id; ParentProcessId=$Parent; ExecutablePath=$Path; CommandLine=$Arguments }
}
function Check([bool]$Value, [string]$Name) { if (-not $Value) { throw $Name } }
$broker = Record 10 1 $external '--mcp-stdio --profile fixture'
$child = Record 11 10 $external '--type=renderer'
$map = @{ 10=$broker; 11=$child }
Check (Test-ExternalMcpBrokerProcess $broker $map $target) 'External broker rejected'
Check (Test-ExternalMcpBrokerProcess $child $map $target) 'External broker child rejected'
$gui = Record 20 1 $external '--background'
Check (-not (Test-ExternalMcpBrokerProcess $gui @{20=$gui} $target)) 'Real application was ignored'
$portable = Record 30 1 (Join-Path $target 'NotebookAid.exe') '--mcp-stdio'
Check (-not (Test-ExternalMcpBrokerProcess $portable @{30=$portable} $target)) 'Target broker was ignored'
Check (-not (Test-ExternalMcpBrokerProcess $null @{} $target)) 'Unknown process was ignored'
$unknown = Record 40 1 '' '--mcp-stdio'
Check (-not (Test-ExternalMcpBrokerProcess $unknown @{40=$unknown} $target)) 'Unknown path was ignored'
$orphan = Record 41 999 $external '--type=renderer'
Check (-not (Test-ExternalMcpBrokerProcess $orphan @{41=$orphan} $target)) 'Unverified child was ignored'
$fake = Record 42 1 $external '--mcp-stdio-other'
Check (-not (Test-ExternalMcpBrokerProcess $fake @{42=$fake} $target)) 'Partial flag matched'
$cycle = Record 43 43 $external '--mcp-stdio'
Check (-not (Test-ExternalMcpBrokerProcess $cycle @{43=$cycle} $target)) 'Cyclic tree matched'
$other = Record 44 1 $sibling '--mcp-stdio'
Check (Test-ExternalMcpBrokerProcess $other @{44=$other} $target) 'Separate sibling path rejected'
$helper = Record 45 10 $external '--mcp-stdio'; $helper.Name = 'NotebookAid.McpCrypt.exe'
Check (-not (Test-ExternalMcpBrokerProcess $helper @{10=$broker;45=$helper} $target)) 'Native helper was ignored'
@{ checks=11; externalBrokerOnly=$true; targetAndGuiBlocked=$true; unknownFailsClosed=$true } | ConvertTo-Json -Compress
