#!/usr/bin/env python3
"""
CSB Construction Unit Price Text File Parser

Parses input.txt containing Turkish construction unit prices and generates
a clean Excel file with structured data.

Two formats are handled:
1. Rayiç (Material/Labor rates): POZ | Description | Unit | Location | Price
2. Birim Fiyat (Unit prices): POZ | Description | Unit Price | Installation Price
"""

import re
import pandas as pd
from pathlib import Path
from typing import Optional


# Known units (case-insensitive matching)
KNOWN_UNITS = {
    'm', 'm²', 'm³', 'mt', 'cm', 'cm²', 'cm³', 'mm', 'mm2', 'mm.',
    'kg', 'gr', 'ton', 'kwh', 'kw', 'kva',
    'adet', 'ad', 'ad.', 'takım', 'tk', 'tk.', 'set',
    'sa', 'saat', 'gün', 'dakika',
    'lt', 'km', 'dm³', 'ø mm',
}

# Location words
LOCATION_WORDS = {'İşbaşında', 'işbaşında', 'Fabrikada', 'fabrikada',
                  'Depoda', 'depoda', 'Ocakta', 'ocakta'}

# Sections that have unit columns (based on table header analysis)
SECTIONS_WITH_UNITS = {'10.100', '10.130'}  # İşçilik and Malzeme Rayiçleri

# Sections that have location columns
SECTIONS_WITH_LOCATIONS = {'10.130'}  # Only Malzeme Rayiçleri

# Header fragments to skip
HEADER_FRAGMENTS = {
    'Sıra', 'Poz No', 'Tanımı', 'Ölçü', 'Birimi', 'Rayiç', 'Fiyatı', 'TL',
    'Montajlı', 'Birim Fiyat', 'Montaj Bedeli', 'Yapılacak İşin Cinsi',
    'Satın Alma', 'Yeri', 'No', 'Poz No Tanımı', 'Rayiç Fiyatı'
}

# POZ pattern: XX.XXX.XXXX or XX.XXX.XXXXX
# Must not be followed by / or - (which indicates reference like "10.240.6003/6010-")
# First digit pair should be 10-99 (not 01-31 which could be a date)
# Second digit group should be 100-999 (3 digits) for standard POZ, not 01-12 (month)
POZ_PATTERN = re.compile(r'^(\d{2}\.\d{2,3}\.\d{4,5})(?![/-])')

def is_date_not_poz(poz_str: str) -> bool:
    """
    Check if a POZ-like string is actually a date (DD.MM.YYYY).
    POZ format: XX.XXX.XXXX (e.g., 10.100.1001)
    Date format: DD.MM.YYYY (e.g., 19.03.2003)

    Key differences:
    - POZ first segment: 10-99 (categories)
    - Date first segment: 01-31 (days)
    - POZ second segment: 100-999 or 2-3 digits representing sub-categories
    - Date second segment: 01-12 (months)
    """
    parts = poz_str.split('.')
    if len(parts) != 3:
        return False

    # If second part is 01-12 (possible month) and first part is 01-31 (possible day)
    # and third part is 1900-2100 (possible year), it's likely a date
    try:
        first = int(parts[0])
        second = int(parts[1])
        third = int(parts[2])

        # Date check: day 1-31, month 1-12, year 1900-2100
        if 1 <= first <= 31 and 1 <= second <= 12 and 1900 <= third <= 2100:
            return True

    except ValueError:
        return False

    return False

# Price pattern: Turkish format with dots for thousands, comma for decimal
# Must have either comma (decimal) or be a large number with thousand separator dots
PRICE_PATTERN = re.compile(r'[\d]{1,3}(?:\.[\d]{3})+,[\d]{2}|[\d]+,[\d]{2}')

# Page marker pattern
PAGE_MARKER_PATTERN = re.compile(r'^-\d+-$')

# Date pattern (not a POZ!)
DATE_PATTERN = re.compile(r'^\d{2}\.\d{2}\.\d{4}$')

# Section header pattern (contains ".-")
SECTION_HEADER_PATTERN = re.compile(r'\d{2}\.\d{2,3}\.-')

# Category header pattern - ends with "Rayiçleri" or all uppercase
CATEGORY_PATTERN = re.compile(r'.*Rayiçleri$')

