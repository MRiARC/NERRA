import os
import sys
import time
import urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

output_dir = Path("/Users/adarshchauhan/Desktop/Desktop - Adarsh’s MacBook Pro/01_Projects/nerra/samples/weapons_of_mass_destruction")
output_dir.mkdir(parents=True, exist_ok=True)
combined_file = output_dir / "weapons_of_mass_destruction_20ch.txt"

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": "https://novelphoenix.com/",
}

print("=" * 80)
print("FETCHING CHAPTERS 1 TO 20: Weapons of Mass Destruction")
print(f"Destination: {output_dir}")
print("=" * 80)

for ch in range(1, 21):
    ch_filename = f"chapter_{ch:02d}.txt"
    ch_path = output_dir / ch_filename
    
    if ch_path.exists() and ch_path.stat().st_size > 500:
        words = len(ch_path.read_text(encoding="utf-8").split())
        print(f"✓ Chapter {ch:02d} already exists on disk ({words:,} words) -> skipping fetch")
        continue

    url = f"https://novelphoenix.com/novel/weapons-of-mass-destruction/chapter-{ch}"
    success = False
    
    for attempt in range(1, 7):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=20) as resp:
                html = resp.read().decode("utf-8")
            
            soup = BeautifulSoup(html, "html.parser")
            content_div = soup.find("div", id="content")
            if not content_div:
                raise ValueError("Could not find div with id='content'")
            
            # Decompose any script, style, or ad elements
            for el in content_div(["script", "style", "iframe"]):
                el.decompose()
            
            h3 = content_div.find("h3")
            raw_title = h3.get_text(strip=True) if h3 else f"Chapter {ch}"
            
            # Extract paragraphs
            paras = [p.get_text(strip=True) for p in content_div.find_all("p") if p.get_text(strip=True)]
            
            filtered_paras = []
            for p in paras:
                if "Please let us know so we can fix it" in p or "Share to your friends" in p:
                    continue
                filtered_paras.append(p)
            
            chapter_header = f"CHAPTER {ch}"
            if raw_title and raw_title.lower() != f"chapter {ch}":
                chapter_header = f"CHAPTER {ch}: {raw_title}"
            
            chapter_text = f"{chapter_header}\n\n" + "\n\n".join(filtered_paras) + "\n"
            ch_path.write_text(chapter_text, encoding="utf-8")
            
            words = len(chapter_text.split())
            print(f"✓ Chapter {ch:02d} fetched & saved ({words:,} words, {len(filtered_paras)} paragraphs) -> {ch_filename}")
            success = True
            time.sleep(1.5)
            break
        except urllib.error.HTTPError as e:
            wait_sec = 6 * attempt
            print(f"  [Attempt {attempt}/6] HTTP Error {e.code} for Chapter {ch}. Cooling down for {wait_sec}s...")
            time.sleep(wait_sec)
        except Exception as e:
            wait_sec = 4 * attempt
            print(f"  [Attempt {attempt}/6] Error fetching Chapter {ch}: {e}. Retrying in {wait_sec}s...")
            time.sleep(wait_sec)
            
    if not success:
        print(f"✗ Failed to fetch Chapter {ch} after 6 attempts.")
        sys.exit(1)

# Assemble combined full manuscript
all_chapters_content = []
stats = []

for ch in range(1, 21):
    ch_path = output_dir / f"chapter_{ch:02d}.txt"
    text = ch_path.read_text(encoding="utf-8")
    all_chapters_content.append(text.strip())
    words = len(text.split())
    chars = len(text)
    stats.append({"chapter": ch, "words": words, "chars": chars})

combined_text = "\n\n".join(all_chapters_content) + "\n"
combined_file.write_text(combined_text, encoding="utf-8")

total_words = sum(s["words"] for s in stats)
total_chars = sum(s["chars"] for s in stats)
print("=" * 80)
print(f"Successfully collected all {len(stats)} chapters!")
print(f"Total Words: {total_words:,}")
print(f"Total Characters: {total_chars:,}")
print(f"Directory: {output_dir}")
print(f"Combined manuscript: {combined_file}")
print("=" * 80)
