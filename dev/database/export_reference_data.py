"""
Export relevant reference/master data from oskaplus database to Excel
with English column names and readable sheet names.

Output: database/reference_data.xlsx (10 sheets)
"""

import psycopg2
import pandas as pd
import sys

DB_CONFIG = dict(
    host="localhost",
    port=5432,
    dbname="oskaplus",
    user="postgres",
    password="258623*sDf",
)

OUTPUT_PATH = "C:/Users/Administrator/Desktop/ekap-editor/database/reference_data.xlsx"

# ── Books (static lookup) ────────────────────────────────────────────────────

BOOKS_DATA = [
    (6, "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı — Yapı İşleri", "15.xxx, 16.xxx"),
    (7, "Çevre, Şehircilik ve İklim Değişikliği Bakanlığı — Rayiçler", "04.xxx, 10.xxx, 19.xxx"),
    (3, "Karayolları Genel Müdürlüğü (KGM)", "KGM/xxxxx"),
    (17, "Tesisat — Mekanik (Isıtma/Soğutma)", "25.2xx"),
    (18, "Tesisat — Elektrik", "35.1xx"),
    (20, "Tesisat — Sıhhi (Su/Boru)", "25.3xx"),
    (22, "Tesisat — Sıhhi Gereçler", "25.1xx"),
    (24, "Tesisat — Telefon Santral", "35.7xx"),
    (26, "Tesisat — Telefon/Haberleşme", "35.5xx"),
    (32, "Devlet Su İşleri (DSİ)", "03.xxx, 04.xxx"),
    (33, "DSİ — Ek Pozlar", "04.xxx"),
    (35, "Yangın Tesisatı", "25.7xx"),
    (40, "İller Bankası", "3500+"),
    (41, "İller Bankası — Yapı", "05.YAxx"),
    (45, "Enerji ve Tabii Kaynaklar", "17.xxx"),
    (58, "Makine/Ekipman Rayiçleri", "10.xxx/MK"),
    (72, "Özel İmalatlar / Su Yalıtımı", "48.xxx"),
    (74, "Peyzaj / Çevre Düzenleme", "77.xxx"),
    (75, "Altyapı / Kanalizasyon", "16.xxx"),
    (81, "Vakıflar Genel Müdürlüğü (Restorasyon)", "04.V0xx, V.xxxx"),
    (82, "Vakıflar — Rayiçler", "10.xxx"),
    (84, "Vakıflar — Özel", "3931"),
    (85, "Vakıflar — İşçilik", "V.xxxx"),
    (86, "Orman Genel Müdürlüğü", "04.xxx"),
    (87, "Köy Hizmetleri / KHGM", "04.xxx"),
    (88, "Ek Pozlar / Diğer", "15.xxx/H"),
]

# ── Table export definitions ─────────────────────────────────────────────────
# Each entry: (sheet_name, table_name, sql_columns_or_None, column_rename_map)

# veri2060 - Price List: build column list + rename map dynamically
_price_base_cols = [
    "poz", "knt", "yapiscins", "olcu", "nak", "tip", "tiptan",
    "ypoz", "anh", "derece", "derece1", "abpoz", "uzuntan", "ysart",
    "bsl", "aciklama",
]
_price_base_rename = {
    "poz": "item_code", "knt": "book_id", "yapiscins": "description",
    "olcu": "unit", "nak": "has_transport", "tip": "type_code",
    "tiptan": "type_name", "ypoz": "alt_item_code", "anh": "region_id",
    "derece": "level", "derece1": "sub_level", "abpoz": "parent_item_code",
    "uzuntan": "long_description", "ysart": "spec_notes",
    "bsl": "header", "aciklama": "remarks",
}

# Price columns: bf/mf/df 40-50 plus special variants
_price_year_cols = []
_price_year_rename = {}
for period in range(40, 51):
    for prefix, eng in [("bf", "unit_price"), ("mf", "material_price"), ("df", "labor_price")]:
        col = f"{prefix}{period}"
        _price_year_cols.append(col)
        _price_year_rename[col] = f"{eng}_p{period}"

# Special price columns: bf42_1, bf42_2, bf43_1 etc.
for suffix in ["42_1", "42_2", "43_1"]:
    for prefix, eng in [("bf", "unit_price"), ("mf", "material_price"), ("df", "labor_price")]:
        col = f"{prefix}{suffix}"
        _price_year_cols.append(col)
        _price_year_rename[col] = f"{eng}_p{suffix}"

PRICE_LIST_COLS = _price_base_cols + _price_year_cols
PRICE_LIST_RENAME = {**_price_base_rename, **_price_year_rename}

# veri2013 - Transport Coefficients
_transport_base = ["anh", "poz", "knt", "ypoz", "yapiscins", "olcu"]
_transport_nak = [f"nak{i:02d}" for i in range(1, 81)]
_transport_rename = {
    "anh": "region_id", "poz": "item_code", "knt": "book_id",
    "ypoz": "alt_item_code", "yapiscins": "description", "olcu": "unit",
}
for i in range(1, 81):
    _transport_rename[f"nak{i:02d}"] = f"transport_coeff_{i:02d}"

TRANSPORT_COEFF_COLS = _transport_base + _transport_nak
TRANSPORT_COEFF_RENAME = _transport_rename

