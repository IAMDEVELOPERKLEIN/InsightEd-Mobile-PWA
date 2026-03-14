#!/bin/bash
# ============================================================
# vm_diagnose_and_fix.sh
# Run this script ON THE VM (SSH into it first)
# SSH: ssh Administrator1@20.24.58.49
# ============================================================

SERVER_DIR="/var/www/html/InsightEd-Mobile-PWA"
ENV_FILE="$SERVER_DIR/.env"

echo "=============================================="
echo "  InsightED VM Diagnostics & Fix Script"
echo "=============================================="

# --- STEP 1: Check .env ---
echo ""
echo "=== [1/4] Checking .env file ==="
if [ -f "$ENV_FILE" ]; then
    echo "✅ .env file EXISTS"
    echo ""
    echo "--- Current .env contents (secrets masked) ---"
    # Show keys but mask values for security
    while IFS='=' read -r key val; do
        [[ "$key" == \#* ]] && continue
        [[ -z "$key" ]] && continue
        echo "  $key = ****"
    done < "$ENV_FILE"
    echo ""

    # Check critical keys
    if grep -q "JWT_SECRET" "$ENV_FILE"; then
        JWT_VAL=$(grep "JWT_SECRET" "$ENV_FILE" | cut -d'=' -f2)
        if [ -z "$JWT_VAL" ]; then
            echo "❌ JWT_SECRET is BLANK — this will cause a 500 error!"
        else
            echo "✅ JWT_SECRET is set"
        fi
    else
        echo "❌ JWT_SECRET is MISSING from .env — this will cause a 500 error!"
    fi

    if grep -q "DATABASE_URL" "$ENV_FILE"; then
        echo "✅ DATABASE_URL is set"
    else
        echo "❌ DATABASE_URL is MISSING from .env"
    fi
else
    echo "❌ .env file NOT FOUND at $ENV_FILE"
    echo ""
    echo "ACTION REQUIRED: Create the .env file:"
    echo "  nano $ENV_FILE"
    echo ""
    echo "Minimum required content:"
    echo "  DATABASE_URL=postgres://user:pass@host:5432/dbname"
    echo "  JWT_SECRET=your_secret_key_here"
fi

# --- STEP 2: Check PM2 Status ---
echo ""
echo "=== [2/4] PM2 Process Status ==="
pm2 list

# --- STEP 3: Check DB Schema for users table ---
echo ""
echo "=== [3/4] Checking 'users' table schema ==="

if grep -q "DATABASE_URL" "$ENV_FILE" 2>/dev/null; then
    DB_URL=$(grep "DATABASE_URL" "$ENV_FILE" | cut -d'=' -f2)
    echo "Running: SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
    psql "$DB_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name;" 2>/dev/null || echo "⚠️  Could not connect to DB. Check DATABASE_URL."
else
    echo "⚠️  Skipping DB check — DATABASE_URL not found in .env"
fi

# --- STEP 4: Show recent backend logs ---
echo ""
echo "=== [4/4] Recent Backend Logs (last 30 lines) ==="
pm2 logs insighted-backend --lines 30 --nostream 2>/dev/null || pm2 logs --lines 30 --nostream

echo ""
echo "=============================================="
echo "  Diagnostics Complete"
echo "  If JWT_SECRET was blank/missing:"
echo "    1. Edit: nano $ENV_FILE"
echo "    2. Add:  JWT_SECRET=your_secret_key_here"
echo "    3. Run:  pm2 restart insighted-backend"
echo "=============================================="
