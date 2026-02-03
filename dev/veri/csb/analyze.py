#!/usr/bin/env python3
"""Deep analysis of the output.xlsx file to verify parser correctness."""

import pandas as pd
from pathlib import Path

# Load the Excel file
df = pd.read_excel(Path('output.xlsx'))

print('=' * 80)
print('COMPREHENSIVE CSB PARSER VERIFICATION')
print('=' * 80)
print()

print('=== BASIC STATS ===')
print(f'Total records: {len(df)}')
print(f'Records with BIRIM_FIYAT: {df["BIRIM_FIYAT"].notna().sum()} ({100*df["BIRIM_FIYAT"].notna().sum()/len(df):.1f}%)')
print(f'Records with MONTAJ_FIYAT: {df["MONTAJ_FIYAT"].notna().sum()} ({100*df["MONTAJ_FIYAT"].notna().sum()/len(df):.1f}%)')
print(f'Records with UNIT: {df["UNIT"].notna().sum()} ({100*df["UNIT"].notna().sum()/len(df):.1f}%)')
print(f'Records with SATIN_ALMA_YERI: {df["SATIN_ALMA_YERI"].notna().sum()} ({100*df["SATIN_ALMA_YERI"].notna().sum()/len(df):.1f}%)')
print(f'Records with CATEGORY: {df["CATEGORY"].notna().sum()} ({100*df["CATEGORY"].notna().sum()/len(df):.1f}%)')
print()

# ============================================================================
# CHECK 1: SECTION 10.100 - İşçilik Rayiçleri (should have units)
# ============================================================================
print('=' * 60)
print('CHECK 1: Section 10.100 - İşçilik Rayiçleri')
print('This section SHOULD have units (Sa, Saat, etc.)')
print('=' * 60)
section_100 = df[df['POZ_NO'].str.startswith('10.100.')]
print(f'Records: {len(section_100)}')
print(f'With unit: {section_100["UNIT"].notna().sum()} / {len(section_100)}')
print(f'With category: {section_100["CATEGORY"].notna().sum()} / {len(section_100)}')
print(f'Unique units: {section_100["UNIT"].dropna().unique().tolist()}')
print()

# ============================================================================
# CHECK 2: SECTION 10.110 - Taşıt Rayiçleri (should NOT have units)
# ============================================================================
print('=' * 60)
print('CHECK 2: Section 10.110 - Taşıt Rayiçleri')
print('This section should NOT have units')
print('=' * 60)
section_110 = df[df['POZ_NO'].str.startswith('10.110.')]
print(f'Records: {len(section_110)}')
print(f'With unit (should be 0): {section_110["UNIT"].notna().sum()}')
if section_110["UNIT"].notna().sum() > 0:
    print('WARNING: Found unexpected units!')
    print(section_110[section_110["UNIT"].notna()][['POZ_NO', 'DESCRIPTION', 'UNIT']])
print()

# ============================================================================
# CHECK 3: SECTION 10.120 - İnşaat Makina ve Araçları (should NOT have units)
# ============================================================================
print('=' * 60)
print('CHECK 3: Section 10.120 - İnşaat Makina ve Araçları')
print('This section should NOT have units extracted from descriptions')
print('=' * 60)
section_120 = df[df['POZ_NO'].str.startswith('10.120.')]
print(f'Records: {len(section_120)}')
print(f'With unit (should be 0): {section_120["UNIT"].notna().sum()}')
if section_120["UNIT"].notna().sum() > 0:
    print('WARNING: Found unexpected units!')
    print(section_120[section_120["UNIT"].notna()][['POZ_NO', 'DESCRIPTION', 'UNIT']].head(10))

# Specific check for 10.120.1131
poz_1131 = df[df['POZ_NO'] == '10.120.1131']
if not poz_1131.empty:
    print(f'\nSpecific check - POZ 10.120.1131:')
    print(f'  Description: "{poz_1131.iloc[0]["DESCRIPTION"]}"')
    print(f'  Unit: {poz_1131.iloc[0]["UNIT"]}')
    desc = str(poz_1131.iloc[0]["DESCRIPTION"])
    if '(100-200) m' in desc and pd.isna(poz_1131.iloc[0]["UNIT"]):
        print('  ✓ CORRECT: "m" is kept in description')
    else:
        print('  ✗ ERROR: Check needed!')
print()

# ============================================================================
# CHECK 4: SECTION 10.130 - Malzeme Rayiçleri (should have units AND locations)
# ============================================================================
print('=' * 60)
print('CHECK 4: Section 10.130 - Malzeme Rayiçleri')
print('This section SHOULD have units and locations')
print('=' * 60)
section_130 = df[df['POZ_NO'].str.startswith('10.130.')]
print(f'Records: {len(section_130)}')
print(f'With unit: {section_130["UNIT"].notna().sum()} / {len(section_130)}')
print(f'With location: {section_130["SATIN_ALMA_YERI"].notna().sum()} / {len(section_130)}')
print(f'Unique units: {section_130["UNIT"].dropna().unique().tolist()[:10]}')
print(f'Unique locations: {section_130["SATIN_ALMA_YERI"].dropna().unique().tolist()}')
print()