# POZ reference patterns - these indicate the POZ is being referenced, not defined
# Examples: "10.110.1001 (02.002) poz nolu", "BFT 15.550.1202 pozundan"
# POZ reference patterns - these indicate the POZ is being referenced, not defined
# Examples: "10.110.1001 (02.002) poz nolu", "BFT 15.550.1202 pozundan"
# Also handles Turkish locative suffix "'de" / "'da" (in/at) like "25.615.1300 'de belirtildiği gibi"
# "ile aynı" means "same as" - indicates reference to another POZ
POZ_REFERENCE_KEYWORDS = ['poz nolu', 'pozundan', 'pozuna', 'pozunu', 'poz no', 'pozların', 'pozundaki',
                          "'de ", "'da ", "'den ", "'dan ", "'deki", "'daki", 'ile aynı']


def is_garbage_line(line: str) -> bool:
    """Check if line should be skipped as garbage."""
    stripped = line.strip()

    # Empty or very short lines
    if len(stripped) <= 2:
        return True

    # Date lines
    if DATE_PATTERN.match(stripped):
        return True

    # Page markers like -2-, -13-
    if PAGE_MARKER_PATTERN.match(stripped):
        return True

    # NOTE: Section headers like "10.100.-İşçilik Rayiçleri" are now handled
    # in parse_file() for category extraction, not skipped here

    # Header fragments
    if stripped in HEADER_FRAGMENTS:
        return True

    # Lines starting with "Not:" or "NOT:"
    if stripped.startswith('Not:') or stripped.startswith('NOT:') or stripped.startswith('NOT '):
        return True

    # Formula lines
    if '=' in stripped and re.search(r'[A-Z]\s*=\s*[\d,\.]+\s*x', stripped):
        return True

    return False


def is_poz_reference(line: str, poz_end_pos: int) -> bool:
    """
    Check if a POZ number in this line is a reference (not a real entry).

    References are POZ numbers mentioned in notes/descriptions, not actual price entries.
    Examples:
    - "10.110.1001 (02.002) poz nolu, ..." - reference with alt code
    - "BFT 15.550.1202 pozundan hesaplanacaktır" - reference in note
    - "Poz : 19.100.2493 (07.004) - Taşıma mesafeleri..." - reference with Poz: prefix
    """
    stripped = line.strip()
    after_poz = stripped[poz_end_pos:].strip().lower()

    # Check if line starts with "Poz", "Poz.", "Poz:" etc. - these are references
    if re.match(r'^poz[\s.:]+', stripped, re.IGNORECASE):
        return True

    # Check if POZ is followed by parenthetical alt code like (02.002)
    if re.match(r'^\s*\(\d{2}\.\d{3}\)', after_poz):
        return True

    # Check if line contains POZ reference keywords after the POZ number
    for keyword in POZ_REFERENCE_KEYWORDS:
        if keyword in after_poz:
            return True

    # Check if POZ is preceded by "BFT" (Birim Fiyat Tarifleri reference)
    if re.search(r'BFT\s+\d{2}\.\d{2,3}\.\d{4}', stripped):
        return True

    return False


def is_section_header(line: str) -> bool:
    """
    Check if a POZ line is actually a section header, not a priced item.

    Section headers have POZ followed by description ending in colon or containing "(Ölçü:"
    Examples:
    - "25.102.1000 LAVABO TESİSATI: (Ölçü: Tk.)"
    - "25.106.1000 ETAJERLER: (Ölçü: Ad.)"
    - "35.510.0000 ANA HAT TESİSATI: (TS-3930)"
    """
    stripped = line.strip()

    # Check for "(Ölçü:" pattern - these are section headers
    if '(Ölçü:' in stripped or '(Ölçü :' in stripped:
        return True

    # Check for line ending with ":" after description (but not price)
    # Section headers don't have prices at end
    if stripped.endswith(':'):
        return True

    # Check for pattern like "POZ Description: (Ölçü: Unit)"
    # where description ends with colon before measure spec
    if re.search(r':\s*\(Ölçü', stripped):
        return True

    # Check for pattern "Description: (TS..." - standard reference after colon
    # These are section headers with standard codes
    if re.search(r':\s*\(TS', stripped):
        return True

    return False


def is_category_line(line: str, prev_line: str = None) -> bool:
    """Check if line is a category header."""
    stripped = line.strip()

    # Ends with "Rayiçleri"
    if CATEGORY_PATTERN.match(stripped):
        return True

    # All uppercase (but not too short) and doesn't start with parenthesis (which is a spec line)
    # Also must not contain common spec markers like "TS EN", "CEM", etc.
    # Must not end with ) which indicates it's a continuation of a description
    if (len(stripped) > 5 and stripped.isupper() and
        not POZ_PATTERN.match(stripped) and
        not stripped.startswith('(') and
        not stripped.endswith(')') and
        'TS EN' not in stripped and
        'TS ' not in stripped and
        'CEM ' not in stripped):

        # Check if previous line ends with a conjunction, indicating this is a continuation
        # Turkish conjunctions/prepositions that indicate continuation
        if prev_line:
            prev_stripped = prev_line.strip().upper()
            continuation_markers = [' VE', ' İLE', ' VEYA', ' YA DA', ' VEYA',
                                    ' İÇİN', ' DAHİL', ' OLMAK', ' OLAN', ' OLARAK']
            for marker in continuation_markers:
                if prev_stripped.endswith(marker):
                    return False

        return True

    return False


