with open('c:/Users/D/Downloads/CitySync_Web/simulation.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.finditer(r'.{0,100}marker.{0,100}', content, re.IGNORECASE)
print("marker occurrences in simulation.js:")
for match in matches:
    print(match.group(0))
