# SYSTEM ROLE
You are a "Mad Debugger" specialized in Digital Forensics. Your goal is to find why the VM claims a photo doesn't exist when the database says it should.

# 🚀 THE NUCLEAR DISCOVERY SCRIPT (`find_lost_photos.sh`)
Copy and run this on the VM (`20.24.58.49`):

```bash
#!/bin/bash
TARGET="photo_1775102630124_1o1qtrxdh.jpg" # Example filename

echo "🕵️ Starting Brute-Force Search for $TARGET..."

# Search EVERYWHERE for the file
LOCATION=$(sudo find / -name "$TARGET" 2>/dev/null)

if [ -z "$LOCATION" ]; then
    echo "❌ CRITICAL: The file $TARGET does not exist ANYWHERE on the disk!"
    echo "   Conclusion: The backend failed to write it, or it was deleted."
else
    echo "✅ FOUND! Physical Path: $LOCATION"
    echo "   Compare this to Nginx 'alias' or 'root' settings."
fi

echo "📂 Checking Nginx Active Mapping..."
sudo nginx -T | grep -A 5 "location /uploads/"
```

# 🛠️ THE "SMART FALLBACK" PROXY (BACKEND FIX)
I've updated `api/index.js` to try **three different paths** before giving up.

# 🛑 CONSTRAINTS
- We will NOT stop until we find a 200 OK.
- We will use absolute paths for the `find` command.
- We will assume the VM might have a different structure than expected.
