#!/usr/bin/env python3
"""
CSB PDF Parser using Google Gemini API

Processes PDF pages one by one using Gemini vision capabilities
to extract structured construction unit price data into Excel.

Handles rate limiting with proper backoff and checkpointing.
"""

import os
import json
import time
import base64
from pathlib import Path
from typing import Optional
import pandas as pd

# PDF processing
try:
    import fitz  # PyMuPDF
except ImportError:
    print("Installing PyMuPDF...")
    os.system("python -m pip install PyMuPDF")
    import fitz

# Google Gemini API
try:
    import google.generativeai as genai
except ImportError:
    print("Installing google-generativeai...")
    os.system("python -m pip install google-generativeai")
    import google.generativeai as genai


# Configuration
GEMINI_API_KEY = "AIzaSyDBbmY69ia4gBP2AKlivLZbWAn3GDofWoA"
MODEL_NAME = "gemini-2.0-flash"  # Use flash for speed and cost efficiency
MAX_RETRIES = 5
BASE_RETRY_DELAY = 60  # Start with 60 seconds for rate limit errors
DELAY_BETWEEN_PAGES = 4  # Seconds between successful requests (free tier: ~15 RPM)


# Extraction prompt for Gemini
EXTRACTION_PROMPT = """You are a data extraction expert. Analyze this PDF page containing Turkish construction unit prices (CSB - Çevre ve Şehircilik Bakanlığı Birim Fiyat).

Extract ALL POZ entries from this page into a structured JSON format. Each entry should have:
- poz_no: The POZ number (format: XX.XXX.XXXX or XX.XXX.XXXXX, e.g., "10.100.1047", "25.100.1001")
- description: The item description (Turkish text)
- unit: The measurement unit if present (e.g., "Sa", "Ton", "m³", "Ad.", "Kg", "Tk.") - may be null
- location: The purchase/delivery location if present (e.g., "Fabrikada", "Depoda", "İşbaşında", "Ocakta") - may be null
- birim_fiyat: The unit price (as a number, convert Turkish format 1.234,56 to 1234.56) - may be null
- montaj_fiyat: The installation/montage price if present (as a number) - may be null
- category: The category/section name from the page header (e.g., "İşçilik Rayiçleri", "Malzeme Rayiçleri", "Sıhhi Tesisat")

IMPORTANT RULES:
1. Extract ONLY actual POZ entries (lines starting with POZ numbers like 10.100.1047, 25.100.1001, 35.100.1101)
2. DO NOT extract dates (like 01.01.2026) as POZ numbers
3. DO NOT extract page numbers or header information as entries
4. DO NOT extract section headers like "25.100.1000 LAVABOLAR" as priced entries (they have no prices)
5. If a description spans multiple lines, combine them
6. Convert Turkish number format (1.234.567,89) to standard decimal (1234567.89)
7. The category should be extracted from the page header/title (appears at top of page)
8. If no entries are found on this page, return an empty array

Return ONLY valid JSON in this exact format:
{
  "page_category": "extracted category name from header",
  "entries": [
    {
      "poz_no": "XX.XXX.XXXX",
      "description": "item description",
      "unit": "unit or null",
      "location": "location or null", 
      "birim_fiyat": 1234.56,
      "montaj_fiyat": 789.12,
      "category": "category name"
    }
  ]
}

If there's an error or no data, return: {"page_category": null, "entries": []}
"""


def setup_gemini(api_key: str) -> genai.GenerativeModel:
    """Configure and return Gemini model."""
    genai.configure(api_key=api_key)
    
    # Configure generation settings
    generation_config = {
        "temperature": 0.1,  # Low temperature for consistent extraction
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    }
    
    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=generation_config,
    )
    
    return model


def pdf_page_to_image(pdf_path: Path, page_num: int, dpi: int = 150) -> bytes:
    """Convert a PDF page to PNG image bytes."""
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num)
    
    # Render page to pixmap
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat)
    
    # Convert to PNG bytes
    img_bytes = pix.tobytes("png")
    
    doc.close()
    return img_bytes


