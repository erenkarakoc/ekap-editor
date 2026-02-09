# OskaPlus Database Structure

**Database:** `oskaplus` (PostgreSQL 15)
**Total Tables:** 463 (181 with data)
**Domain:** Turkish public construction/infrastructure project management — progress payments (hakediş), unit price analysis, measurement sheets, and contract management.

---

## Table Naming Convention

Tables follow a `veriXXXX` pattern where the number indicates the functional group:

| Range | Domain |
|-------|--------|
| `veri0001–0099` | Core project data (unit prices, analysis, measurements, transport, summaries) |
| `veri0100–0199` | Reports, forms, official documents, cover pages |
| `veri0200–0330` | Extended report/document variants (period-specific forms, additional calculations) |
| `veri0394–0480` | Supplementary data (pipe weights, special calculations) |
| `veri1005–1102` | System & administration (projects, users, roles, licenses, settings) |
| `veri2001–2220` | Reference/master data (official unit price books, transport tables, index data) |
| `veri3001–3004` | Location/work breakdown structure (mahal listesi) |
| `veri4001–4006` | Company info, personnel, currency rates |
| `veri9998–9999` | Item usage counters |
| `Veri0321/0322` | Category/group definitions |
| `Veri2202/9998/9999` | Capitalized variants (likely legacy) |

---

## Key Column Abbreviations (Turkish)

| Abbreviation | Turkish | English |
|---|---|---|
| `poz` | Poz numarası | Item/work code (official unit price number) |
| `ypoz` | Yardımcı poz | Alternate/old item code |
| `yapiscins` / `tanimi` | Yapı işi cinsi / Tanımı | Work description |
| `olcu` | Ölçü birimi | Unit of measure (m, m², m³, kg, Ton, Adet) |
| `bf` | Birim fiyat | Unit price |
| `mf` | Malzeme fiyat | Material price |
| `nak` | Nakliye | Transport/haulage |
| `anh` | Ana hesap numarası | Main account number (project folder ID) |
| `dizin` | Dizin | Directory/folder code (C1, C2, H3, H4, H5, H6) |
| `knt` | Kontrol | Control/book code |
| `hkno` | Hakediş numarası | Progress payment number |
| `miktar` | Miktar | Quantity |
| `tutar` | Tutar | Amount (total) |
| `fiyat` | Fiyat | Price |
| `aciklama` | Açıklama | Description/explanation |
| `ehak` / `ehaks` | E-Hakediş | E-progress payment values |
| `oran` | Oran | Ratio/rate |
| `ihzarat` | İhzarat | Advance material supply |
| `pur` | Pursantaj | Progress percentage |
| `tenzilat` | Tenzilat | Discount rate |
| `tm`, `bm`, `rv` | Toplam, Birim, Revize | Total, Unit, Revised (with period suffixes 01-03) |
| `mg1–mg10` | Mahaller/Gruplar | Location/group quantities |
| `derece` / `derece1` | Derece | Hierarchy level/depth |
| `yil` | Yıl | Year |
| `donem` | Dönem | Period |
| `ctreeid` / `cleft` / `cright` | — | Nested set tree (hierarchical structure) |
| `iscins` | İş cinsi | Type of work |
| `sozlesme` | Sözleşme | Contract |
| `kesif` | Keşif | Survey/estimate |
| `artan` / `azalan` | Artan / Azalan | Increasing / Decreasing |

---

## Core Project Tables (0001–0099)

### `veri0001` — Unit Price List (Birim Fiyat Listesi)
**133 columns, ~2,732 rows** — The main table. Each row is a construction work item in a project.

