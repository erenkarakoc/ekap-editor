[CmdletBinding()]
param(
  [string]$CertificatePath = (Join-Path $PSScriptRoot 'EKAP-Editor-Code-Signing.cer')
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $CertificatePath -PathType Leaf)) {
  throw "Sertifika bulunamadı: $CertificatePath"
}

$certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new(
  (Resolve-Path -LiteralPath $CertificatePath).Path
)
$expectedThumbprint = '1E5D19112C6D86600107E9C05EE60021BF260A8E'

if ($certificate.Subject -ne 'CN=EKAP Editor') {
  throw "Beklenmeyen sertifika sahibi: $($certificate.Subject)"
}

if ($certificate.Thumbprint -ne $expectedThumbprint) {
  throw "Beklenmeyen sertifika parmak izi: $($certificate.Thumbprint)"
}

Write-Host "Kaldırılacak sertifika parmak izi: $($certificate.Thumbprint)"
$confirmation = Read-Host 'Bu sertifikayı güven depolarından kaldırmak için KALDIR yazın'

if ($confirmation -cne 'KALDIR') {
  throw 'Sertifika kaldırma işlemi kullanıcı tarafından iptal edildi.'
}

foreach ($storeName in @('Root', 'TrustedPublisher')) {
  $store = [Security.Cryptography.X509Certificates.X509Store]::new(
    $storeName,
    [Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser
  )
  try {
    $store.Open([Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $matches = $store.Certificates.Find(
      [Security.Cryptography.X509Certificates.X509FindType]::FindByThumbprint,
      $certificate.Thumbprint,
      $false
    )
    foreach ($match in $matches) {
      $store.Remove($match)
    }
  } finally {
    $store.Close()
  }
}

Write-Host 'EKAP Editör self-signed sertifikası bu Windows hesabının güven depolarından kaldırıldı.'