# ============================================================================
# CHECK 5: SECTION 25.xxx - Birim Fiyat (should NOT have location, units optional)
# ============================================================================
print('=' * 60)
print('CHECK 5: Section 25.xxx - Birim Fiyat Sections')
print('These sections should NOT have SATIN_ALMA_YERI')
print('=' * 60)
section_25 = df[df['POZ_NO'].str.startswith('25.')]
print(f'Records: {len(section_25)}')
print(f'With SATIN_ALMA_YERI (should be 0): {section_25["SATIN_ALMA_YERI"].notna().sum()}')
print(f'With BIRIM_FIYAT: {section_25["BIRIM_FIYAT"].notna().sum()}')
print(f'With MONTAJ_FIYAT: {section_25["MONTAJ_FIYAT"].notna().sum()}')
if section_25["SATIN_ALMA_YERI"].notna().sum() > 0:
    print('WARNING: Found unexpected locations!')
    print(section_25[section_25["SATIN_ALMA_YERI"].notna()][['POZ_NO', 'DESCRIPTION', 'SATIN_ALMA_YERI']].head(5))
print()

# ============================================================================
# CHECK 6: SECTION 35.xxx - Birim Fiyat (should NOT have location, units optional)
# ============================================================================
print('=' * 60)
print('CHECK 6: Section 35.xxx - Birim Fiyat Sections')
print('These sections should NOT have SATIN_ALMA_YERI')
print('=' * 60)
section_35 = df[df['POZ_NO'].str.startswith('35.')]
print(f'Records: {len(section_35)}')
print(f'With SATIN_ALMA_YERI (should be 0): {section_35["SATIN_ALMA_YERI"].notna().sum()}')
print(f'With BIRIM_FIYAT: {section_35["BIRIM_FIYAT"].notna().sum()}')
print(f'With MONTAJ_FIYAT: {section_35["MONTAJ_FIYAT"].notna().sum()}')
if section_35["SATIN_ALMA_YERI"].notna().sum() > 0:
    print('WARNING: Found unexpected locations!')
print()

# ============================================================================
# CHECK 7: Category distribution
# ============================================================================
print('=' * 60)
print('CHECK 7: Category distribution')
print('=' * 60)
print(f'Unique categories: {df["CATEGORY"].nunique()}')
print('Top categories:')
print(df['CATEGORY'].value_counts().head(10))
print()

# ============================================================================
# CHECK 8: Empty descriptions
# ============================================================================
print('=' * 60)
print('CHECK 8: Records with empty descriptions')
print('=' * 60)
empty_desc = df[df['DESCRIPTION'].isna() | (df['DESCRIPTION'] == '')]
print(f'Records with empty description: {len(empty_desc)}')
if len(empty_desc) > 0:
    print(empty_desc[['POZ_NO', 'DESCRIPTION', 'BIRIM_FIYAT']].head(10))
print()

# ============================================================================
# CHECK 9: Records without prices
# ============================================================================
print('=' * 60)
print('CHECK 9: Records without any prices')
print('=' * 60)
no_price = df[df['BIRIM_FIYAT'].isna() & df['MONTAJ_FIYAT'].isna()]
print(f'Records without prices: {len(no_price)} ({100*len(no_price)/len(df):.1f}%)')
print(f'Top POZ prefixes without prices:')
no_price['PREFIX'] = no_price['POZ_NO'].str.extract(r'^(\d{2}\.\d{2,3})\.')[0]
print(no_price['PREFIX'].value_counts().head(10))
print()

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print('=' * 80)
print('FINAL SUMMARY')
print('=' * 80)
issues = []

if section_110["UNIT"].notna().sum() > 0:
    issues.append('Section 10.110 has unexpected units')
if section_120["UNIT"].notna().sum() > 0:
    issues.append('Section 10.120 has unexpected units')
if section_25["SATIN_ALMA_YERI"].notna().sum() > 0:
    issues.append('Section 25.xxx has unexpected locations')
if section_35["SATIN_ALMA_YERI"].notna().sum() > 0:
    issues.append('Section 35.xxx has unexpected locations')
if df["CATEGORY"].isna().sum() > 0:
    issues.append(f'{df["CATEGORY"].isna().sum()} records missing category')
if len(no_price) > len(df) * 0.1:
    issues.append(f'{len(no_price)} records ({100*len(no_price)/len(df):.1f}%) missing prices')

if issues:
    print('ISSUES FOUND:')
    for issue in issues:
        print(f'  - {issue}')
else:
    print('✓ ALL CHECKS PASSED - Parser appears to be working correctly!')
