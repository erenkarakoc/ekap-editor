# İcmal

Web ve Electron için ortak Supabase Auth + RLS + RPC altyapısını kullanan
ihale araçları uygulaması. EKAP Editör özelliğinin asıl işi `.ekap` dosyalarını
açmak, düzenlemek ve kaydetmektir. Poz veritabanı, analiz ve diğer araçlar
gerektiğinde editöre yardımcı olur; dosya düzenlemek için maliyet projesi
oluşturmak gerekmez.

Yeni geliştirme oturumunda [kök yapılacaklar](../YAPILACAKLAR.md),
[son durum](../DURUM.md) ve [LLM çalışma protokolü](../CALISMA_PROTOKOLU.md)
okunur. Bu klasör ayrı Git deposudur.

## Yerel geliştirme

1. `.env.example` dosyasını `.env.local` olarak kopyalayın.
2. Yalnız `NEXT_PUBLIC_SUPABASE_URL` ve
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini girin.
3. `npm install` ve ardından `npm run dev` çalıştırın.

Supabase secret/service-role anahtarı bu repoda veya Electron paketinde
kullanılmaz. Yetkili işlemler kullanıcı JWT'sini doğrulayan RLS ve RPC
fonksiyonlarıyla korunur.

## Veritabanı

Tek migration yazma kaynağı [üst çalışma alanındaki dizindir](../supabase/migrations).
Bu uygulamanın `supabase/migrations/` klasörü tarihsel kopyadır;
[şema kaynağı açıklaması](supabase/README.md) geçerlidir. Şema işlemleri üst
çalışma alanından ve seçilen görevin kapsamıyla yürütülür. Yerel dosya, test
sonucu ve bağlı ortamın migration kaydı ayrı doğrulanır.

Rol değişikliği sonrasında yeni JWT'nin alınması gerekir; uygulamadan çıkış
yapıp yeniden giriş yapın. Hesap kimlikleri ve gizli değerler dokümana eklenmez.

## Admin iş akışı

`/admin` yalnız `app_metadata.role = admin` olan hesaplara açıktır. Önerilen
sıra:

1. Aktif IBAN ekleyin.
2. Standart ve Pro aylık/yıllık fiyatlarını açın.
3. Paket özelliklerini atayın; başlangıçta hepsi kapalıdır.
4. Kurum, katalog, kitap/fasikül ve dönem yayını oluşturun.
5. JSON, CSV veya XLSX poz dosyasını doğrulayıp aktarın.

Poz satırlarında `POZ`, `DESCRIPTION`, `UNIT`, `UNIT_PRICE`, `MONTAGE_PRICE`,
`DEMONTAGE_PRICE`, `CATEGORY`, `SUB_CATEGORY`, `BUY_PLACE` ve `NOTE` başlıkları
desteklenir. `BOOK`, `BOOK_YEAR`, `BOOK_MONTH` ve `BOOK_LINK` bilgileri satırdan
tekrarlanmak yerine aktarım sihirbazındaki yayın kaydında tutulur.

## Web, masaüstü ve mobil mimari

- Hosted Next.js uygulaması web istemcisidir.
- Electron production'da `desktop/app-config.json` içindeki HTTPS `webUrl`
  adresini açar. Değer boşsa paketlenmiş yerel Next.js sunucusuna geri döner.
- Gelecekteki iOS/Android istemcileri aynı Supabase Auth, RLS, Storage ve RPC
  sözleşmelerini kullanır.

## Electron otomatik güncelleme

`electron-updater`, GitHub Releases üzerindeki `latest.yml` ve kurulum
dosyalarını kullanır. Kullanıcı profil menüsünden güncellemeyi elle denetleyebilir;
yeni sürüm kullanıcıya sunulur, indirme onayından sonra ilerleme uygulama içinde
gösterilir ve kullanıcı onayıyla yeniden başlatılarak kurulur. Uygulama açıldıktan
kısa süre sonra da sessiz bir sürüm denetimi yapılır.

Yayınlama için GitHub Actions variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Yayınlama için GitHub Actions secrets:

- `RELEASES_TOKEN` (`icmal-releases` deposuna release yazabilen dar kapsamlı token)

Kişisel geliştirici için önerilen imzalama yöntemi SSL.com IV Code Signing +
eSigner Cloud Signing'dir. Bu yöntemde ayrıca şu secrets gerekir:

- `ESIGNER_MODE`
- `ESIGNER_USERNAME`
- `ESIGNER_PASSWORD`
- `ESIGNER_TOTP_SECRET`

Alternatif olarak aktarılabilir bir PFX sertifikası varsa
`WINDOWS_CERTIFICATE_BASE64` ve `WINDOWS_CERTIFICATE_PASSWORD` kullanılabilir.
Release iş akışı hiçbir imzalama yöntemi yoksa veya üretilen Authenticode imzası
geçersizse yayınlamayı durdurur; imzasız güncelleme yayımlamaz.

Kapalı kaynak MVP dağıtımında self-signed imzalama da desteklenir. Bunun için
aynı PFX secrets'a ek olarak yalnız açık sertifikayı içeren
`WINDOWS_CERTIFICATE_PUBLIC_BASE64` secret'ı tanımlanır. Workflow açık
sertifikayı build runner'ın güven depolarına ekler, EXE'yi kalıcı PFX ile imzalar
ve release'e şu güven paketini koyar:

- `EKAP-Editor-Code-Signing.cer`
- `Install-EKAPEditorCertificate.ps1`
- `Uninstall-EKAPEditorCertificate.ps1`
- `EKAP-Editor-SHA256.txt`

Kullanıcı önce SHA1 parmak izini `EKAP-Editor-SHA256.txt` ile karşılaştırmalı,
sonra sertifika ve kurulum script'i aynı klasördeyken script'i çalıştırmalıdır.
Geçerli yayıncı sertifikasının SHA1 parmak izi
`1E5D19112C6D86600107E9C05EE60021BF260A8E` değeridir ve kurulum/kaldırma
script'leri yalnız bu sertifikayı kabul eder.
Self-signed sertifika yalnız bu güven işleminin yapıldığı Windows hesaplarında
doğrulanır. Genel SmartScreen itibarı sağlamaz ve sertifikaya güven vermek,
sertifikanın özel anahtarıyla imzalanan tüm kodlara güvenmek anlamına gelir.

Repository variable olarak `EKAP_WEB_URL` hosted HTTPS uygulama adresine
ayarlanır. Boş bırakılırsa Electron yerel standalone paketi kullanır.

Windows kod imzalama sertifikası SmartScreen güveni ve indirilen güncellemenin
yayıncı doğrulaması için zorunludur. Yeni sürüm çıkarmadan önce
`desktop/package.json` sürümünü artırın; `main` dalındaki auto-tag workflow'u
etiketi, release workflow'u imzalı kurulum paketlerini üretir.
