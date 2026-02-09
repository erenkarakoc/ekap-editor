# OskaPlus — Sadece İhtiyaç Duyulan Veriler

Bu dokümanda sadece **resmi birim fiyat kitapları**, **poz listeleri**, ve bunlarla doğrudan ilişkili referans tabloları açıklanmaktadır. Kullanıcı tarafından oluşturulan proje verileri, hakediş verileri, raporlar, sistem/kullanıcı tabloları bu dokümana dahil değildir.

---

## Kitap (Book) Sistemi

Her poz bir **kitaba** (`knt` kolonu) aittir. Kitap numarası, pozun hangi resmi birim fiyat kaynağından geldiğini belirtir.

### Kitap Numaraları ve İsimleri

| knt | Kitap Adı | Poz Önek Örneği | Açıklama |
|-----|-----------|-----------------|----------|
| `6` | **Çevre, Şehircilik ve İklim Değişikliği Bakanlığı — Yapı İşleri** | `15.xxx`, `16.xxx` | Ana inşaat işleri (beton, demir, sıva, boya, çatı, vb.) |
| `7` | **Çevre, Şehircilik ve İklim Değişikliği Bakanlığı — Rayiçler** | `04.xxx`, `10.xxx`, `19.xxx` | Malzeme ve işçilik rayiç (birim) fiyatları |
| `3` | **Karayolları Genel Müdürlüğü (KGM)** | `KGM/xxxxx` | Yol, köprü, asfalt, kazı işleri |
| `17` | **Tesisat — Mekanik (Isıtma/Soğutma)** | `25.2xx` | Kalorifer, radyatör, kollektör, pompa |
| `18` | **Tesisat — Elektrik** | `35.1xx` | Aydınlatma, priz, kablo, elektrik sortileri |
| `20` | **Tesisat — Sıhhi (Su/Boru)** | `25.3xx` | Su boruları, boru montajı |
| `22` | **Tesisat — Sıhhi Gereçler** | `25.1xx` | Lavabo, klozet, eviye, batarya, musluk |
| `24` | **Tesisat — Telefon Santral** | `35.7xx` | Telefon santralleri |
| `26` | **Tesisat — Telefon/Haberleşme** | `35.5xx` | Telefon tesisatı, dağıtım kutuları |
| `32` | **Devlet Su İşleri (DSİ)** | `03.xxx`, `04.xxx` | Baraj, sulama, su yapıları, iş makineleri |
| `33` | **DSİ — Ek Pozlar** | `04.xxx` | DSİ ek pozları |
| `35` | **Yangın Tesisatı** | `25.7xx` | Yangın dolapları, söndürme |
| `40` | **İller Bankası** | `3500+` | Altyapı (kanalizasyon, içme suyu) |
| `41` | **İller Bankası — Yapı** | `05.YAxx` | İller Bankası yapı işleri |
| `45` | **Enerji ve Tabii Kaynaklar** | `17.xxx` | Enerji tesisleri |
| `58` | **Makine/Ekipman Rayiçleri** | `10.xxx/MK` | Makine ve ekipman fiyatları |
| `72` | **Özel İmalatlar / Su Yalıtımı** | `48.xxx` | Su yalıtımı, özel imalatlar |
| `74` | **Peyzaj / Çevre Düzenleme** | `77.xxx` | Peyzaj, çevre düzenleme işleri |
| `75` | **Altyapı / Kanalizasyon** | `16.xxx` | Altyapı, kanalizasyon |
| `81` | **Vakıflar Genel Müdürlüğü (Restorasyon)** | `04.V0xx`, `V.xxxx` | Tarihi eser restorasyon pozları |
| `82` | **Vakıflar — Rayiçler** | `10.xxx` | Restorasyon malzeme rayiçleri |
| `84` | **Vakıflar — Özel** | `3931` | Vakıflar özel pozları |
| `85` | **Vakıflar — İşçilik** | `V.xxxx` | Tarihi eser işçilik pozları |
| `86` | **Orman Genel Müdürlüğü** | `04.xxx` | Orman yolları, ağaçlandırma |
| `87` | **Köy Hizmetleri / KHGM** | `04.xxx` | Köy altyapı işleri |
| `88` | **Ek Pozlar / Diğer** | `15.xxx/H` | Çeşitli ek pozlar |