| Key Columns | Description |
|---|---|
| `poz`, `ypoz` | Official and alternate item codes |
| `yapiscins` | Work description (e.g., "C 30/37 hazır beton dökülmesi") |
| `olcu` | Unit of measure |
| `bf`, `bfx`, `mf` | Unit price, adjusted price, material price |
| `miktar`, `amiktar` | Quantity, approved quantity |
| `nak` | Transport flag |
| `oran` | Rate/ratio |
| `ihzarat` | Advance materials value |
| `tm01–tm03`, `bm01–bm03`, `rv01–rv03` | Total/unit/revised amounts per period |
| `mg1–mg10` | Quantities per location group |
| `n1poz–n5poz`, `n1oran–n5oran`, `n1bf–n5bf` | Transport item codes, rates, and prices |
| `dizin` | Project folder (C1, C2, H3...) |
| `yil`, `donem` | Year and period |
| `analiz`, `analiz_ok` | Analysis price, analysis completion flag |
| `doviz`, `dovizbf`, `dovizkod` | Foreign currency fields |
| `color`, `colors`, `font` | UI display properties |

### `veri0002` — Item Notes & Descriptions
**10 columns** — Extended descriptions, technical specifications, and English translations for items.

| Key Columns | Description |
|---|---|
| `poz` | Item code (FK to veri0001) |
| `notlar` | Notes |
| `ys` | Technical specification |
| `uzuntan` | Long description |
| `engbirim`, `engtanim`, `engys` | English unit, description, specification |

### `veri0003` — Analysis Summary (Analiz Özeti)
**49 columns, ~983 rows** — Summarized unit price analysis for each work item.

| Key Columns | Description |
|---|---|
| `poz`, `ypoz` | Item codes |
| `tanimi` | Description |
| `olcu` | Unit |
| `fiyat`, `fiyat1` | Calculated price, alternate price |
| `oran` | Rate |
| `ys`, `alt` | Specification, sub-analysis text |
| `anabf` | Main unit price |
| `mg1–mg10` | Group quantities |

### `veri0004` — Analysis Detail (Analiz Detayı)
**66 columns, ~7,008 rows** — Line-by-line breakdown of each analysis (materials, labor, equipment).

| Key Columns | Description |
|---|---|
| `poz` | Parent item code |
| `tip` | Type: `1` = Material (Malzeme), `2` = Labor (İşçilik), `3` = Equipment |
| `kodno` | Sub-item/resource code |
| `tanimi` | Resource description |
| `olcu` | Unit |
| `fiyat` | Resource unit price |
| `miktar` | Required quantity |
| `tutar` | Line total (fiyat × miktar) |
| `tan2` | Type label (Malzeme, İşçilik, etc.) |
| `bno`, `srno` | Block number, sort order |

### `veri0005` — Progress Payment Items (Hakediş Kalemleri)
**75 columns, ~1,130 rows** — Items in each progress payment with quantities and amounts.

| Key Columns | Description |
|---|---|
| `poz`, `ypoz`, `kod` | Item codes + progress payment code |
| `bf`, `bfx`, `mf` | Prices |
| `miktar`, `amiktar`, `nmiktar` | Current, approved, net quantities |
| `xmiktar`, `xpur` | Previous quantities, previous progress |
| `artan`, `azalan` | Increase / decrease amounts |
| `gecmiktar`, `gecpur` | Past quantity, past progress |
| `rmiktar`, `tmiktar` | Revised, total quantities |
| `is_artis_yuzde` | Work increase percentage |
| `ctreeid` | Tree ID (work breakdown link) |

### `veri0006` — Transport Coefficients (Nakliye Katsayıları)
**89 columns** — Transport rates per item with 80 distance-based coefficients (`nak01`–`nak80`).

### `veri0007` — Measurement Sheet (Metraj)
**53 columns, ~480 rows** — Detailed measurement/quantity calculation records.

| Key Columns | Description |
|---|---|
| `sutun` | Column identifier |
| `poz` | Item code |
| `formul`, `formul1` | Calculation formulas |
| `km` | Distance (km) |
| `akat`, `yog`, `cogu` | Weight, density, multiplication factor |
| `aratop`–`aratop4` | Subtotals |
| `fml`, `fml1` | Formula results |

