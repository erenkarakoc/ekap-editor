#!/usr/bin/env python3
"""
PDF Text Extraction Script for CSB Construction Unit Prices

Uses pdfplumber to properly extract text from input.pdf, handling
table structures and multi-column layouts.

Output: input.txt with clean UTF-8 encoded text
"""

import pdfplumber
from pathlib import Path
import sys


def extract_pdf_text(pdf_path: Path, output_path: Path) -> None:
    """
    Extract text from PDF file and save to text file.

    Uses pdfplumber's text extraction which handles tables better
    than standard PDF text extraction methods.
    """
    print(f"Opening PDF: {pdf_path}")
    sys.stdout.flush()

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")
        sys.stdout.flush()

        # Write directly to file to avoid memory issues with large PDFs
        with open(output_path, 'w', encoding='utf-8') as f:
            for i, page in enumerate(pdf.pages, 1):
                if i % 10 == 0 or i == 1:
                    print(f"Processing page {i}/{total_pages}...")
                    sys.stdout.flush()

                # Extract text from page - simpler extraction without layout
                # to be faster on large documents
                text = page.extract_text()

                if text:
                    # Add page marker for reference
                    f.write(f"-{i}-\n")
                    f.write(text)
                    f.write('\n')

    print(f"Extraction complete!")
    sys.stdout.flush()


def main():
    """Main entry point."""
    script_dir = Path(__file__).parent
    pdf_path = script_dir / 'input.pdf'
    output_path = script_dir / 'input.txt'

    if not pdf_path.exists():
        print(f"Error: PDF file not found: {pdf_path}")
        return

    extract_pdf_text(pdf_path, output_path)
    print("Done!")


if __name__ == '__main__':
    main()