# veri2014 - Transport Formulas
TRANSPORT_FORMULA_COLS = [
    "anh", "sutun", "poz", "yapiscins", "olcu", "km", "yog", "formul",
    "kod", "aciklama", "cogu", "yuz", "yuzde", "pozlar", "pozek",
    "ack", "ackek", "kkat", "fml", "aratop", "aratop1", "aratop2",
    "aratop3", "aratop4", "yapiscins1", "olcu1", "form", "alt", "bfe",
    "hsb", "knt", "aciklamalar", "knt1", "formul1", "aciklamalar1",
    "km1", "fml1", "Is", "form1", "ak1", "ys", "ger1", "not1",
    "formulex", "formul1ex",
]
TRANSPORT_FORMULA_RENAME = {
    "anh": "region_id", "sutun": "column_id", "poz": "item_code",
    "yapiscins": "description", "olcu": "unit", "km": "distance_km",
    "yog": "density", "formul": "formula", "kod": "code",
    "aciklama": "remarks", "cogu": "multiplier", "yuz": "surface",
    "yuzde": "percentage", "pozlar": "related_items", "pozek": "item_extra",
    "ack": "note", "ackek": "note_extra", "kkat": "layer_coeff",
    "fml": "formula_result", "aratop": "subtotal_0", "aratop1": "subtotal_1",
    "aratop2": "subtotal_2", "aratop3": "subtotal_3", "aratop4": "subtotal_4",
    "yapiscins1": "description_alt", "olcu1": "unit_alt", "form": "form",
    "alt": "sub_data", "bfe": "unit_price_extra", "hsb": "calc_type",
    "knt": "control_code", "aciklamalar": "remarks_detail",
    "knt1": "control_flag", "formul1": "formula_alt",
    "aciklamalar1": "remarks_alt", "km1": "distance_alt",
    "fml1": "formula_result_alt", "Is": "work_type", "form1": "form_alt",
    "ak1": "note_1", "ys": "specification", "ger1": "requirement",
    "not1": "note_2", "formulex": "formula_extended",
    "formul1ex": "formula_alt_extended",
}

# veri2017 - Price Indices
_indices_base = ["yil", "ay", "aystr", "ufeg", "l", "au", "mk"]
_indices_ufe = [f"ufe{i:04d}" for i in range(1, 125)]
_indices_rename = {
    "yil": "year", "ay": "month", "aystr": "month_name",
    "ufeg": "ppi_general", "l": "l_coefficient", "au": "au_value",
    "mk": "mk_value",
}
for i in range(1, 125):
    _indices_rename[f"ufe{i:04d}"] = f"ppi_sector_{i:03d}"

PRICE_INDICES_COLS = _indices_base + _indices_ufe
PRICE_INDICES_RENAME = _indices_rename

# ── Main export logic ────────────────────────────────────────────────────────

EXPORTS = [
    # (sheet_name, table, columns_list_or_None, rename_map)
    ("Regions", "veri2200", ["anh", "tan"], {"anh": "region_id", "tan": "region_name"}),
    ("Price_List", "veri2060", PRICE_LIST_COLS, PRICE_LIST_RENAME),
    ("Item_Types", "veri2015", ["poz", "tip", "tan2"], {"poz": "item_code", "tip": "type_code", "tan2": "type_name"}),
    ("Item_Relations", "veri2020", ["anapoz", "poz", "knt", "durumu", "anapozknt", "anapozdurumu"],
     {"anapoz": "parent_item_code", "poz": "child_item_code", "knt": "book_id",
      "durumu": "status", "anapozknt": "parent_book_id", "anapozdurumu": "parent_status"}),
    ("Transport_Coefficients", "veri2013", TRANSPORT_COEFF_COLS, TRANSPORT_COEFF_RENAME),
    ("Transport_Formulas", "veri2014", TRANSPORT_FORMULA_COLS, TRANSPORT_FORMULA_RENAME),
    ("Price_Indices", "veri2017", PRICE_INDICES_COLS, PRICE_INDICES_RENAME),
    ("Pipe_Weights", "veri2206",
     ["kalinlik", "olcu", "agirlik", "aciklama", "yuzey", "bsl", "anh", "kullanici_tanimi"],
     {"kalinlik": "thickness", "olcu": "dimension", "agirlik": "weight_kg",
      "aciklama": "description", "yuzey": "surface_area", "bsl": "header",
      "anh": "region_id", "kullanici_tanimi": "user_defined"}),
    ("Report_Templates", "veri2061", ["dizin", "baslik", "size"],
     {"dizin": "template_code", "baslik": "template_name", "size": "data_size"}),
]


def main():
    print("Connecting to oskaplus database...")
    conn = psycopg2.connect(**DB_CONFIG)

    with pd.ExcelWriter(OUTPUT_PATH, engine="openpyxl") as writer:
        # Sheet 1: Books (static)
        books_df = pd.DataFrame(BOOKS_DATA, columns=["book_id", "book_name", "poz_prefix_example"])
        books_df.to_excel(writer, sheet_name="Books", index=False)
        print(f"  Books: {len(books_df)} rows (static)")

        # Sheets 2-10: Database tables
        for sheet_name, table, columns, rename_map in EXPORTS:
            try:
                col_list = ", ".join(f'"{c}"' for c in columns)
                query = f'SELECT {col_list} FROM public."{table}"'
                df = pd.read_sql_query(query, conn)
                df.rename(columns=rename_map, inplace=True)
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                print(f"  {sheet_name}: {len(df)} rows")
            except Exception as e:
                print(f"  ERROR exporting {sheet_name} ({table}): {e}", file=sys.stderr)

    conn.close()
    print(f"\nDone! Saved to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
