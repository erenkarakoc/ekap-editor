import psycopg2
import pandas as pd
import sys

conn = psycopg2.connect(
    host="localhost",
    port=5432,
    dbname="oskaplus",
    user="postgres",
    password="258623*sDf"
)

cur = conn.cursor()
cur.execute("""
    SELECT tablename FROM pg_tables
    WHERE schemaname='public'
    ORDER BY tablename
""")
tables = [row[0] for row in cur.fetchall()]
cur.close()

print(f"Found {len(tables)} tables. Exporting non-empty ones...")

output_path = "C:/Users/Administrator/Desktop/ekap-editor/database/oskaplus_export.xlsx"

with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
    exported = 0
    for i, table in enumerate(tables):
        try:
            df = pd.read_sql_query(f'SELECT * FROM public."{table}"', conn)
            if df.empty:
                continue
            # Excel sheet names max 31 chars
            sheet_name = table[:31]
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            exported += 1
            if exported % 25 == 0:
                print(f"  {exported} tables exported...")
        except Exception as e:
            print(f"  Skipping {table}: {e}", file=sys.stderr)

print(f"Done! Exported {exported} tables to {output_path}")
conn.close()
