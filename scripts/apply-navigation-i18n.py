from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Expected source not found for: {label}")
    return text.replace(old, new, 1)


root = Path('.')
index_path = root / 'index.html'
flights_path = root / 'flights.html'
sw_path = root / 'sw.js'
readme_path = root / 'README.md'

index = index_path.read_text()

# Visible navigation to the price watcher.
index = replace_once(
    index,
    '<nav aria-label="Primary navigation"><a href="#next">Next trip</a><a href="#itinerary">Itinerary</a><a href="#places">Places</a><a href="#planner">Planner</a></nav>',
    '<nav aria-label="Primary navigation"><a href="#next">Next trip</a><a href="#itinerary">Itinerary</a><a href="#places">Places</a><a href="./flights/">Flight prices</a><a href="#planner">Planner</a></nav>',
    'desktop flight navigation',
)

index = replace_once(
    index,
    '<div class="hero-actions"><a class="btn primary" href="#next">View next journey →</a><a class="btn" href="#itinerary">Open itinerary</a></div>',
    '<div class="hero-actions"><a class="btn primary" href="#next">View next journey →</a><a class="btn" href="./flights/">✈ Watch flight prices →</a><a class="btn" href="#itinerary">Open itinerary</a></div>',
    'hero flight link',
)

index = replace_once(
    index,
    '<article class="quick"><div class="quick-icon">✈️</div><h3>Flights</h3><p>Outbound 20 Oct · Return 25/26 Oct. Add booking details when confirmed.</p><a class="btn small" href="https://www.google.com/travel/flights" target="_blank" rel="noopener">Open flights ↗</a></article>',
    '<article class="quick"><div class="quick-icon">✈️</div><h3>Flights</h3><p>Outbound 20 Oct · Return 25/26 Oct. Track live Google Flights prices before booking.</p><a class="btn small" href="./flights/">Watch flight prices →</a></article>',
    'flight essentials card',
)

# Make Flight Prices reachable from the mobile bottom navigation too.
index = replace_once(
    index,
    '.mobile-nav{display:grid;grid-template-columns:repeat(4,1fr);',
    '.mobile-nav{display:grid;grid-template-columns:repeat(5,1fr);',
    'mobile nav five columns',
)
index = replace_once(
    index,
    '<nav class="mobile-nav" aria-label="Mobile navigation"><a href="#next"><b>✈</b>Trip</a><a href="#itinerary"><b>☷</b>Plan</a><a href="#planner"><b>✓</b>Ready</a><a href="#notes"><b>✎</b>Notes</a></nav>',
    '<nav class="mobile-nav" aria-label="Mobile navigation"><a href="#next"><b>✈</b>Trip</a><a href="./flights/"><b>💸</b>Flight prices</a><a href="#itinerary"><b>☷</b>Plan</a><a href="#planner"><b>✓</b>Ready</a><a href="#notes"><b>✎</b>Notes</a></nav>',
    'mobile flight navigation',
)

# Fix existing trip-day off-by-one and replace the ambiguous flight-leg stat.
index = replace_once(
    index,
    '<div class="stat"><strong>3</strong><span>flight legs max</span></div>',
    '<div class="stat"><strong>2</strong><span>return options</span></div>',
    'return option stat',
)
index = replace_once(
    index,
    "$('#tripDays').textContent=Math.round((end-departure)/dayMs)+1;",
    "$('#tripDays').textContent=Math.floor((end-departure)/dayMs)+1;",
    'trip day calculation',
)

if '<script src="./i18n.js"></script>' not in index:
    index = index.replace('</body>', '<script src="./i18n.js"></script>\n</body>', 1)
index_path.write_text(index)

flights = flights_path.read_text()
if '<script src="./i18n.js"></script>' not in flights:
    flights = flights.replace('</body>', '<script src="./i18n.js"></script>\n</body>', 1)
flights_path.write_text(flights)

sw = sw_path.read_text()
sw = sw.replace("const CACHE='travel-log-v3';", "const CACHE='travel-log-v4';")
if "'./i18n.js'" not in sw:
    sw = sw.replace("'./flights.html',", "'./flights.html','./i18n.js',")
sw_path.write_text(sw)

readme = readme_path.read_text()
marker = '## Local development\n'
section = '''## Navigation & languages\n\nThe main dashboard links directly to the flight price watcher from the desktop navigation, hero actions, Flights essentials card and mobile navigation.\n\nThe dashboard and flight-price page share `i18n.js` with these languages:\n\n- English\n- Tiếng Việt\n- 中文 (Simplified Chinese)\n- 日本語\n\nThe selected language is stored in `localStorage` as `travel-language`; otherwise the browser language is detected automatically.\n\n'''
if section not in readme:
    if marker not in readme:
        raise SystemExit('README local development marker not found')
    readme = readme.replace(marker, section + marker, 1)
readme_path.write_text(readme)

# This is a one-shot repository migration. Do not keep the helper workflow/script.
Path('.github/workflows/apply-navigation-i18n.yml').unlink(missing_ok=True)
Path('scripts/apply-navigation-i18n.py').unlink(missing_ok=True)

print('Navigation + multilingual patch applied successfully.')