### Kitap Ayırt Etme Yöntemi

Bir pozun hangi kitaba ait olduğu **`knt`** kolonu ile belirlenir. `knt` her tabloda bulunur ve kitap numarasını tutar.

---

## İhtiyaç Duyulan Tablolar

### 1. `veri2060` — Resmi Poz Listesi (Ana Kitap - Fiyatlı)
**592 satır** (şu an sadece kitap 85 dolu)

Ana resmi birim fiyat kitabı. Her pozun **yıllara göre birim fiyatlarını** içerir.

| Kolon | Açıklama |
|-------|----------|
| `poz` | Poz numarası |
| `knt` | **Kitap numarası** (hangi kuruma ait) |
| `yapiscins` | İşin tanımı |
| `olcu` | Ölçü birimi (m, m², m³, kg, Ton, Adet) |
| `nak` | Nakliyeli poz mu? (N = evet) |
| `tip` | Tip kodu |
| `tiptan` | Tip açıklaması |
| `bf40`–`bf50` | **Birim fiyat** yıllara göre (40=2040 değil, dahili dönem kodu) |
| `mf40`–`mf50` | **Malzeme fiyatı** yıllara göre |
| `df40`–`df50` | **İşçilik fiyatı** yıllara göre |
| `ypoz` | Eski/alternatif poz numarası |
| `anh` | Hesap numarası (bölge: 1=Genel, 2=İstanbul Rumeli, 3=İstanbul Anadolu) |
| `derece`, `derece1` | Hiyerarşi seviyesi |
| `abpoz` | Ana/bağlı poz |
| `uzuntan` | Uzun tanım |
| `ysart` | Yapım şartnamesi |

### 2. `veri2013` — Nakliye Katsayıları (Referans)
**10,043 satır**

Her pozun nakliye mesafe katsayılarını tutar (`nak01`–`nak80`). Kitap + bölge bazlı.

| Kolon | Açıklama |
|-------|----------|
| `anh` | Bölge (1=Genel, 2=İst. Rumeli, 3=İst. Anadolu) |
| `poz` | Poz numarası |
| `knt` | **Kitap numarası** |
| `ypoz` | Eski poz numarası |
| `yapiscins` | İşin tanımı |
| `olcu` | Ölçü birimi |
| `nak01`–`nak80` | Mesafe bazlı nakliye katsayıları |

### 3. `veri2014` — Referans Metraj/Ölçüm Verileri
**240 satır**

Pozların standart metraj hesaplama şablonları.

| Kolon | Açıklama |
|-------|----------|
| `anh` | Bölge |
| `sutun` | Nakliye kolon adı (NAK03, NAK04, vb.) |
| `poz` | Poz numarası |
| `yapiscins` | Tanım |
| `olcu` | Ölçü |
| `km` | Mesafe (km) |
| `yog` | Yoğunluk |
| `formul` | Hesap formülü |
| `aratop`–`aratop4` | Ara toplamlar |
| `knt` | Kontrol kodu |

### 4. `veri2015` — Poz Tip Sınıflandırması
**16,060 satır**

Her pozun tipini (Malzeme, İşçilik, vb.) belirler.

| Kolon | Açıklama |
|-------|----------|
| `poz` | Poz numarası |
| `tip` | Tip kodu (1=Malzeme, 2=İşçilik, vb.) |
| `tan2` | Tip açıklaması ("Malzeme", "İşçilik") |

### 5. `veri2020` — Poz İlişkileri / Çapraz Referans
**25,166 satır** (en büyük tablo)