### `veri0008` — Measurement Summary
**9 columns** — Condensed measurement records.

### `veri0009` — Price by Progress Payment Period
**9 columns** — Unit prices specific to each progress payment number (`hkno`).

---

## Project Structure & Summaries (0010–0099)

### `veri0010` — Work Groups (İş Grupları)
**21 columns** — Top-level work group definitions for each project.

| Key Columns | Description |
|---|---|
| `kod` | Group code |
| `yapiisim` | Group name |
| `ehak1`, `ehaks1–ehaks3` | E-progress payment values |
| `yuzdeartan/azalan`, `tutarartan/azalan` | Increase/decrease percentages and amounts |

### `veri0011` — Work Sub-Groups (İş Alt Grupları)
**45 columns** — Detailed work groups with contract and survey values.

| Key Columns | Description |
|---|---|
| `anakod`, `kod` | Parent code, group code |
| `yapiisim` | Name |
| `iscins` | Work type |
| `yuzde`, `tenzilat` | Percentage, discount |
| `sozlesme`, `kesif` | Contract value, survey value |
| `artan`, `azalan` | Increase, decrease |

### `veri0012` — Period Definitions
**11 columns** — Date/period definitions for progress payment calculations.

### `veri0013` — Progress Payment Group Summary
**16 columns** — Summary values per work group per progress payment.

### `veri0014` — Progress Payment Sub-Group Summary
**26 columns** — Detailed sub-group values per progress payment.

### `veri0015–veri0016` — Approval/Date Records
Control and date tracking tables.

### `veri0017` — Main Summary Calculations (Ana Hesap)
**36 columns** — Key financial summary with tenzilat (discount), totals, and approval flags.

| Key Columns | Description |
|---|---|
| `t11–t16` | Various total calculation fields |
| `tenzilat` | Discount rate |
| `onay` | Approval status |
| `t11tb`, `t11atgb` | Total with/without price differences |

### `veri0021–veri0024` — Official Document Forms
Structured data for official forms (cover pages, summary sheets) with numbered fields (`t50–t68`, `t80–t97`, `t90–t99`, etc.) and `onay` (approval) flags.

### `veri0025` — Per-Payment Summary
**56 columns** — Detailed totals for each progress payment number (`hkno`).

---

## Reports & Documents (0100–0199)

### `veri0042` — Extended Report Data
**116 columns** — Comprehensive report generation data.

### `veri0047` — Summary Report
**42 columns, ~872 rows** — Pre-calculated summary values for reporting.

### `veri0050–0058` — Various Report Templates
Different report format data (price comparisons, material summaries, etc.).

### `veri0091` — Wide Calculation Table
**826 columns** — Very wide table likely for period-based calculations across many columns.

### `veri0100` — Index/Price Escalation Table
**51 columns** — Price index (fiyat farkı / escalation) calculations.

### `veri0104` — Detailed Item Report
**23 columns, ~1,878 rows** — High-row-count reporting data.

### `veri0112` — Material Summary Report
**25 columns, ~1,304 rows** — Aggregated material data for reporting.

### `veri0128` — Work Progress Report
**36 columns, ~2,222 rows** — Detailed work progress tracking.

### `veri0134` — Financial Summary
**27 columns, ~872 rows** — Financial reporting data.

### `veri0149–0152` — Extended Report Variants
Various report calculation tables with high row counts.

---

## System & Administration (1005–1102)

### `veri1005` — Project/File Registry (Dosya Kayıtları)
**76 columns, ~6 rows** — Master project records. Each row is a project.

| Key Columns | Description |
|---|---|
| `hakedis` | Progress payment name |
| `sozlesme` | Contract name |
| `hakno` | Current progress payment number |
| `uygulama`, `uygulama_yil` | Application info, year |
| `tarih1`, `tarih2` | Date range |
| `tip`, `sehir` | Project type, city |
| `hostname`, `hostaddr`, `port` | Server connection info |
| `bulut`, `bulut_hash` | Cloud backup info |
| `surum`, `surumtar` | Version, version date |

