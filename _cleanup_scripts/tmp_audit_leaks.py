import re

# Use raw string or forward slashes for Windows paths
path = r'e:\InsightEd-Mobile-PWA\api\index.js'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

leaks = []
for i, line in enumerate(lines):
    if 'pool.connect()' in line:
        # Check the next 50 lines for .release()
        chunk = "".join(lines[i:i+50])
        if '.release()' not in chunk:
            leaks.append(f"Line {i+1}: {line.strip()}")

if leaks:
    print("Potential leaks found:")
    for leak in leaks:
        print(leak)
else:
    print("No obvious leaks found in 50-line chunks.")
