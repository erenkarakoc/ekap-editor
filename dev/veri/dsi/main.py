#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Parse DSI Construction Unit Price Text File
Generates a clean Excel file from messy input.txt
"""

import re
import pandas as pd
from pathlib import Path


# POZ pattern: XX.XXX.XXXX (e.g., 50.205.1001, 51.101.1011, 56.805.3790)
POZ_PATTERN = re.compile(r'^(\d{2}\.\d{3}\.\d{4}(/\d+)?)\b')

# Price pattern: Turkish format (dots for thousands, comma for decimal)
PRICE_PATTERN = re.compile(r'^-?[\d.]+,\d{2}$')

# Known units (case-insensitive matching)
KNOWN_UNITS = {
    'metre', 'm', 'm²', 'm³', 'm2', 'm3',
    'm²-m³',  # compound unit for scaffolding
    'kg', 'ton', 'Ton',
    'adet', 'ad', 'Adet',
    'saat', 'sa', 'Saat',
    'km', 'km²', 'km2',
    'nokta', 'Nokta',
    'ha', 'hektar',
    'dekar',
    'kesit',
    'Pafta', 'pafta',
    'yil', 'yıl',
    'sayfa',
    'ster',
    'litre', 'lt',
    'istasyon',
    'parsel',
    'paket', 'Paket',
}

# Multi-word units (space-separated)
MULTI_WORD_UNITS = {'1000 adet', 'parametre başı'}

# Build lowercase set once for matching
KNOWN_UNITS_LOWER = {u.lower() for u in KNOWN_UNITS}

# Compound units that appear as "1000 adet"
COMPOUND_UNITS = {'1000 adet'}

# Special price values (no numeric price)
SPECIAL_PRICES = {'Tariften', 'Faturadan', 'Formüllerden', 'Formülden'}

# Page header pattern
PAGE_HEADER_LINE1 = 'POZ NO YAPILAN İŞİN TANIMI ÖLÇÜ BİRİMİ BİRİM'
PAGE_HEADER_LINE2 = 'FİYATI (TL)'

# Section letter markers for categories
SECTION_MARKER_PATTERN = re.compile(r'^([A-Z])\.\s+(.+)')

# Turkish uppercase letters
TURKISH_UPPER = set('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ')
TURKISH_LOWER = set('abcçdefgğhıijklmnoöprsştuüvyz')
TURKISH_ALL = TURKISH_UPPER | TURKISH_LOWER


def is_price(token: str) -> bool:
    """Check if token is a valid Turkish format price."""
    token = token.strip()
    if ',' not in token or not any(c.isdigit() for c in token):
        return False
    check_token = token.lstrip('-')
    if '-' in check_token:
        return False
    if 'x' in token.lower() or '+' in token:
        return False
    if '(' in token or ')' in token:
        return False
    return bool(PRICE_PATTERN.match(token))


def is_unit(token: str) -> bool:
    """Check if token is a known unit."""
    return token.lower() in KNOWN_UNITS_LOWER


def is_special_price(token: str) -> bool:
    """Check if token is a special price value."""
    return token in SPECIAL_PRICES


def is_garbage_line(line: str) -> bool:
    """Check if line should be skipped entirely."""
    stripped = line.strip()
    if not stripped:
        return True
    # Standalone page numbers
    if re.match(r'^\d{1,3}$', stripped):
        return True
    # Page header lines
    if stripped == PAGE_HEADER_LINE1:
        return True
    if stripped == PAGE_HEADER_LINE2:
        return True
    # NOT: lines (notes)
    if stripped.startswith('NOT:') or stripped.startswith('Not:'):
        return True
    return False


def is_toc_line(line: str, line_idx: int) -> bool:
    """Check if line is in the table of contents (first ~112 lines)."""
    return line_idx < 112


def is_formula_context(line: str) -> bool:
    """Check if line is part of a formula block."""
    stripped = line.strip()
    # Formula indicators
    if stripped.startswith('Hal ') and re.search(r'Çekilen su miktarı', stripped):
        return True
    if stripped.startswith('F =') or stripped.startswith('F='):
        return True
    if re.match(r'^\s*takdirde:', stripped):
        return True
    if re.match(r'^K\d?\s*=\s*Katsayı', stripped):
        return True
    if stripped == 'Q = Saatte metreküp':
        return True
    if stripped == 'h = metre':
        return True
    if stripped == 'F = lira':
        return True
    if stripped.startswith('Yukarıdaki formüllerde:'):
        return True
    if re.match(r'^K\d\s*=\s', stripped):
        return True
    if stripped.startswith('B = Temel') or stripped.startswith('(B) katsayısı'):
        return True
    if re.match(r'^\s*\d+\s*m²?\s*<\s*S', stripped):
        return True
    if re.match(r'^\s*S\s*[<>]', stripped):
        return True
    if stripped.startswith('Bu toplam alan S ise:'):
        return True
    if stripped.startswith('Not: Burada B '):
        return True
    if re.match(r'^\s*den az olduğu takdirde:', stripped):
        return True
    if re.match(r'^\s*olduğu takdirde:', stripped):
        return True
    if '√M' in stripped:
        return True
    if 'M= ………' in stripped:
        return True
    if re.match(r'^\s*1 Ton yükün', stripped):
        return True
    if re.match(r'^Hal \d\s*-\s', stripped):
        return True
    if re.match(r'^\s*(den|olduğu)\s', stripped):
        return True
    if re.match(r'^\d+\s*m²?\s*<\s*S', stripped):
        return True
    if '(55.114.2010) pozundaki gibidir' in stripped:
        return True
    return False


def is_category_line(line: str) -> bool:
    """
    Check if line is a category header.
    Categories are uppercase Turkish text lines, not starting with POZ and not ending with price.
    """
    stripped = line.strip()
    if not stripped or len(stripped) < 3:
        return False

    # If line has a POZ number, it's not a category
    if POZ_PATTERN.match(stripped):
        return False

    # If line ends with a price token, not a category
    tokens = stripped.split()
    if tokens and is_price(tokens[-1]):
        return False

    # Lines starting with parentheses are not categories
    if stripped.startswith('('):
        return False
    # Numbered list items like "1 - Gom II AL dinamit kg ---"
    if re.match(r'^\d+\s*-\s', stripped):
        return False

    # Reject lines that look like standard references (TS, EN, ISO, ASTM, etc.)
    # These appear as continuation lines in lab section descriptions
    if re.match(r'^(TS|EN|ISO|ASTM|ACI|EPA|ISRM|VDG)\s', stripped):
        return False
    # Reject lines containing TS/EN/ISO references (common in multi-line lab entries)
    if re.search(r'\bTS\s+(EN\s+)?(ISO\s+)?\d', stripped):
        return False
    # Reject lines ending with standard refs that wrap from previous line
    if re.search(r'(TS|EN|ISO|ASTM)\s*(EN\s*)?\d+[-\s]?\d*\s*$', stripped):
        return False
    # Reject lines that start with closing parenthesis (continuation)
    if stripped.startswith(')') or re.match(r'^[a-zçğıöşü]', stripped):
        return False

    # Reject lines containing chemical formulas or parameter lists
    if re.search(r'[A-Z][a-z]?\d*O\d', stripped):
        return False
    if 'PCB' in stripped and re.search(r'PCB\s*\d', stripped):
        return False
    if re.search(r'parametre\s*=', stripped, re.IGNORECASE):
        return False

    # Reject lines that are just unit references (standalone "Ton", "Adet" etc.)
    if stripped in ('Ton', 'Adet'):
        return False

    # Reject lines that are clearly description continuations from lab entries
    # These often end with standard reference codes or contain "ayrı)" etc.
    if re.search(r'ayrı\)', stripped):
        return False
    if re.search(r'İşletme İçi Metot$', stripped) or re.search(r'İşletme İçi Metod$', stripped):
        return False

    # Section letter markers like "A. SULAMA VE ..." or "B. BARAJLAR ..."
    if SECTION_MARKER_PATTERN.match(stripped):
        return True

    # Check if it matches specific known sub-headers that are uppercase
    # Must be mostly uppercase Turkish
    words = stripped.split()
    if not words:
        return False

    upper_count = 0
    total_alpha = 0
    for word in words:
        clean = re.sub(r'[^\w]', '', word)
        if not clean:
            continue
        letters = [c for c in clean if c in TURKISH_ALL]
        if len(letters) < len(clean) * 0.5:
            continue
        total_alpha += 1
        if all(c in TURKISH_UPPER or c not in TURKISH_ALL for c in clean):
            upper_count += 1

    if total_alpha >= 2 and upper_count >= total_alpha * 0.7:
        return True

    return False


def has_price_at_end(line: str) -> bool:
    """Check if line ends with a valid price or special price."""
    stripped = line.strip()
    tokens = stripped.split()
    if not tokens:
        return False
    last = tokens[-1]
    if is_price(last):
        return True
    if is_special_price(last):
        return True
    # Check for dash price (like "m³ -") or "---"
    if last == '-' or last == '---':
        # Only if there's a unit before it
        if len(tokens) >= 2 and is_unit(tokens[-2]):
            return True
        # Check for multi-word units before dash
        if len(tokens) >= 3:
            two_word = tokens[-3] + ' ' + tokens[-2]
            if two_word.lower() in {u.lower() for u in MULTI_WORD_UNITS}:
                return True
        # Handle "0 -" pattern (zero price with footnote dash)
        if len(tokens) >= 2 and tokens[-2] == '0':
            return True
    return False


def extract_price_from_end(tokens: list) -> tuple:
    """
    Extract price token from end of token list.
    Returns (price_str, remaining_tokens).
    """
    if not tokens:
        return None, tokens

    last = tokens[-1]
    if is_price(last):
        return last, tokens[:-1]
    if is_special_price(last):
        return last, tokens[:-1]
    if last == '-' or last == '---':
        # Handle "0 -" pattern - consume both tokens
        if len(tokens) >= 2 and tokens[-2] == '0':
            return '-', tokens[:-2]
        return last, tokens[:-1]
    return None, tokens


def extract_unit_from_end(tokens: list) -> tuple:
    """
    Extract unit from end of token list.
    Handles compound units like '1000 adet' and 'parametre başı'.
    Returns (unit_str, remaining_tokens).
    """
    if not tokens:
        return None, tokens

    # Check multi-word units first
    if len(tokens) >= 2:
        two_word = tokens[-2] + ' ' + tokens[-1]
        if two_word.lower() in {u.lower() for u in MULTI_WORD_UNITS}:
            return two_word, tokens[:-2]

    last = tokens[-1]
    if is_unit(last):
        return last, tokens[:-1]
    return None, tokens


def is_formula_poz_line(line: str) -> bool:
    """
    Check if line is a standalone formula POZ entry like '55.107.1004 m³' or '55.114.2050 m³'.
    These are POZ numbers followed by just a unit (no description, no price).
    They represent formula-based pricing entries.
    """
    stripped = line.strip()
    tokens = stripped.split()
    if len(tokens) != 2:
        return False
    if not POZ_PATTERN.match(tokens[0]):
        return False
    if is_unit(tokens[1]):
        return True
    return False


def parse_data_line(combined: str) -> dict | None:
    """
    Parse a combined (possibly multi-line) data entry.
    Returns dict with: poz_no, description, unit, birim_fiyat
    """
    combined = re.sub(r'\s+', ' ', combined).strip()
    tokens = combined.split()

    if len(tokens) < 2:
        return None

    # Extract POZ number
    poz_match = POZ_PATTERN.match(combined)
    if not poz_match:
        return None

    poz_no = poz_match.group(1)
    rest = combined[poz_match.end():].strip()
    rest_tokens = rest.split()

    if not rest_tokens:
        return None

    # Check for formula POZ entry: just POZ + unit (like "55.107.1004 m³")
    if len(rest_tokens) == 1 and is_unit(rest_tokens[0]):
        return {
            'poz_no': poz_no,
            'description': 'Formüllerden',
            'unit': rest_tokens[0],
            'birim_fiyat': 'Formüllerden',
        }

    # Extract price from end
    price_str, rest_tokens = extract_price_from_end(rest_tokens)

    # Extract unit from end (after price removal)
    unit, rest_tokens = extract_unit_from_end(rest_tokens)

    # Remaining tokens form the description
    description = ' '.join(rest_tokens).strip()

    # Format price
    if price_str and is_price(price_str):
        birim_fiyat = price_str.replace('.', '').replace(',', '.')
        birim_fiyat = float(birim_fiyat)
    elif price_str in SPECIAL_PRICES:
        birim_fiyat = price_str
    elif price_str == '-' or price_str == '---':
        birim_fiyat = price_str
    else:
        birim_fiyat = None

    return {
        'poz_no': poz_no,
        'description': description,
        'unit': unit,
        'birim_fiyat': birim_fiyat,
    }


def preprocess_lines(lines: list) -> list:
    """
    Preprocess lines to fix split units like m\\n3 -> m3.
    When a line ends with 'm' and next line starts with '3' followed by price,
    merge them.
    """
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Check for split unit: line ends with " m" and next line is "3 <price>"
        if i + 1 < len(lines):
            next_stripped = lines[i + 1].strip()
            if stripped.endswith(' m') and re.match(r'^3\s+[\d.]+,\d{2}$', next_stripped):
                price_part = next_stripped[1:].strip()
                merged = stripped + '3 ' + price_part
                result.append(merged + '\n')
                i += 2
                continue

        result.append(line)
        i += 1
    return result


def parse_file(filepath: str) -> list[dict]:
    """Parse the input file and return list of records."""
    records = []
    current_category = None
    buffer = []  # For multi-line entries
    in_formula_block = False
    orphan_buffer = []  # Lines without active POZ buffer (for description-before-POZ cases)

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Preprocess: fix split m\n3 units
    lines = preprocess_lines(lines)

    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')
        stripped = line.strip()

        # Skip TOC (first ~112 lines)
        if is_toc_line(line, i):
            i += 1
            continue

        # Skip garbage lines
        if is_garbage_line(line):
            i += 1
            continue

        # Skip formula context lines
        if is_formula_context(line):
            in_formula_block = True
            i += 1
            continue

        # Reset formula block flag on non-formula content
        if in_formula_block and stripped and not is_formula_context(line):
            in_formula_block = False

        # Check for category
        if is_category_line(stripped):
            # Flush buffer before category change
            if buffer:
                record = process_buffer(buffer, current_category)
                if record:
                    records.append(record)
                buffer = []
            current_category = stripped
            orphan_buffer = []
            i += 1
            continue

        # Check if line starts with a POZ number
        poz_match = POZ_PATTERN.match(stripped)
        if poz_match:
            # Flush previous buffer
            if buffer:
                record = process_buffer(buffer, current_category)
                if record:
                    records.append(record)
                buffer = []

            # Save orphan lines for potential empty-description entries
            saved_orphans = orphan_buffer
            orphan_buffer = []

            # Check for standalone formula POZ line (like "55.107.1004 m³")
            if is_formula_poz_line(stripped):
                record = process_buffer([stripped], current_category)
                if record:
                    records.append(record)
                i += 1
                continue

            # Check for two POZ entries on one line
            second_poz = find_second_poz(stripped)
            if second_poz:
                first_part, second_part = second_poz
                # Process first part
                buffer = [first_part]
                if has_price_at_end(first_part):
                    record = process_buffer(buffer, current_category)
                    if record:
                        records.append(record)
                    buffer = []
                # Process second part
                buffer = [second_part]
                if has_price_at_end(second_part):
                    record = process_buffer(buffer, current_category)
                    if record:
                        records.append(record)
                    buffer = []
            else:
                buffer.append(stripped)
                if has_price_at_end(stripped):
                    record = process_buffer(buffer, current_category)
                    if record:
                        if not record['description'] and saved_orphans:
                            record['description'] = ' '.join(saved_orphans)
                        records.append(record)
                    buffer = []
        else:
            # Non-POZ line
            if buffer:
                # Check if this is a standalone line with just unit and price like "adet 7.140,00"
                # or continuation description
                buffer.append(stripped)
                if has_price_at_end(stripped):
                    record = process_buffer(buffer, current_category)
                    if record:
                        records.append(record)
                    buffer = []
            else:
                # Orphan line - save for potential use as description
                orphan_buffer.append(stripped)

        i += 1

    # Process any remaining buffer
    if buffer:
        record = process_buffer(buffer, current_category)
        if record:
            records.append(record)

    return records


def find_second_poz(line: str) -> tuple | None:
    """
    Check if line contains two POZ entries.
    Returns (first_part, second_part) or None.
    """
    # Find all POZ patterns in the line
    # Use a non-anchored pattern to find all occurrences
    poz_iter_pattern = re.compile(r'(\d{2}\.\d{3}\.\d{4}(/\d+)?)\b')
    matches = list(poz_iter_pattern.finditer(line))
    if len(matches) < 2:
        return None

    # Split at the second POZ match
    split_pos = matches[1].start()
    first_part = line[:split_pos].strip()
    second_part = line[split_pos:].strip()

    # Validate both parts have price at end (otherwise it might be a reference like "50.01-100 m")
    if first_part and second_part and has_price_at_end(first_part):
        return (first_part, second_part)
    return None


def process_buffer(buffer: list[str], category: str) -> dict | None:
    """Process buffered lines into a single record."""
    if not buffer:
        return None

    combined = ' '.join(buffer)
    combined = re.sub(r'\s+', ' ', combined).strip()

    record = parse_data_line(combined)
    if record:
        record['category'] = category
    return record


def main():
    input_file = Path(__file__).parent / 'input.txt'
    output_file = Path(__file__).parent / 'output.xlsx'

    print(f"Parsing {input_file}...")
    records = parse_file(str(input_file))

    print(f"Found {len(records)} records")

    # Create DataFrame
    df = pd.DataFrame(records)

    # Reorder columns
    columns = ['poz_no', 'description', 'unit', 'birim_fiyat', 'category']
    df = df[columns]

    # Rename columns for output
    df.columns = ['POZ_NO', 'DESCRIPTION', 'UNIT', 'BIRIM_FIYAT', 'CATEGORY']

    # Export to Excel
    df.to_excel(str(output_file), index=False)
    print(f"Saved to {output_file}")

    # Print statistics
    print(f"\nStatistics:")
    print(f"  Total records: {len(df)}")
    print(f"  Unique categories: {df['CATEGORY'].nunique()}")
    print(f"  Records with numeric price: {df['BIRIM_FIYAT'].apply(lambda x: isinstance(x, float)).sum()}")
    print(f"  Records with special price: {df['BIRIM_FIYAT'].apply(lambda x: isinstance(x, str)).sum()}")
    print(f"  Records with no unit: {df['UNIT'].isna().sum()}")

    # Print categories
    print(f"\nCategories:")
    for cat in df['CATEGORY'].unique():
        count = len(df[df['CATEGORY'] == cat])
        print(f"  {cat}: {count} records")

    # Print first 15 records
    print(f"\nFirst 15 records:")
    print(df.head(15).to_string())

    # Print records with special prices
    print(f"\nRecords with special prices (sample):")
    special = df[df['BIRIM_FIYAT'].apply(lambda x: isinstance(x, str))]
    if len(special) > 0:
        print(special.head(10).to_string())

    # Print records with missing units
    print(f"\nRecords with missing units ({len(df[df['UNIT'].isna()])}):")
    missing_unit = df[df['UNIT'].isna()]
    if len(missing_unit) > 0:
        print(missing_unit.to_string())

    # Print last 5 records
    print(f"\nLast 5 records:")
    print(df.tail(5).to_string())


if __name__ == '__main__':
    main()
