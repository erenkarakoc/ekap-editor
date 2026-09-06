# İcmal proje dosyası — v1 temel sözleşme

`icmal-file.ts` mevcut iki maliyet tablosu için ortak saklama modelini doğrular; ZIP içinde tek UTF-8 `project.json` girdisi üretir/okur. Model iki maliyet ekranındaki ortak dosya aç/dışa aktar araç çubuğuna bağlıdır.

- `format: icmal`, `version: 1`; proje kimliği/adı, oluşturma/değişiklik UTC zamanı, TRY para birimi.
- `costRows` ve `percentageRows` sıralı girdilerdir. Satır kimliği tablo içinde benzersizdir. Satır numarası sıra üzerinden yeniden türetilir.
- Miktar, fiyat ve oranlar noktalı ondalık metindir; bilimsel gösterim kabul edilmez. Decimal adaptörleri `toFixed()` kullanmalıdır. Eksik fiyat `null`, gerçek sıfır `"0"` olur. Mevcut ekranların eksik fiyat sunumu sonraki entegrasyonda ayrıca ele alınmalıdır.
- Kaynak sürüm/fiyat kimliği, orijinal tutar/birim, kurum/dönem/kitap ve kaynak bağlantısı/sayfası korunur. Bunlar provenans verisidir; sunucu yetkisi veya güvenilir kimlik doğrulaması değildir.
- Toplam, satır numarası ve `fromDatabase` saklanmaz. Toplamlar hesap motorundan, kaynak göstergesi kaynak verisinden türetilmelidir. Hesap yöntemi sürümü TEMEL-05 ile eklenmeden bu model hesap doğruluğu kabulü sayılmaz.
- Arşiv ve açılmış JSON en fazla 8 MiB; tablo başına 10.000 satır. Bu teknik dosya sınırıdır, abonelik proje kotası değildir. Akış gerçek açılmış boyutta durdurulur.
- Ek dosyalar, bilinmeyen alanlar ve sürümler reddedilir; tekrar kayıtta sessiz bilgi kaybı olmaz. Analiz, metraj, gider/kâr/teklif alanları henüz uygulanmadı; bunlar eklendiğinde açık sürüm geçişi ve eski dosya dönüşüm testleri gerekir. İlk sürümden önceki dosya formatı yoktur; eski sürüm dönüşümü henüz mevcut değildir.
- Okuma/yazma işlevleri ağ, kullanıcı oturumu veya dosya sistemi kullanmaz. `encodeProject` başarı sonucu diske kaydedildi anlamına gelmez. Atomik disk yazımı, iptal/hata, kapanış uyarısı, dosya başvurusu listesi ve Windows dosya ilişkisi sonraki alt iştir. `.icmal` ikonu mevcut `public/assets/images/brand/file_icon.svg` olacaktır.

Test: `node --test tests/icmal-file.test.mjs`. İki ekranın tarayıcı aç/indir kabulü geçti; gerçek masaüstü Kaydet/Farklı kaydet ve offline kabulü henüz yapılmadı.

`row-adapters.ts` mevcut tablo girdilerini tam hassasiyetle taşır. `ProjectFileToolbar` açılan dosyanın kullanılmayan diğer tablosunu korur. Ekranlar henüz ortak kalıcı oturum paylaşmaz; rota değişiminde otomatik kayıt veya yerel kopya oluşmaz. İndirme bildirimi dosyanın diske başarıyla yazıldığı anlamına gelmez.

## TEMEL-03.3 güncellemesi

Proje oturumu `ProjectSessionProvider` ile shell altında ortak bellektedir; iki maliyet ekranı aynı dosyayı düzenler. Önceki bağımsız ekran oturumu notları tarihsel durumdur. Electron'da sistem dosya seçicisi, token, Kaydet/Farklı kaydet/Ctrl+S, içerik hash çakışma kontrolü ve kapanış uyarısı uygulandı. `desktop/src/project-file-store.ts` geçici dosyayı flush edip hedefe geçirir; başka programla check/replace aralığını kilitlemez. Ağ diski/güç kesintisi kabulü yok. Web indirmesi dirty durumunu temizlemez; masaüstü başarılı yazım yalnız yazılan anlık görüntüyü temizler.

17 test ve kontrollü seçici yanıtlarıyla gerçek Electron IPC/disk gidiş-dönüş, ekran geçişi, çakışma/iptal/kapanış kabulü başarılı. Dağıtılmış kurulum, Yerel projeler listesi ve bağlantısız başlangıç henüz uygulanmadı/doğrulanmadı. Sıradaki TEMEL-03.4 bu başvuru/başlangıç akışıdır.