Pozlar arası bağımlılıkları ve ilişkileri tanımlar (bir analiz pozunun alt pozlarını, bir pozun hangi pozlarla ilişkili olduğunu).

| Kolon | Açıklama |
|-------|----------|
| `anapoz` | Ana poz numarası |
| `poz` | İlişkili/alt poz numarası |
| `knt` | Kitap numarası |
| `durumu` | Durum |
| `anapozknt` | Ana pozun kitap numarası |
| `anapozdurumu` | Ana pozun durumu |

### 6. `veri2017` — ÜFE/TÜFE Endeks Verileri
**378 satır**

Fiyat farkı hesaplamalarında kullanılan resmi endeks verileri (aylık).

| Kolon | Açıklama |
|-------|----------|
| `yil` | Yıl |
| `ay` | Ay (1-12) |
| `aystr` | Ay adı (Ocak, Şubat, ...) |
| `ufeg` | ÜFE Genel endeks |
| `l` | L katsayısı |
| `au` | AU değeri |
| `mk` | MK değeri |
| `ufe0001`–`ufe0124` | Sektör bazlı ÜFE alt endeksleri |

### 7. `veri2200` — Bölge Tanımları
**3 satır**

| anh | tan (Bölge Adı) |
|-----|-----------------|
| 1 | Genel (Çevre ve Şehircilik) |
| 2 | İstanbul (Rumeli) |
| 3 | İstanbul (Anadolu) |

### 8. `veri2206` — Boru/Profil Ağırlık Tablosu
**5,635 satır**

Boru ve profil demir ağırlık referans tablosu.

| Kolon | Açıklama |
|-------|----------|
| `kalinlik` | Kalınlık |
| `olcu` | Ölçü |
| `agirlik` | Ağırlık |
| `aciklama` | Açıklama |
| `yuzey` | Yüzey alanı |
| `bsl` | Başlık |
| `anh` | Bölge |

### 9. `veri2061` — Rapor Şablonları (RTF)
**477 satır**

Hakediş/rapor belge şablonlarını RTF formatında tutar. İhtiyacınız olabilir eğer belge üretimi yapacaksanız.

| Kolon | Açıklama |
|-------|----------|
| `dizin` | Şablon kodu (ör: "005", "1-004") |
| `baslik` | Şablon adı (ör: "Hakediş İcmali", "Metraj Cetveli") |
| `data` | RTF içerik |
| `size` | Boyut |

---

## Özet: Hangi Tablo Ne İçin?

```
Poz Listesi + Fiyatlar     → veri2060 (ana kaynak, yıllık fiyatlarla)
Poz Tip Bilgisi             → veri2015 (Malzeme mi, İşçilik mi?)
Poz İlişkileri              → veri2020 (hangi poz hangi pozla ilişkili)
Nakliye Katsayıları         → veri2013 (mesafe bazlı katsayılar)
Nakliye Hesap Şablonları    → veri2014 (metraj formülleri)
ÜFE/TÜFE Endeksleri         → veri2017 (fiyat farkı hesabı için)
Bölge Tanımları             → veri2200 (3 bölge: Genel, İst. Rumeli, İst. Anadolu)
Boru/Profil Ağırlıkları     → veri2206 (teknik referans)
Rapor Şablonları            → veri2061 (RTF belge şablonları)
```

## Önemli Not: Kitap Verisi Eksikliği

Şu an `veri2060` tablosunda sadece **kitap 85** (Vakıflar İşçilik, 592 poz) dolu. Diğer kitapların pozları (`veri2001`, `veri2050`, `veri2120`) **boş**. Bu kitapların verileri büyük ihtimalle güncellemelerle (`updatelist` tablosu üzerinden) çekilecek veya ayrıca yüklenmesi gerekecek.

Ancak `veri2013` tablosunda **tüm kitapların** nakliye verileri mevcut (10,043 satır), bu da kitap yapısının tam olarak tanımlı olduğunu gösteriyor.
