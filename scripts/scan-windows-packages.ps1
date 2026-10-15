param([string[]]$Files)
$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (-not $Files) {
    $version = (Get-Content (Join-Path $workspace 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
    $Files = @("release/installer/NotebookAid-$version-Setup-x64.exe", "release/msi/NotebookAid-$version-Setup-x64.msi", "release/NotebookAid-$version-win-x64.zip")
}
$directory = Join-Path $workspace 'output/package-security'
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$platform = Join-Path $env:ProgramData 'Microsoft/Windows Defender/Platform'
$engine = Get-ChildItem -LiteralPath $platform -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+-' } | Sort-Object { [version]($_.Name.Split('-')[0]) } -Descending | Select-Object -First 1
$scanner = if ($engine) { Join-Path $engine.FullName 'MpCmdRun.exe' } else { Join-Path $env:ProgramFiles 'Windows Defender/MpCmdRun.exe' }
if (-not (Test-Path -LiteralPath $scanner)) { throw 'Windows Defender scanner is unavailable; security scan cannot be reported as passed.' }
$results = @()
foreach ($file in $Files) {
    $resolved = [IO.Path]::GetFullPath((Join-Path $workspace $file))
    if (-not $resolved.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar) -or -not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw 'Invalid package scan path.' }
    $hash = (Get-FileHash -LiteralPath $resolved -Algorithm SHA256).Hash.ToLowerInvariant()
    $log = Join-Path $directory ([IO.Path]::GetFileName($resolved) + '.log')
    & $scanner -Scan -ScanType 3 -File $resolved -DisableRemediation *> $log
    $scanResult = $LASTEXITCODE
    $results += [ordered]@{ file=$file; sha256=$hash; exitCode=$scanResult; remediationEnabled=$false }
    if ($scanResult -ne 0) {
        $results | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $directory 'report.json') -Encoding UTF8
        throw "Package scan failed or detected a threat; inspect $log."
    }
}
[ordered]@{ engine=[IO.Path]::GetDirectoryName($scanner); results=$results; chromeSafeBrowsingVerdict='Not determined by this scan' } | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $directory 'report.json') -Encoding UTF8
