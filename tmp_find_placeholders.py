import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()

# Find rows where division, district, and municipality are effectively the same as province
cur.execute("""
    SELECT id, region, province, division, district, municipality, legislative_district 
    FROM all_locations 
    WHERE (UPPER(division) = UPPER(province) OR division IS NULL)
      AND (UPPER(district) = UPPER(province) OR district IS NULL)
      AND (UPPER(municipality) = UPPER(province) OR municipality IS NULL)
      AND legislative_district IS NOT NULL
""")
rows = cur.fetchall()
print(f"Found {len(rows)} placeholder rows.")
for row in rows[:10]:
    print(row)

cur.close()
conn.close()
