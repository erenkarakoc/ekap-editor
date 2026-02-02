import pandas as pd
import re
import os

INPUT_FILE = "input.txt"
OUTPUT_FILE = "cikti_final_hatasiz_v5.xlsx"

# Birimler Listesi (Sadece kesin birimler)
KNOWN_UNITS = {
    "m2", "m3", "m", "mt", "tul", "cm", "mm",
    "kg", "gr", "ton", "kt", "kwh", "kutu", "paket",
    "adet", "ad", "ad.", "takım", "set",
    "sa", "saat", "gün", "sefer", "defa",
    "lt", "km", "ay", "yıl",
    "kg/m2", "gr/m2", "lt/m2", "ton/m3"
}

def clean_decimal(value_str):
    if not value_str: return 0.0
    try:
        val = value_str.strip()
        sign = -1 if val.startswith('-') else 1
        clean = re.sub(r'[^\d,]', '', val)
        clean = clean.replace(',', '.')
        return float(clean) * sign
    except:
        return 0.0

def is_garbage(line):
    l = line.upper().strip()
    garbage_keywords = [
        "--- PAGE", "BİRİM FİYAT EKİ", "01 OCAK 2025", "T.C.", 
        "VAKIFLAR GENEL", "KÜLTÜR VE TURİZM", "SAYFA NO", 
        "TARİHİNDEN İTİBAREN", "FİYATLARI GÖSTERİR", "RAYİÇLERİ",
        "POZ NO", "İMALAT ÇEŞİDİ", "ÖLÇÜ BİRİMİ", "MONTAJ FİYAT"
    ]
    if any(k in l for k in garbage_keywords): return True
    if re.match(r'^[\s-]*\d+[\s-]*$', l): return True 
    if l == "(TL)": return True
    return False

def is_category_header(line):
    line = line.strip()
    if not line: return False
    
    # Fiyat varsa kategori değildir
    if re.search(r'\d+,\d{2}', line): return False
    
    # KTB ve V. formatları
    if re.match(r'^(V\.|KTB\.|[0-9]+-|[A-Z]-\s|[0-9]+\s+[A-ZÇĞİÖŞÜ])', line):
        if '+' in line: return False 
        return True
    
    # Büyük harfli başlıklar
    if line.isupper() and len(line) < 60 and not any(c.isdigit() for c in line):
        ignored = ["AÇIKLAMA", "NOT", "ÖNEMLİ", "(TL)", "TL"]
        if not any(ig in line for ig in ignored):
            return True
            
    return False

def extract_data_smart(full_text, category):
    if not full_text: return None
    
    parts = full_text.split(maxsplit=1)
    poz_no = parts[0]
    content = parts[1] if len(parts) > 1 else ""
    if not content: return None

    # Fiyat Arama (Regex)
    price_pattern = r'(-?\d{1,3}(?:\.\d{3})*(?:,\d{2}))'
    matches = list(re.finditer(price_pattern, content))
    
    valid_prices = []
    
    for m in matches:
        start, end = m.span()
        
        # --- BAĞLAM KONTROLLERİ ---
        
        # 1. SOLA BAK: Sertlik Derecesi, Kalınlık vb.
        # "Sertlik Derecesi 1,25" -> 1,25 fiyat değildir.
        # "Kalınlık 1,5 cm" -> 1,5 fiyat değildir.
        pre_context = content[:start].strip()
        last_word = pre_context.split()[-1].lower() if pre_context else ""
        
        if last_word in ["derecesi", "kalınlıkta", "çapında", "ebadında", "boyutunda", "katsayı", "dereces", "sertik"]:
            continue
            
        # 2. SOLA BAK: Matematiksel işlem (+, -)
        if content[start-1] in ['+', '-', '/', '('] if start > 0 else False:
            continue
            
        # 3. SAĞA BAK: Ölçü birimi (mm, cm)
        post_text = content[end:].strip()
        next_word = post_text.split()[0].lower().strip(".,)") if post_text else ""
        
        if next_word in ["mm", "cm", "m", "gr", "kg", "kalınlıkta", "pvb", "mm)", "cm)", "inç"]:
            continue
            
        valid_prices.append(m)

    if not valid_prices: return None

    prices = []
    
    # Son 3 geçerli fiyatı al
    relevant_matches = valid_prices[-3:]
    for m in relevant_matches:
        prices.append(clean_decimal(m.group(0)))
        
    first_price_idx = relevant_matches[0].start()
    text_before_price = content[:first_price_idx].strip()

    # Birim Tespiti
    unit = ""
    description = text_before_price
    
    desc_words = text_before_price.split()
    if desc_words:
        candidate = desc_words[-1]
        clean_cand = candidate.lower().replace('(', '').replace(')', '')
        
        # Sıkı Birim Kontrolü:
        # Sadece sayıdan oluşan birim olamaz ("1,25" birim değildir)
        is_numeric = re.match(r'^[\d,.]+$', clean_cand)
        
        is_unit = False
        if not is_numeric:
            if clean_cand in KNOWN_UNITS:
                is_unit = True
            elif '/' in clean_cand and len(candidate) < 10:
                is_unit = True
            elif 'm²' in candidate or 'M³' in candidate or 'm³' in candidate:
                is_unit = True
            elif candidate.isupper() and len(candidate) < 10: # SA, ADET
                is_unit = True

        if is_unit:
            unit = candidate
            description = " ".join(desc_words[:-1])
        else:
            # Eğer son kelime birim değilse, birim BOŞTUR.
            # "Sertlik Derecesi 1,25" örneğinde 1,25 birim değildir, açıklamadır.
            pass

    # Fiyat Dağıtımı
    birim_fiyat = 0.0
    montaj_fiyat = 0.0
    demontaj_fiyat = 0.0
    
    if len(prices) == 1:
        birim_fiyat = prices[0]
    elif len(prices) == 2:
        birim_fiyat = prices[0]
        montaj_fiyat = prices[1]
    elif len(prices) >= 3:
        birim_fiyat = prices[0]
        montaj_fiyat = prices[1]
        demontaj_fiyat = prices[2]

    return {
        "Kategori": category,
        "Poz No": poz_no,
        "İmalat Çeşidi": description,
        "Ölçü Birimi": unit,
        "Birim Fiyat (TL)": birim_fiyat,
        "Montaj Fiyatı (TL)": montaj_fiyat,
        "Demontaj Fiyatı (TL)": demontaj_fiyat
    }

def main():
    if not os.path.exists(INPUT_FILE): return

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    all_data = []
    buffer = []
    current_category = "GENEL"
    
    for line in lines:
        l = line.strip()
        if not l or is_garbage(l): continue
        
        if is_category_header(l):
            if buffer:
                item = extract_data_smart(" ".join(buffer), current_category)
                if item: all_data.append(item)
                buffer = []
            current_category = l
            continue
            
        first_word = l.split()[0]
        is_poz_start = re.match(r'^(V\.|KTB\.|MSB\.|Ö\.K\.|RAYİÇ|[0-9]{2}\.|[A-Z0-9-]{3,}\.)', first_word)
        
        if is_poz_start:
            if buffer:
                item = extract_data_smart(" ".join(buffer), current_category)
                if item: all_data.append(item)
            buffer = [l]
        else:
            if buffer:
                buffer.append(l)

    if buffer:
        item = extract_data_smart(" ".join(buffer), current_category)
        if item: all_data.append(item)

    df = pd.DataFrame(all_data)
    if not df.empty:
        df = df[df['Poz No'].str.len() > 3]
        df.to_excel(OUTPUT_FILE, index=False)
        print(f"Bitti: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()