def parse_price(price_str: str) -> Optional[float]:
    """Convert Turkish price format to float."""
    if not price_str:
        return None
    # Remove dots (thousand separators) and replace comma with dot (decimal)
    cleaned = price_str.replace('.', '').replace(',', '.')
    try:
        return float(cleaned)
    except ValueError:
        return None


def extract_category_from_section_header(line: str) -> Optional[str]:
    """
    Extract category name from section headers like "10.100.-İşçilik Rayiçleri"
    Returns the category name (e.g., "İşçilik Rayiçleri") or None if not a section header.
    """
    match = re.match(r'^\d{2}\.\d{2,3}\.-(.+)$', line.strip())
    if match:
        return match.group(1).strip()
    return None


def extract_prices_from_end(text: str) -> tuple[str, list[str]]:
    """
    Extract prices from the end of a line.
    Returns (remaining_text, list_of_prices)

    Prices must be at the end of the line (only whitespace after them).
    Small numbers followed by units (like "1,20 m") are measurements, not prices.
    """
    remaining = text.strip()

    # Find all price matches
    all_prices = list(PRICE_PATTERN.finditer(remaining))

    if not all_prices:
        return remaining, []

    # Take prices from the end
    # We need to be careful - prices should be at the end of the line
    last_match = all_prices[-1]

    # Check if the last match is at the very end (no letters after it)
    after_last = remaining[last_match.end():]
    if after_last and re.search(r'[a-zA-ZçğıöşüÇĞİÖŞÜ]', after_last):
        # There's text after the last number, not a valid price line
        return remaining, []

    # Extract prices from the end, working backwards
    # A price is valid if:
    # 1. It's not followed by a unit letter
    # 2. It's reasonably sized (small decimals like 1,20 followed by 'm' are measurements)

    valid_prices = []

    # Work backwards from the end
    for match in reversed(all_prices):
        price_str = match.group()
        end_pos = match.end()
        start_pos = match.start()

        # Check what comes after this match
        char_after = remaining[end_pos] if end_pos < len(remaining) else ''

        # Skip if followed by letters (like mm, kg, etc.) - it's a measurement, not price
        if char_after and char_after.lower() in 'abcdefghijklmnopqrstuvwxyzçğıöşü':
            break  # Stop looking further back

        # Check if there's text between this price and the previous one we found
        # If there's significant text (letters), stop
        if valid_prices:
            text_between = remaining[end_pos:].strip()
            # Remove previously found prices from text_between
            for _, prev_price in valid_prices:
                text_between = text_between.replace(prev_price, '').strip()
            if text_between and re.search(r'[a-zA-ZçğıöşüÇĞİÖŞÜ]{2,}', text_between):
                break

        # Check what comes before this price
        # If it's just a number (like "1,20" before "m"), might be measurement not price
        char_before = remaining[start_pos - 1] if start_pos > 0 else ''

        # Valid price - add to list
        if ',' in price_str:
            valid_prices.insert(0, (start_pos, price_str))

        # Only extract up to 2 prices
        if len(valid_prices) >= 2:
            break

    if not valid_prices:
        return remaining, []

    # Extract the prices
    extracted = [price for _, price in valid_prices]

    if extracted:
        # Find where to cut the remaining text
        first_price_start = valid_prices[0][0]
        remaining = remaining[:first_price_start].strip()

    return remaining, extracted


