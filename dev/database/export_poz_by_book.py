"""
Export all poz rows (grouped by book) from the oskaplus database to Excel.

Sources:
  - veri2060: Official price list (book 85 — with prices)
  - veri2013: Transport table (17 books — poz catalog with descriptions)

Output: dev/database/poz_by_book.xlsx
  - One sheet per book (named by knt number + short name)
  - Columns: poz, description, unit (+ prices for book 85 from veri2060)
"""

import psycopg2
import pandas as pd

DB_CONFIG = dict(
    host="localhost",
    port=5432,
    dbname="oskaplus",
    user="postgres",
    password="258623*sDf",
)

OUTPUT_PATH = "C:/Users/Administrator/Desktop/ekap-editor/dev/database/poz_by_book.xlsx"

BOOK_NAMES = {
    "3": "KGM (Karayolları)",
    "6": "ÇŞİDB — Yapı İşleri",
    "7": "ÇŞİDB — Rayiçler",
    "17": "Tesisat — Mekanik",
    "18": "Tesisat — Elektrik",
    "20": "Tesisat — Sıhhi (Su-Boru)",
    "22": "Tesisat — Sıhhi Gereçler",
    "24": "Tesisat — Telefon Santral",
    "26": "Tesisat — Telefon-Haberleşme",
    "32": "DSİ",
    "33": "DSİ — Ek Pozlar",
    "35": "Yangın Tesisatı",
    "40": "İller Bankası",
    "41": "İller Bankası — Yapı",
    "45": "Enerji ve Tabii Kaynaklar",
    "58": "Makine-Ekipman Rayiçleri",
    "72": "Özel İmalatlar - Su Yalıtımı",
    "74": "Peyzaj - Çevre Düzenleme",
    "75": "Altyapı - Kanalizasyon",
    "81": "Vakıflar (Restorasyon)",
    "82": "Vakıflar — Rayiçler",
    "84": "Vakıflar — Özel",
    "85": "Vakıflar — İşçilik",
    "86": "Orman Genel Müdürlüğü",
    "87": "Köy Hizmetleri - KHGM",
    "88": "Ek Pozlar - Diğer",
}

PRICE_PERIODS = list(range(40, 51))


def main():
    print("Connecting to oskaplus database...")
    conn = psycopg2.connect(**DB_CONFIG)

    # ── Fetch veri2060 (price list, book 85) ──────────────────────────────
    price_cols = []
    for p in PRICE_PERIODS:
        price_cols.extend([f"bf{p}", f"mf{p}", f"df{p}"])

    base_cols = "poz, knt, yapiscins, olcu, nak, tip, tiptan, ypoz, anh, derece, abpoz, uzuntan"
    all_cols = f"{base_cols}, {', '.join(price_cols)}"

    df_2060 = pd.read_sql_query(f"SELECT {all_cols} FROM veri2060 ORDER BY poz", conn)
    df_2060["knt"] = df_2060["knt"].str.strip()
    # Strip whitespace from all string columns
    for col in df_2060.select_dtypes(include="object").columns:
        df_2060[col] = df_2060[col].str.strip()
    print(f"  veri2060: {len(df_2060)} rows")

    # ── Fetch veri2013 (all books, poz catalog) ───────────────────────────
    df_2013 = pd.read_sql_query(
        "SELECT poz, knt, yapiscins, olcu FROM veri2013 ORDER BY knt, poz", conn
    )
    df_2013["knt"] = df_2013["knt"].str.strip()
    for col in df_2013.select_dtypes(include="object").columns:
        df_2013[col] = df_2013[col].str.strip()
    print(f"  veri2013: {len(df_2013)} rows")

    conn.close()

    # ── Collect all unique books ──────────────────────────────────────────
    all_books = sorted(
        set(df_2013["knt"].unique()) | set(df_2060["knt"].unique()),
        key=lambda x: int(x),
    )

    # ── Write Excel: one sheet per book ───────────────────────────────────
    print(f"\nWriting to {OUTPUT_PATH}...")

    with pd.ExcelWriter(OUTPUT_PATH, engine="openpyxl") as writer:
        for book_id in all_books:
            book_name = BOOK_NAMES.get(book_id, f"Kitap {book_id}")
            sheet_name = f"{book_id} - {book_name}"[:31]

            price_data = df_2060[df_2060["knt"] == book_id]

            if not price_data.empty:
                out_df = price_data.copy()
                rename = {
                    "poz": "poz_no", "knt": "book_id", "yapiscins": "description",
                    "olcu": "unit", "nak": "has_transport", "tip": "type_code",
                    "tiptan": "type_name", "ypoz": "alt_poz_no", "anh": "region_id",
                    "derece": "level", "abpoz": "parent_poz", "uzuntan": "long_description",
                }
                for p in PRICE_PERIODS:
                    rename[f"bf{p}"] = f"unit_price_p{p}"
                    rename[f"mf{p}"] = f"material_price_p{p}"
                    rename[f"df{p}"] = f"labor_price_p{p}"
                out_df.rename(columns=rename, inplace=True)
            else:
                catalog = df_2013[df_2013["knt"] == book_id][["poz", "yapiscins", "olcu"]].copy()
                catalog.drop_duplicates(subset=["poz"], inplace=True)
                catalog.rename(columns={
                    "poz": "poz_no", "yapiscins": "description", "olcu": "unit",
                }, inplace=True)
                out_df = catalog

            out_df.to_excel(writer, sheet_name=sheet_name, index=False)
            print(f"  {sheet_name}: {len(out_df)} rows")

    print(f"\nDone! {len(all_books)} book sheets exported.")


if __name__ == "__main__":
    main()
