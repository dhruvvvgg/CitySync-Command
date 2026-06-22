with open('c:/Users/D/Downloads/CitySync_Web/simulation.js', 'r', encoding='utf-8') as f:
    content = f.read()

import re
matches = re.finditer(r'.{0,100}\.addTo\(map\).{0,100}', content)
print("addTo(map) occurrences:")
for match in matches:
    print(match.group(0))

print("\ncurrentAnomalyMarkers.push occurrences:")
matches = re.finditer(r'.{0,100}currentAnomalyMarkers\.push.{0,100}', content)
for match in matches:
    print(match.group(0))