### `veri1006` — Progress Payment Registry
**26 columns** — Registry of each progress payment with dates and status.

### `veri1007` — Users (Kullanıcılar)
**37 columns** — User accounts with credentials and settings.

| Key Columns | Description |
|---|---|
| `kodu`, `sifre` | User code, password |
| `adi`, `soyadi` | First name, last name |
| `tipi` | User type |
| `lisanskodu` | License code |
| `yonetici` | Admin flag |
| `islogin`, `lastlogintime` | Login status, last login |

### `veri1008` — Organizations/Departments
**13 columns** — Organizational hierarchy (parentid-based tree).

### `veri1009` — User-Role Assignments
**5 columns** — Maps users to roles.

### `veri1010` — Role-Permission Mapping
**5 columns** — Defines permissions per role.

### `veri1011` — Role Definitions
**5 columns** — Role names and descriptions.

### `veri1012` — File-Level Permissions
**14 columns** — Access control per project file with admin/delete/edit/list/view rights.

### `veri1016` — System/License Info
**13 columns** — License dates, hostname, and activation data.

### `veri1021–1022` — Tree Structures
**17–18 columns** — Nested set model trees (ctreeid, cleft, cright) for hierarchical data.

### `veri1025` — License Status
**11 columns** — Current license/subscription status.

### `veri1026` — Application Settings
**70 columns** — Comprehensive application configuration and preferences.

### `veri1100–1102` — Progress Payment Variants
Alternate progress payment structures (backup/archive).

---

## Reference / Master Data (2001–2220)

### `veri2001` — Official Unit Price Book (Birim Fiyat Kitabı)
**54 columns** — The master reference unit price list from official sources with prices across multiple periods (`bf40–bf45`, `mf40–mf45`, `df40–df45`).

### `veri2013` — Item Cross-Reference
**87 columns, ~10,043 rows** — Maps related/equivalent item codes between years or books.

| Key Columns | Description |
|---|---|
| `anapoz` | Main item code |
| `poz` | Related item code |
| `knt`, `durumu` | Control code, status |

### `veri2015` — Item Type Classification
**4 columns, ~16,060 rows** — Classifies items by type (Material, Labor, etc.).

### `veri2020` — Item Relationships
**7 columns, ~25,166 rows** — Largest table. Cross-references between items and their dependencies.

### `veri2050–2060` — Year-Specific Price Books
Same structure as `veri2001` but for different year ranges. Columns `bf23–bf50` represent prices for years 2023–2050.

### `veri2120` — Extended Multi-Year Prices
**120 columns** — Wide table with prices spanning many years (`bf23–bf50`, `mf23–mf50`, `df23–df50`).

### `veri2200` — Analysis Book Index
**3 columns** — Maps `anh` (account numbers) to names.

### `veri2201` — Reference Transport Rates
**87 columns** — Official transport coefficients (`nak01–nak80`) per item.

### `veri2202` — Reference Measurement Data
**47 columns** — Measurement templates from official sources.

### `veri2206` — Pipe/Steel Weights
**9 columns, ~5,635 rows** — Pipe specifications (thickness, weight, surface area).

### `veri2220` — Price Index Coefficients
**22 columns** — Coefficients for escalation calculations (YM, TBF, İKYOG, İKMOG, İGYOG).

### `additional_rates` — Custom Price Adjustment Rates
**11 columns, ~360 rows** — User-defined additional rates referencing TUFE and industry-specific indices (e.g., "23-Metalik Olmayan Mineral Ürünleri").

---

## Location / Work Breakdown (3001–3004)

### `veri3001` — Work Breakdown Structure (İş Programı Ağacı)
**19 columns, ~1,381 rows** — Nested set tree for work locations/zones.

