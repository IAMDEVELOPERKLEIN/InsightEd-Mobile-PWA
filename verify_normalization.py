import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()

def check_caps(table, columns):
    print(f"\nChecking table: {table}")
    for col in columns:
        cur.execute(f"SELECT DISTINCT {col} FROM {table} WHERE {col} IS NOT NULL LIMIT 5")
        samples = [row[0] for row in cur.fetchall()]
        all_caps = all(s.isupper() or not any(c.islower() for c in s) for s in samples)
        status = "[OK] ALL CAPS" if all_caps else "[FAIL] MIXED CASE"
        print(f"  {col}: {status} - Samples: {samples}")

check_caps('all_locations', ['region', 'province', 'division', 'municipality'])
check_caps('all_new_locations', ['region', 'province', 'barangay'])
check_caps('ph_barangays', ['region', 'province', 'barangay'])
check_caps('engineer_form', ['region', 'province', 'division', 'municipality'])
check_caps('users', ['region', 'province', 'barangay'])

cur.close()
conn.close()