def extract_unit_and_location(text: str, poz_prefix: str = None) -> tuple[str, Optional[str], Optional[str]]:
    """
    Extract unit and location from text.
    Only extracts if the section has these columns.
    Returns (remaining_text, unit, location)
    """
    remaining = text.strip()
    unit = None
    location = None

    # Only extract location if this section has location column
    if poz_prefix is None or poz_prefix in SECTIONS_WITH_LOCATIONS:
        # Check for location words first (they come after unit)
        for loc in LOCATION_WORDS:
            if remaining.endswith(loc):
                location = loc
                remaining = remaining[:-len(loc)].strip()
                break
            # Also check with space before
            loc_with_space = ' ' + loc
            if loc_with_space in remaining:
                idx = remaining.rfind(loc_with_space)
                location = loc
                remaining = remaining[:idx].strip()
                break

    # Only extract unit if this section has unit column
    if poz_prefix is None or poz_prefix in SECTIONS_WITH_UNITS:
        # Now look for unit at the end
        words = remaining.split()
        if words:
            last_word = words[-1].lower()
            # Check if last word is a known unit
            for known_unit in KNOWN_UNITS:
                if last_word == known_unit.lower() or last_word.rstrip('.') == known_unit.lower().rstrip('.'):
                    unit = words[-1]
                    remaining = ' '.join(words[:-1])
                    break

            # Special cases: "m²", "m³" might be attached
            if not unit:
                for known_unit in ['m²', 'm³', 'cm²', 'cm³', 'dm³']:
                    if remaining.endswith(known_unit):
                        unit = known_unit
                        remaining = remaining[:-len(known_unit)].strip()
                        break

    return remaining, unit, location


def preprocess_lines(lines: list[str]) -> list[str]:
    """
    Preprocess lines to fix PDF extraction artifacts.
    Specifically: merge split prices like "140.000.000,0" + "0" -> "140.000.000,00"
    """
    result = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')

        # Check if line ends with partial price (,0 or ,X where X is single digit)
        if re.search(r',\d$', line) and i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            # If next line is just a single digit, merge it
            if re.match(r'^\d$', next_line):
                line = line + next_line
                i += 1  # Skip the next line

        result.append(line)
        i += 1

    return result


