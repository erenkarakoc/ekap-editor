# EKAP Editör

Web, Electron ve ileride mobil istemciler için ortak Supabase Auth + RLS + RPC
altyapısını kullanan ihale araçları uygulaması.

## Yerel geliştirme

1. `.env.example` dosyasını `.env.local` olarak kopyalayın.
2. Yalnız `NEXT_PUBLIC_SUPABASE_URL` ve
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini girin.
3. `npm install` ve ardından `npm run dev` çalıştırın.

Supabase secret/service-role anahtarı bu repoda veya Electron paketinde
kullanılmaz. Yetkili işlemler kullanıcı JWT'sini doğrulayan RLS ve RPC
fonksiyonlarıyla korunur.

## Veritabanı

Migrationlar `supabase/migrations/` altındadır. Hedef proje ref'i
`tmvdvqjdytuwhbkcgldi` olarak `supabase/config.toml` içinde tanımlıdır.

```powershell
npx supabase login
npx supabase link --project-ref tmvdvqjdytuwhbkcgldi
npx supabase db push
```

İlk admin hesabı migration içinde `erenkarakocw@gmail.com` olarak atanır.
Migration sonrasında rolün yeni JWT'ye gelmesi için uygulamadan çıkış yapıp
yeniden giriş yapın.

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

- `RELEASES_TOKEN` (`ekap-editor-releases` deposuna release yazabilen dar kapsamlı token)

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

Repository variable olarak `EKAP_WEB_URL` hosted HTTPS uygulama adresine
ayarlanır. Boş bırakılırsa Electron yerel standalone paketi kullanır.

Windows kod imzalama sertifikası SmartScreen güveni ve indirilen güncellemenin
yayıncı doğrulaması için zorunludur. Yeni sürüm çıkarmadan önce
`desktop/package.json` sürümünü artırın; `main` dalındaki auto-tag workflow'u
etiketi, release workflow'u imzalı kurulum paketlerini üretir.