def get_pdf_page_count(pdf_path: Path) -> int:
    """Get total number of pages in PDF."""
    doc = fitz.open(pdf_path)
    count = len(doc)
    doc.close()
    return count


def load_checkpoint(checkpoint_path: Path) -> tuple[int, list[dict], str]:
    """Load checkpoint if exists. Returns (last_page, entries, category)."""
    if checkpoint_path.exists():
        with open(checkpoint_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('last_page', 0), data.get('entries', []), data.get('category', None)
    return 0, [], None


def save_checkpoint(checkpoint_path: Path, last_page: int, entries: list[dict], category: str):
    """Save checkpoint for resume capability."""
    with open(checkpoint_path, 'w', encoding='utf-8') as f:
        json.dump({
            'last_page': last_page,
            'entries': entries,
            'category': category
        }, f, ensure_ascii=False, indent=2)


def process_page_with_gemini(model: genai.GenerativeModel, image_bytes: bytes, page_num: int) -> dict:
    """Send a page image to Gemini and get extracted data."""
    
    for attempt in range(MAX_RETRIES):
        try:
            # Create image part for Gemini
            image_part = {
                "mime_type": "image/png",
                "data": base64.b64encode(image_bytes).decode("utf-8")
            }
            
            # Send to Gemini
            response = model.generate_content([
                EXTRACTION_PROMPT,
                image_part
            ])
            
            # Parse JSON response
            response_text = response.text.strip()
            
            # Clean response if needed (remove markdown code blocks)
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            result = json.loads(response_text)
            return result
            
        except json.JSONDecodeError as e:
            print(f"\n  Page {page_num + 1}: JSON parse error (attempt {attempt + 1}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(5)
            else:
                return {"page_category": None, "entries": []}
                
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "quota" in error_str.lower() or "rate" in error_str.lower():
                # Rate limit - use exponential backoff with longer delays
                delay = BASE_RETRY_DELAY * (2 ** attempt)
                print(f"\n  Page {page_num + 1}: Rate limit hit (attempt {attempt + 1}/{MAX_RETRIES}). Waiting {delay}s...")
                time.sleep(delay)
            else:
                print(f"\n  Page {page_num + 1}: Error (attempt {attempt + 1}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(10)
                else:
                    return {"page_category": None, "entries": []}
    
    return {"page_category": None, "entries": []}


def process_pdf(pdf_path: Path, api_key: str, start_page: int = 0, end_page: Optional[int] = None, 
                resume: bool = True) -> list[dict]:
    """Process all pages of PDF and extract data."""
    
    print(f"Setting up Gemini API with model: {MODEL_NAME}")
    model = setup_gemini(api_key)
    
    total_pages = get_pdf_page_count(pdf_path)
    print(f"PDF has {total_pages} pages")
    
    if end_page is None:
        end_page = total_pages
    
    # Checkpoint handling
    checkpoint_path = pdf_path.parent / f".checkpoint_{pdf_path.stem}.json"
    
    all_entries = []
    current_category = None
    
    if resume:
        last_page, all_entries, current_category = load_checkpoint(checkpoint_path)
        if last_page > start_page:
            print(f"Resuming from page {last_page + 1} (checkpoint found with {len(all_entries)} entries)")
            start_page = last_page + 1
    
    for page_num in range(start_page, min(end_page, total_pages)):
        print(f"Processing page {page_num + 1}/{total_pages}...", end=" ", flush=True)
        
        # Convert page to image
        image_bytes = pdf_page_to_image(pdf_path, page_num)
        
        # Process with Gemini
        result = process_page_with_gemini(model, image_bytes, page_num)
        
        # Update category if found
        if result.get("page_category"):
            current_category = result["page_category"]
        
        # Add entries
        entries = result.get("entries", [])
        
        # Ensure category is set for all entries
        for entry in entries:
            if not entry.get("category") and current_category:
                entry["category"] = current_category
        
        all_entries.extend(entries)
        print(f"Found {len(entries)} entries (total: {len(all_entries)})")
        
        # Save checkpoint after each page
        save_checkpoint(checkpoint_path, page_num, all_entries, current_category)
        
        # Delay between pages to avoid rate limiting
        if page_num < end_page - 1:
            print(f"  Waiting {DELAY_BETWEEN_PAGES}s before next page...", flush=True)
            time.sleep(DELAY_BETWEEN_PAGES)
    
    # Clean up checkpoint on successful completion
    if checkpoint_path.exists() and start_page == 0:
        checkpoint_path.unlink()
    
    return all_entries


def entries_to_dataframe(entries: list[dict]) -> pd.DataFrame:
    """Convert extracted entries to pandas DataFrame."""
    
    if not entries:
        return pd.DataFrame()
    
    # Standardize column names
    df = pd.DataFrame(entries)
    
    # Rename columns to match expected output format
    column_mapping = {
        "poz_no": "POZ_NO",
        "description": "DESCRIPTION",
        "unit": "UNIT",
        "location": "SATIN_ALMA_YERI",
        "birim_fiyat": "BIRIM_FIYAT",
        "montaj_fiyat": "MONTAJ_FIYAT",
        "category": "CATEGORY"
    }
    
    df = df.rename(columns=column_mapping)
    
    # Ensure all expected columns exist
    expected_columns = ["POZ_NO", "DESCRIPTION", "UNIT", "SATIN_ALMA_YERI", 
                       "BIRIM_FIYAT", "MONTAJ_FIYAT", "CATEGORY"]
    for col in expected_columns:
        if col not in df.columns:
            df[col] = None
    
    # Reorder columns
    df = df[expected_columns]
    
    # Clean up None/null values
    df = df.replace({None: pd.NA, "null": pd.NA, "": pd.NA})
    
    return df


def main():
    """Main entry point."""
    script_dir = Path(__file__).parent
    pdf_path = script_dir / "input.pdf"
    output_path = script_dir / "output_gemini.xlsx"
    
    # Check for API key
    api_key = GEMINI_API_KEY
    if not api_key:
        # Try to read from file
        key_file = script_dir / ".gemini_key"
        if key_file.exists():
            api_key = key_file.read_text().strip()
        else:
            print("ERROR: No Gemini API key found!")
            print("Please set GEMINI_API_KEY environment variable or create .gemini_key file")
            print("Get your API key from: https://makersuite.google.com/app/apikey")
            return
    
    if not pdf_path.exists():
        print(f"ERROR: PDF file not found: {pdf_path}")
        return
    
    print(f"Processing: {pdf_path}")
    print(f"Using {DELAY_BETWEEN_PAGES}s delay between pages (free tier rate limiting)")
    print("=" * 60)
    
    # Process PDF
    entries = process_pdf(pdf_path, api_key)
    
    print("=" * 60)
    print(f"Total entries extracted: {len(entries)}")
    
    # Convert to DataFrame
    df = entries_to_dataframe(entries)
    
    # Save to Excel
    print(f"Saving to: {output_path}")
    df.to_excel(output_path, index=False, engine="openpyxl")
    
    # Print summary
    print("\n=== Summary ===")
    print(f"Total records: {len(df)}")
    print(f"Records with prices: {df['BIRIM_FIYAT'].notna().sum()}")
    print(f"Records with installation prices: {df['MONTAJ_FIYAT'].notna().sum()}")
    print(f"Records with units: {df['UNIT'].notna().sum()}")
    print(f"Records with locations: {df['SATIN_ALMA_YERI'].notna().sum()}")
    print(f"Unique categories: {df['CATEGORY'].nunique()}")
    
    if len(df) > 0:
        print("\n=== Sample Records ===")
        print(df.head(10).to_string())
    
    print(f"\nOutput saved to: {output_path}")


if __name__ == "__main__":
    main()
