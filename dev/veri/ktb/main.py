#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Parse Construction Unit Price Text File
Generates a clean Excel file from messy input.txt
"""

import re
import pandas as pd
from pathlib import Path


# Known units (case-insensitive matching)
KNOWN_UNITS = {
    'm2', 'm²', 'm3', 'm³', 'm', 'mt', 'tul', 'cm', 'mm', 'mmxm', 'mm/m', 'metre',
    'kg', 'gr', 'ton', 'kt', 'kwh', 'kutu', 'paket',
    'adet', 'ad', 'ad.', 'takım', 'tk', 'tk.', 'set',
    'sa', 'saat', 'gün', 'dakika', 'sefer', 'defa',
    'lt', 'km', 'kg/m2', 'gr/m2', 'ton/m3', 'cm²'
}

# Location words (satın alma yeri) that come before unit
# Include both Turkish İ and regular I variants for case-insensitive matching
LOCATION_WORDS = {'işbaşında', 'İşbaşında', 'fabrikada', 'Fabrikada', 'depoda', 'Depoda', 'ocakta', 'Ocakta'}

# Garbage patterns to skip
GARBAGE_PATTERNS = [
    r'--- PAGE',
    r'BİRİM FİYAT EKİ',
    r'01 OCAK 2025',
    r'^T\.C\.$',
    r'SAYFA NO',
    r'^POZ NO$',
    r'İMALAT ÇEŞİDİ',
    r'ÖLÇÜ BİRİMİ',
    r'^MONTAJ FİYAT',
    r'^-\d+-$',  # Page numbers like -8-, -16-
]

# Poz number patterns - must match EXACT start patterns
POZ_PATTERNS = [
    r'^04\.KTB\.',
    r'^04\.V\d',
    r'^01\.V\d',
    r'^V\.\d',
    r'^KTB\.\d',
]


def is_garbage(line: str) -> bool:
    """Check if line should be skipped."""
    line = line.strip()
    if not line:
        return True

    # Check garbage patterns
    for pattern in GARBAGE_PATTERNS:
        if re.search(pattern, line, re.IGNORECASE):
            return True

    # Skip lines that are just numbers (standalone page numbers)
    if re.match(r'^\d+$', line):
        return True

    return False


def has_poz_pattern(line: str) -> bool:
    """Check if line starts with a Poz number pattern."""
    line = line.strip()
    for pattern in POZ_PATTERNS:
        if re.match(pattern, line, re.IGNORECASE):
            return True
    return False


def is_category(line: str) -> bool:
    """
    Check if line is a category header.
    Category headers:
    - Do NOT end with a valid price
    - Do NOT start with a poz number pattern
    - Do NOT start with parentheses (those are specs/standards)
    - Are either:
      - Fully uppercase Turkish text (like "İŞÇİLİKLER", "AGREGALAR")
      - Start with specific patterns like "A-", "B-", "1-", "2-", etc.
    """
    line = line.strip()

    # If line ends with price, it's not a category
    if has_price_at_end(line):
        return False

    # If line starts with poz number, it's not a category
    if has_poz_pattern(line):
        return False

    # Lines starting with parentheses are spec continuations, not categories
    if line.startswith('('):
        return False

    # Lines that are just spec references (like "EN ISO 11963)" or "(TS 822)")
    if re.match(r'^[\(\)TS EN ISO 0-9\-,\s]+\)?$', line):
        return False

    # Patterns like "A-", "B-", "1-", "2-" followed by text (category headers)
    if re.match(r'^[A-Z0-9]-\s', line):
        return True

    # Check if it's an uppercase category header
    # Must be mostly uppercase Turkish letters and spaces/hyphens
    turkish_upper = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
    turkish_all = turkish_upper + turkish_upper.lower() + 'abcçdefgğhıijklmnoöprsştuüvyz'

    words = line.split()
    if not words:
        return False

    # Count uppercase words (Turkish uppercase)
    upper_words = 0
    total_alpha_words = 0

    for word in words:
        # Remove punctuation for checking
        clean_word = re.sub(r'[^\w]', '', word)
        if not clean_word:
            continue

        # Check if word is mostly letters
        letters = [c for c in clean_word if c in turkish_all]
        if len(letters) < len(clean_word) * 0.5:
            continue

        total_alpha_words += 1

        # Check if uppercase
        is_upper = all(c in turkish_upper or c not in turkish_all for c in clean_word)
        if is_upper:
            upper_words += 1

    # If majority of words are uppercase, it's likely a category
    if total_alpha_words > 0 and upper_words >= total_alpha_words * 0.7:
        return True

    return False


def has_price_at_end(line: str) -> bool:
    """
    Check if line ends with a valid price or 'Değişken'.
    Also requires a unit to be present before the price for validity.
    """
    line = line.strip()
    tokens = line.split()
    if not tokens:
        return False

    last_token = tokens[-1]

    # Check for "Değişken" as a placeholder
    if last_token.lower() == 'değişken':
        return True

    if not is_price(last_token):
        return False

    # For small prices (< 100), require a unit to be present before the price
    # This helps avoid false positives like "Sertlik Derecesi 1,25"
    try:
        price_val = parse_price(last_token)
        if abs(price_val) < 100:
            # Check if there's a unit before the price
            # Count how many consecutive price tokens are at the end
            price_count = 0
            for i in range(len(tokens) - 1, -1, -1):
                if is_price(tokens[i]) or tokens[i].lower() == 'değişken':
                    price_count += 1
                else:
                    break

            # Token before prices should be a unit or location+unit
            if price_count < len(tokens):
                idx = len(tokens) - price_count - 1
                potential_unit = tokens[idx]
                if is_unit(potential_unit):
                    return True
                # Check if it's location then check token before that
                if is_location(potential_unit) and idx > 0:
                    potential_unit = tokens[idx - 1]
                    if is_unit(potential_unit):
                        return True
                # Small price without unit - likely not a real price
                return False
    except:
        pass

    return True


def is_price(token: str) -> bool:
    """
    Check if token is a valid price.
    Valid prices:
    - Contain digits and comma (like 355,00 or 2.250,00)
    - Can start with - (negative)
    - Do NOT contain - inside (ranges like 0,17-0,18)
    - Do NOT contain x (dimensions like 1,50x0,50)
    - Do NOT contain + or ( or )
    - Must have 2 decimal places after comma (Turkish price format)
    """
    token = token.strip()

    # Must contain digits and comma
    if ',' not in token or not any(c.isdigit() for c in token):
        return False

    # Handle negative prices - check after removing leading minus
    check_token = token
    if token.startswith('-'):
        check_token = token[1:]

    # Reject if contains internal hyphen (range indicator)
    if '-' in check_token:
        return False

    # Reject if contains x (dimension indicator) or +
    if 'x' in token.lower() or '+' in token:
        return False

    # Reject if contains parentheses
    if '(' in token or ')' in token:
        return False

    # Validate price format: optional minus, digits with optional dots, comma, exactly 2 digits
    # Turkish prices always have 2 decimal places (e.g., 355,00 or 2.250,00)
    price_pattern = r'^-?[\d.]+,\d{2}$'
    return bool(re.match(price_pattern, token))


def parse_price(token: str) -> float:
    """Convert price string to float."""
    # Remove dots (thousands separator) and replace comma with dot
    token = token.replace('.', '').replace(',', '.')
    return float(token)


def is_unit(token: str) -> bool:
    """Check if token is a known unit."""
    return token.lower() in {u.lower() for u in KNOWN_UNITS}


def is_location(token: str) -> bool:
    """Check if token is a location word (case-insensitive with Turkish support)."""
    return token in LOCATION_WORDS


def parse_data_line(line: str) -> dict | None:
    """
    Parse a data line using reverse stack parsing.
    Returns dict with: poz_no, description, unit, birim_fiyat, montaj_fiyat, demontaj_fiyat
    """
    line = line.strip()
    tokens = line.split()

    if len(tokens) < 3:  # Need at least poz, description, price
        return None

    # Extract poz number
    poz_no = tokens[0]
    remaining_tokens = tokens[1:]

    # Reverse iterate to find prices (right to left)
    prices = []
    unit = None
    desc_end_idx = len(remaining_tokens)

    # Scan from right to find prices and unit
    i = len(remaining_tokens) - 1
    while i >= 0 and len(prices) < 3:
        token = remaining_tokens[i]

        # Handle "Değişken" placeholder
        if token.lower() == 'değişken':
            prices.insert(0, None)  # Variable price as None
            desc_end_idx = i
            i -= 1
            continue

        if is_price(token):
            prices.insert(0, parse_price(token))  # Insert at beginning to maintain order
            desc_end_idx = i
            i -= 1
        elif is_unit(token) and prices:
            # Found unit after prices
            unit = token.upper() if token.lower() in {'m2', 'm3', 'm', 'kg', 'ad', 'tk', 'sa', 'lt', 'km', 'ton', 'kt'} else token
            desc_end_idx = i
            i -= 1
            break
        else:
            break

    # If we found prices but no unit yet, check token before first price
    if prices and not unit and desc_end_idx > 0:
        potential_unit = remaining_tokens[desc_end_idx - 1]
        if is_unit(potential_unit):
            unit = potential_unit.upper() if potential_unit.lower() in {'m2', 'm3', 'm', 'kg', 'ad', 'tk', 'sa', 'lt', 'km', 'ton', 'kt'} else potential_unit
            desc_end_idx -= 1

    # Check if token before unit is a location word, extract it separately
    location = None
    if desc_end_idx > 0:
        potential_loc = remaining_tokens[desc_end_idx - 1]
        if is_location(potential_loc):
            location = potential_loc
            desc_end_idx -= 1

    # Description is everything between poz_no and location/unit/prices
    description_tokens = remaining_tokens[:desc_end_idx]
    description = ' '.join(description_tokens)

    # If no prices found, this line might be incomplete
    if not prices:
        return None

    # Map prices: if 1 price -> birim, if 2 -> birim + montaj, if 3 -> birim + montaj + demontaj
    birim_fiyat = prices[0] if len(prices) >= 1 else None
    montaj_fiyat = prices[1] if len(prices) >= 2 else None
    demontaj_fiyat = prices[2] if len(prices) >= 3 else None

    return {
        'poz_no': poz_no,
        'description': description,
        'unit': unit,
        'satin_alma_yeri': location,
        'birim_fiyat': birim_fiyat,
        'montaj_fiyat': montaj_fiyat,
        'demontaj_fiyat': demontaj_fiyat
    }


def parse_file(filepath: str) -> list[dict]:
    """Parse the input file and return list of records."""
    records = []
    current_category = None
    buffer = []  # For multi-line entries

    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip garbage
        if is_garbage(line):
            i += 1
            continue

        # Check for category
        if is_category(line):
            # Flush buffer before category change
            if buffer:
                record = process_buffer(buffer, current_category)
                if record:
                    records.append(record)
                buffer = []

            current_category = line
            i += 1
            continue

        # Check if line has poz number
        if has_poz_pattern(line):
            # Flush previous buffer
            if buffer:
                record = process_buffer(buffer, current_category)
                if record:
                    records.append(record)
                buffer = []

            # Start new buffer
            buffer.append(line)

            # Check if this line already has price at end
            if has_price_at_end(line):
                record = process_buffer(buffer, current_category)
                if record:
                    records.append(record)
                buffer = []
        else:
            # Continuation line - add to buffer if we have an open buffer
            if buffer:
                buffer.append(line)

                # Check if this line ends with price
                if has_price_at_end(line):
                    record = process_buffer(buffer, current_category)
                    if record:
                        records.append(record)
                    buffer = []
            # If no buffer and not a poz line, might be orphan continuation - skip

        i += 1

    # Process any remaining buffer
    if buffer:
        record = process_buffer(buffer, current_category)
        if record:
            records.append(record)

    return records


def process_buffer(buffer: list[str], category: str) -> dict | None:
    """Process buffered lines into a single record."""
    if not buffer:
        return None

    # Join all lines with space
    combined = ' '.join(buffer)

    # Clean up multiple spaces
    combined = re.sub(r'\s+', ' ', combined)

    # Parse the combined line
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
    columns = ['poz_no', 'description', 'unit', 'satin_alma_yeri', 'birim_fiyat', 'montaj_fiyat', 'demontaj_fiyat', 'category']
    df = df[columns]

    # Rename columns for output
    df.columns = ['POZ NO', 'DESCRIPTION', 'UNIT', 'SATIN_ALMA_YERI', 'BIRIM_FIYAT', 'MONTAJ_FIYAT', 'DEMONTAJ_FIYAT', 'CATEGORY']

    # Export to Excel
    df.to_excel(str(output_file), index=False)
    print(f"Saved to {output_file}")

    # Print some stats
    print(f"\nStatistics:")
    print(f"  Total records: {len(df)}")
    print(f"  Records with montaj_fiyat: {df['MONTAJ_FIYAT'].notna().sum()}")
    print(f"  Records with demontaj_fiyat: {df['DEMONTAJ_FIYAT'].notna().sum()}")
    print(f"  Unique categories: {df['CATEGORY'].nunique()}")

    # Print sample records
    print(f"\nFirst 10 records:")
    print(df.head(10).to_string())

    print(f"\nRecords with multiple prices (sample):")
    multi_price = df[df['MONTAJ_FIYAT'].notna()]
    if len(multi_price) > 0:
        print(multi_price.head(10).to_string())


if __name__ == '__main__':
    main()
