# tauri.conf.json > bundle > windows > "signCommand": "powershell -ExecutionPolicy Bypass -Command \"$script='src-tauri/scripts/sign.ps1'; if (-not (Test-Path $script)) { $script='scripts/sign.ps1' }; & $script -filePath '{{path}}'\"",
param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path $FilePath)) {
    throw "File to sign not found: $FilePath"
}

$pfxB64 = $env:WINDOWS_CODESIGN_PFX_B64
$pfxPassword = $env:WINDOWS_CODESIGN_PFX_PASSWORD

if ([string]::IsNullOrWhiteSpace($pfxB64) -or [string]::IsNullOrWhiteSpace($pfxPassword)) {
    throw "Code signing secrets are missing. Provide WINDOWS_CODESIGN_PFX_B64 and WINDOWS_CODESIGN_PFX_PASSWORD."
}

$tempPfx = Join-Path $env:TEMP ("cyberapi-codesign-{0}.pfx" -f ([guid]::NewGuid()))

try {
    [IO.File]::WriteAllBytes($tempPfx, [Convert]::FromBase64String($pfxB64))
    $securePassword = ConvertTo-SecureString $pfxPassword -AsPlainText -Force

    $cert = Import-PfxCertificate -FilePath $tempPfx -Password $securePassword -CertStoreLocation Cert:\CurrentUser\My -Exportable |
        Select-Object -First 1

    if (-not $cert) {
        throw "Failed to import code signing certificate."
    }

    $thumbprint = $cert.Thumbprint
    $timestampUrl = "http://timestamp.digicert.com"

    & signtool sign /fd SHA256 /td SHA256 /tr $timestampUrl /sha1 $thumbprint $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "signtool sign failed with exit code $LASTEXITCODE"
    }

    & signtool verify /pa $FilePath
    if ($LASTEXITCODE -ne 0) {
        throw "signtool verify failed with exit code $LASTEXITCODE"
    }
}
finally {
    if (Test-Path $tempPfx) {
        Remove-Item $tempPfx -Force
    }
}
