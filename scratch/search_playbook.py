with open('c:/Users/D/Downloads/CitySync_Web/simulation.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's search for "barricading" or "manpower" or "diversion" inside simulation.html
import re
print("Occurrences of barricading in simulation.html:")
for match in re.finditer(r'.{0,50}barricading.{0,50}', content):
    print(match.group(0))

print("\nOccurrences of manpower in simulation.html:")
for match in re.finditer(r'.{0,50}manpower.{0,50}', content):
    print(match.group(0))
