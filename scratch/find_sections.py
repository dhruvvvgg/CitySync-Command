import re

with open('c:/Users/D/Downloads/CitySync_Web/simulation.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Search for elements with "playbook" or sections in simulation.html
print("Sections:")
sections = re.findall(r'<!--\s*(SECTION\s+\d+.*?)\s*-->', content, re.IGNORECASE)
for sec in sections:
    print(sec)

print("\nElements with class containing playbook:")
playbook_elements = re.findall(r'<[^>]*class="[^"]*playbook[^"]*"[^>]*>', content)
for elem in playbook_elements:
    print(elem)

print("\nElements with id containing play or sec:")
id_elements = re.findall(r'<[^>]*id="[^"]*(?:play|sec)[^"]*"[^>]*>', content)
for elem in id_elements:
    print(elem)
