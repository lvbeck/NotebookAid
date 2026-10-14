$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$version = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
if ($version -notmatch '^[0-9A-Za-z.-]+$') { throw 'Invalid source version.' }
$output = Join-Path $root "release\NotebookAid-$version-source.zip"
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$files = @(& git -C $root ls-files --cached --others --exclude-standard) | Sort-Object -Unique
if ($LASTEXITCODE -ne 0) { throw 'Cannot enumerate source files.' }
$stream = [IO.File]::Open($output, [IO.FileMode]::Create)
$zip = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($name in $files) {
        if ($name -match '(^|/)(\.git|node_modules|output|release|dist|\.cache|\.env)(/|\.|$)' -or $name -match '^scripts/t15a-shell-probe/' -or $name -match '^assets/notebookaid-note\.(svg|ico)$') { continue }
        $file = [IO.Path]::GetFullPath((Join-Path $root $name))
        if (!$file.StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe source path.' }
        if (!(Test-Path -LiteralPath $file -PathType Leaf)) { continue }
        if ((Get-Item -LiteralPath $file).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Linked source rejected.' }
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, 'NotebookAid-source/' + $name.Replace('\','/'), [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $zip.Dispose(); $stream.Dispose() }
Get-FileHash -LiteralPath $output -Algorithm SHA256
