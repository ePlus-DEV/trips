from pathlib import Path

p = Path('index.html')
text = p.read_text()
text = text.replace('<a href="./flights/">Flight prices</a>', '<a href="./flights/" data-flight-nav="1">Flight prices</a>', 1)
text = text.replace('<a class="btn" href="./flights/">✈ Watch flight prices →</a>', '<a class="btn" href="./flights/" data-flight-hero="1">✈ Watch flight prices →</a>', 1)
p.write_text(text)
Path('.github/workflows/fix-i18n-link-markers.yml').unlink(missing_ok=True)
Path('scripts/fix-i18n-link-markers.py').unlink(missing_ok=True)
print('Added flight-link markers to prevent duplicate fallback links.')