def parse_file(input_path: Path) -> list[dict]:
    """Parse the input file and return list of records."""
    records = []
    current_category = None
    description_buffer = []
    prev_line = None  # Track previous non-garbage line for continuation detection

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Preprocess to fix split prices
    lines = preprocess_lines(lines)

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip garbage lines but DON'T clear buffer - buffer persists through page breaks
        if is_garbage_line(line):
            i += 1
            continue

        # Check for category (passing prev_line for continuation detection)
        if is_category_line(line, prev_line):
            current_category = line
            description_buffer = []  # Clear buffer on category change
            prev_line = line
            i += 1
            continue

        # Check for section header (like "10.100.-İşçilik Rayiçleri") for category extraction
        category_from_header = extract_category_from_section_header(line)
        if category_from_header:
            current_category = category_from_header
            prev_line = line
            i += 1
            continue

        # Check for POZ line
        poz_match = POZ_PATTERN.match(line)

        if poz_match:
            poz_no = poz_match.group(1)
            rest_of_line = line[poz_match.end():].strip()

            # Skip if this looks like a date (DD.MM.YYYY) rather than a POZ
            if is_date_not_poz(poz_no):
                description_buffer.append(line)
                prev_line = line
                i += 1
                continue

            # Check if this is a POZ reference (not a real entry) or section header
            if is_poz_reference(line, poz_match.end()):
                # This is a reference to a POZ in notes/description, not a real entry
                # Add to buffer as description text (without the POZ number part)
                description_buffer.append(line)
                i += 1
                continue

            if is_section_header(line):
                # This is a section header, not a priced item - skip but don't add to buffer
                i += 1
                continue

            # Case 1: POZ followed by description and prices on same line
            # Example: "10.100.1047 Soğuk demirci usta yardımcısı Sa 230,00"
            # Case 2: POZ followed by unit and prices (description was on previous lines)
            # Example: "10.120.1010 3.500.000,00"

            # Try to extract prices from end
            text_part, prices = extract_prices_from_end(rest_of_line)

            if prices:
                # We have prices, now figure out the description and unit
                # Extract prefix from poz_no (e.g., "10.100" from "10.100.1047")
                poz_prefix = '.'.join(poz_no.split('.')[:2])
                desc_part, unit, location = extract_unit_and_location(text_part, poz_prefix)

                # If desc_part is empty, use the buffer
                if not desc_part and description_buffer:
                    desc_part = ' '.join(description_buffer)

                # Create record
                record = {
                    'POZ_NO': poz_no,
                    'DESCRIPTION': desc_part.strip() if desc_part else '',
                    'UNIT': unit,
                    'SATIN_ALMA_YERI': location,
                    'BIRIM_FIYAT': parse_price(prices[0]) if prices else None,
                    'MONTAJ_FIYAT': parse_price(prices[1]) if len(prices) > 1 else None,
                    'CATEGORY': current_category
                }
                records.append(record)
                description_buffer = []  # Clear buffer after use
            else:
                # No prices on this line - might be multi-line entry
                # Save current buffer before looking ahead
                saved_buffer = description_buffer.copy()

                # Add rest of line to buffer if present
                if rest_of_line:
                    description_buffer = [rest_of_line]
                else:
                    description_buffer = []

                # Look ahead for prices
                j = i + 1
                found_prices = False
                while j < len(lines) and j < i + 15:  # Look ahead up to 15 lines
                    next_line = lines[j].strip()

                    # Skip garbage but continue looking
                    if is_garbage_line(next_line):
                        j += 1
                        continue

                    # If we hit another valid POZ (not reference), stop looking
                    next_poz_match = POZ_PATTERN.match(next_line)
                    if next_poz_match:
                        # Check if this is a real POZ entry (not a reference)
                        if not is_poz_reference(next_line, next_poz_match.end()) and not is_section_header(next_line):
                            break

                    # If we hit a category, stop looking
                    if is_category_line(next_line):
                        break

                    # Try to extract prices
                    text_part, prices = extract_prices_from_end(next_line)

                    if prices:
                        # Found prices!
                        # Extract prefix from poz_no (e.g., "10.100" from "10.100.1047")
                        poz_prefix = '.'.join(poz_no.split('.')[:2])
                        desc_part, unit, location = extract_unit_and_location(text_part, poz_prefix)

                        # Combine saved buffer with current buffer and any remaining description
                        full_desc_parts = saved_buffer + description_buffer
                        if desc_part:
                            full_desc_parts.append(desc_part)
                        full_desc = ' '.join(full_desc_parts)

                        record = {
                            'POZ_NO': poz_no,
                            'DESCRIPTION': full_desc.strip(),
                            'UNIT': unit,
                            'SATIN_ALMA_YERI': location,
                            'BIRIM_FIYAT': parse_price(prices[0]) if prices else None,
                            'MONTAJ_FIYAT': parse_price(prices[1]) if len(prices) > 1 else None,
                            'CATEGORY': current_category
                        }
                        records.append(record)
                        description_buffer = []
                        found_prices = True
                        i = j
                        break
                    else:
                        # Add to description buffer
                        description_buffer.append(next_line)

                    j += 1

                if not found_prices:
                    # Couldn't find prices - this might be a section header or incomplete entry
                    # Combine buffers for description
                    full_desc_parts = saved_buffer + description_buffer
                    full_desc = ' '.join(full_desc_parts)

                    # Only record if we have something meaningful
                    if full_desc or rest_of_line:
                        record = {
                            'POZ_NO': poz_no,
                            'DESCRIPTION': full_desc.strip(),
                            'UNIT': None,
                            'SATIN_ALMA_YERI': None,
                            'BIRIM_FIYAT': None,
                            'MONTAJ_FIYAT': None,
                            'CATEGORY': current_category
                        }
                        records.append(record)
                    description_buffer = []
        else:
            # Not a POZ line - add to description buffer for next POZ
            description_buffer.append(line)

        prev_line = line
        i += 1

    return records


def main():
    """Main entry point."""
    script_dir = Path(__file__).parent
    input_path = script_dir / 'input.txt'
    output_path = script_dir / 'output.xlsx'

    print(f"Parsing {input_path}...")
    records = parse_file(input_path)

    print(f"Found {len(records)} records")

    # Create DataFrame
    df = pd.DataFrame(records)

    # Reorder columns
    columns = ['POZ_NO', 'DESCRIPTION', 'UNIT', 'SATIN_ALMA_YERI',
               'BIRIM_FIYAT', 'MONTAJ_FIYAT', 'CATEGORY']
    df = df[columns]

    # Save to Excel
    print(f"Saving to {output_path}...")
    df.to_excel(output_path, index=False, engine='openpyxl')

    # Print summary
    print("\n=== Summary ===")
    print(f"Total records: {len(df)}")
    print(f"Records with prices: {df['BIRIM_FIYAT'].notna().sum()}")
    print(f"Records with installation prices: {df['MONTAJ_FIYAT'].notna().sum()}")
    print(f"Records with units: {df['UNIT'].notna().sum()}")
    print(f"Records with locations: {df['SATIN_ALMA_YERI'].notna().sum()}")
    print(f"Unique categories: {df['CATEGORY'].nunique()}")

    # Show sample records
    print("\n=== Sample Records ===")
    print(df.head(10).to_string())

    print(f"\nOutput saved to: {output_path}")


if __name__ == '__main__':
    main()
