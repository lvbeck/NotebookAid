param([string]$Package)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content (Join-Path $workspace 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
if (-not $Package) { $Package = Join-Path $workspace "release/msi/NotebookAid-$version-Setup-x64.msi" }
$Package = [IO.Path]::GetFullPath($Package)
if (-not $Package.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar)) { throw 'MSI verification must remain inside the workspace.' }
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class MsiLocalizationProbe {
    [DllImport("msi.dll", CharSet=CharSet.Unicode)] public static extern uint MsiEnableLog(uint mode, string path, uint attributes);
    [DllImport("msi.dll", CharSet=CharSet.Unicode)] public static extern uint MsiOpenPackageEx(string path, uint options, out uint handle);
    [DllImport("msi.dll", CharSet=CharSet.Unicode)] public static extern uint MsiSetProperty(uint handle, string name, string value);
    [DllImport("msi.dll", CharSet=CharSet.Unicode)] public static extern uint MsiGetProperty(uint handle, string name, StringBuilder value, ref uint size);
    [DllImport("msi.dll", CharSet=CharSet.Unicode)] public static extern uint MsiDoAction(uint handle, string action);
    [DllImport("msi.dll")] public static extern uint MsiCloseHandle(uint handle);
    [DllImport("msi.dll")] public static extern uint MsiSetInternalUI(uint level, IntPtr window);
    public static string Get(uint handle, string name) {
        var value=new StringBuilder(32768); uint size=32768;
        if(MsiGetProperty(handle,name,value,ref size)!=0) throw new Exception("Cannot read MSI localization property.");
        return value.ToString();
    }
}
'@
$data = Get-Content (Join-Path $workspace 'installer/msi/locales.json') -Raw -Encoding UTF8 | ConvertFrom-Json
New-Item -ItemType Directory -Path (Join-Path $workspace 'output/msi-localization') -Force | Out-Null
[MsiLocalizationProbe]::MsiEnableLog(0x3FFF, (Join-Path $workspace 'output/msi-localization/probe.log'), 0) | Out-Null
$oldUi = [MsiLocalizationProbe]::MsiSetInternalUI(2, [IntPtr]::Zero)
[uint32]$session = 0
try {
    if ([MsiLocalizationProbe]::MsiOpenPackageEx($Package, 0, [ref]$session) -ne 0) { throw 'Cannot open MSI for localization verification.' }
    foreach ($entry in $data.PSObject.Properties) {
        $locale = $entry.Name
        if ([MsiLocalizationProbe]::MsiSetProperty($session, 'NA_LANGUAGE', $locale) -ne 0) { throw 'Cannot select MSI language.' }
        # Only the property-only localization action runs; no installation sequence is invoked.
        $actionResult = [MsiLocalizationProbe]::MsiDoAction($session, 'LocalizeUI')
        if ($actionResult -ne 0) { throw "MSI localization failed: $locale / $actionResult" }
        for ($index = 0; $index -lt $entry.Value.Count; $index++) {
            if ([MsiLocalizationProbe]::Get($session, "NA_TEXT_$index") -cne $entry.Value[$index]) { throw "MSI text mismatch: $locale / $index" }
        }
        if ([MsiLocalizationProbe]::Get($session, 'DefaultUIFont') -cne ('NAFont_' + $locale.Replace('-',''))) { throw "MSI font mismatch: $locale" }
        if ([MsiLocalizationProbe]::Get($session, 'NA_TITLE') -cne ('{\NATitle_' + $locale.Replace('-','') + '}')) { throw "MSI title font mismatch: $locale" }
    }
    [MsiLocalizationProbe]::MsiSetProperty($session, 'NA_LANGUAGE', 'invalid') | Out-Null
    if ([MsiLocalizationProbe]::MsiDoAction($session, 'LocalizeUI') -eq 0) { throw 'Invalid MSI language was accepted.' }
} finally {
    if ($session) { [MsiLocalizationProbe]::MsiCloseHandle($session) | Out-Null }
    [MsiLocalizationProbe]::MsiSetInternalUI($oldUi, [IntPtr]::Zero) | Out-Null
}
$report = [ordered]@{ version=$version; languages=@($data.PSObject.Properties.Name); textsPerLanguage=$data.en.Count; nativeActionVerified=$true; installationExecuted=$false; simplifiedChineseFont='Microsoft YaHei' }
$directory = Join-Path $workspace 'output/msi-localization'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$report | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $directory 'report.json') -Encoding UTF8
$report | ConvertTo-Json -Depth 4