| Key Columns | Description |
|---|---|
| `ctreeid`, `cleft`, `cright` | Nested set tree columns |
| `ctitle` | Node title |
| `level`, `seviye` | Depth level |
| `kod` | Location code |
| `nerede` | Location description |

### `veri3002` — WBS Item Assignments
**12 columns** — Maps items (poz) to WBS locations.

### `veri3003–3004` — Alternate WBS structures
Similar to 3001/3002, possibly for different project phases.

---

## Company & Currency (4001–4006)

### `veri4001` — Company/Firm Registry
**25 columns** — Contractor/company info (name, address, tax, bank details).

### `veri4002` — Work Type Definitions
**4 columns** — Lookup table for work type codes and names.

### `veri4003` — Personnel
**6 columns** — Project personnel (name, title, role).

### `veri4004` — Currency Rates
**11 columns** — Exchange rates (buy/sell, effective rates) with dates.

### `veri4005` — Currency Definitions
**5 columns** — Currency code lookup table.

### `veri4006` — Project-Specific Currency Rates
**12 columns** — Currency rates per project (`dizin` field).

---

## Utility Tables

### `veri9998` / `veri9999` — Item Usage Counters
**3 columns** — Tracks how many projects use each item code (`poz`, `adet`).

### `Veri0321` / `Veri0322` — Category Definitions
Group/category codes and titles.

### `server_backups` — Backup Log
**3 columns, ~884 rows** — Backup history with dates.

### `server_backups_settings` — Backup Configuration
**7 columns** — Scheduled backup times and paths.

### `updatelist` / `updatelist_copy1` — Update History
**13 columns, ~388/427 rows** — Software update records with version info.

### `updateinformation` — DB Version
**2 columns** — Current database schema version.

---

## Stored Procedures

Key procedures reflect core business operations:

| Procedure | Purpose |
|---|---|
| `AnalizHesapla` | Calculate unit price analysis |
| `AnalizBFEkle` / `V2` | Add unit prices to analysis |
| `AnalizFiyatGuncelle` | Update analysis prices |
| `aktarmasiz_nakliye_hesap` | Calculate transport without transfer |
| `ana_kitaptan_nakliye_getir` | Import transport from master book |
| `is_artisi_yuzde_hesaplama` | Calculate work increase percentage |
| `kultur_revize_hesapla` / `V2/V3` | Calculate revised cultural construction |
| `yapim_revize_hesapla` / `V3/V5` | Calculate revised construction |
| `tbf_kuruslandirma` | Unit price rounding |
| `metraj_duzenle` | Organize measurements |
| `ehaks2_guncelle` | Update e-progress payment values |
| `dizin_temizle` | Clean up project folder data |
| `deletegarbagedata` | Remove orphaned data |
| `nakliye_oran_getir/kaydet` | Get/save transport rates |
| `atgb_ikyog_kuruslandirma` | Price difference index rounding |

---

## Project Folder Codes (dizin)

The `dizin` column partitions data by project/folder:

| Code | Likely Meaning |
|---|---|
| `C1`, `C2` | Contract files |
| `H3`, `H4`, `H5`, `H6` | Progress payment files |

---

## Data Flow Summary

```
Official Price Books (veri2001/2050/2060/2120)
    ↓ import prices
Project Unit Prices (veri0001) ← Analysis Detail (veri0004)
    ↓                               ↑
Analysis Summary (veri0003)    Reference Transport (veri2201/veri0006)
    ↓
Measurements (veri0007)
    ↓
Progress Payment Items (veri0005)
    ↓
Work Groups (veri0010/0011) → Group Summaries (veri0013/0014)
    ↓
Financial Summaries (veri0017, veri0021-0025)
    ↓
Reports & Documents (veri0042, veri0047, veri0050+, veri0100+)
    ↓
Price Escalation (veri0100, veri2220, additional_rates)
```
