$ErrorActionPreference = 'Stop'
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
if (-not $request.publisher -or $request.version -notmatch '^\d+\.\d+\.\d+$' -or @($request.files).Count -lt 2) { throw 'Invalid signature verification request.' }
foreach ($file in $request.files) {
    $signature = Get-AuthenticodeSignature -LiteralPath $file
    if ($signature.Status -ne 'Valid' -or -not $signature.SignerCertificate) { throw "Invalid or missing signature: $([IO.Path]::GetFileName($file))" }
    $publisher = $signature.SignerCertificate.GetNameInfo([Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
    if ($publisher -cne $request.publisher) { throw 'Signing publisher mismatch.' }
    if ([IO.Path]::GetExtension($file) -eq '.msi') {
        $installer = New-Object -ComObject WindowsInstaller.Installer
        $database = $installer.OpenDatabase($file, 0)
        foreach ($property in @('ProductVersion', 'ProductName', 'UpgradeCode')) {
            $view = $database.OpenView("SELECT ``Value`` FROM ``Property`` WHERE ``Property``='$property'")
            $view.Execute()
            $record = $view.Fetch()
            $value = if ($record) { $record.StringData(1) } else { '' }
            $view.Close()
            $expected = switch ($property) { 'ProductVersion' { $request.version } 'ProductName' { 'NotebookAid' } 'UpgradeCode' { '{2A38E827-A9E4-4B31-A9D5-ED345CB44129}' } }
            if ($value -ine $expected) { throw "MSI $property mismatch." }
        }
    } else {
        $info = (Get-Item -LiteralPath $file).VersionInfo
        if ($info.ProductName -ne 'NotebookAid' -or $info.ProductVersion -notin @($request.version, ($request.version + '.0'))) { throw 'Executable product/version mismatch.' }
    }
}
Write-Output 'All update signatures, publishers and product versions verified.'
