[CmdletBinding()]
param(
  [string]$CertificatePath = (Join-Path $PSScriptRoot 'EKAP-Editor-Code-Signing.cer')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $CertificatePath -PathType Leaf)) {
  throw "Sertifika bulunamadı: $CertificatePath"
}

$resolvedPath = (Resolve-Path -LiteralPath $CertificatePath).Path
$certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new($resolvedPath)
$expectedThumbprint = '1E5D19112C6D86600107E9C05EE60021BF260A8E'

if ($certificate.Subject -ne 'CN=EKAP Editor') {
  throw "Beklenmeyen sertifika sahibi: $($certificate.Subject)"
}

if ($certificate.Thumbprint -ne $expectedThumbprint) {
  throw "Beklenmeyen sertifika parmak izi: $($certificate.Thumbprint)"
}

$codeSigningOid = '1.3.6.1.5.5.7.3.3'
$hasCodeSigningEku = $certificate.Extensions |
  Where-Object { $_ -is [Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension] } |
  ForEach-Object { $_.EnhancedKeyUsages } |
  Where-Object Value -eq $codeSigningOid

if (-not $hasCodeSigningEku) {
  throw 'Bu sertifika kod imzalama amacı taşımıyor.'
}

Write-Host ''
Write-Host 'EKAP Editör self-signed yayıncı sertifikası'
Write-Host "Sahip       : $($certificate.Subject)"
Write-Host "Parmak izi  : $($certificate.Thumbprint)"
Write-Host "Geçerlilik  : $($certificate.NotBefore) - $($certificate.NotAfter)"
Write-Host ''
Write-Warning 'Bu işlem sertifikaya imzalanan uygulamalara bu Windows hesabında güven verir.'
$confirmation = Read-Host 'Parmak izini yayın sayfasındaki EKAP-Editor-SHA256.txt ile karşılaştırdınız mı? Devam için EVET yazın'

if ($confirmation -cne 'EVET') {
  throw 'Sertifika kurulumu kullanıcı tarafından iptal edildi.'
}

Import-Certificate -FilePath $resolvedPath -CertStoreLocation Cert:\CurrentUser\Root | Out-Null
Import-Certificate -FilePath $resolvedPath -CertStoreLocation Cert:\CurrentUser\TrustedPublisher | Out-Null

Write-Host 'Sertifika bu Windows hesabı için güvenilir kök ve güvenilir yayıncı depolarına kuruldu.'
