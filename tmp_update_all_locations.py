import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()

# Update rows where division, district, and municipality are placeholders
update_query = """
    UPDATE all_locations 
    SET division = NULL, 
        district = NULL, 
        municipality = NULL 
    WHERE (UPPER(TRIM(division)) = UPPER(TRIM(province)) OR division IS NULL)
      AND (UPPER(TRIM(district)) = UPPER(TRIM(province)) OR district IS NULL)
      AND (UPPER(TRIM(municipality)) = UPPER(TRIM(province)) OR municipality IS NULL)
      AND legislative_district IS NOT NULL
      AND (division IS NOT NULL OR district IS NOT NULL OR municipality IS NOT NULL)
    RETURNING id, region, province, legislative_district
"""
try:
    cur.execute(update_query)
    updated_rows = cur.fetchall()
    conn.commit()
    print(f"Successfully updated {len(updated_rows)} rows to NULL hierarchy.")
    for row in updated_rows:
        print(f"Updated: {row}")
except Exception as e:
    conn.rollback()
    print(f"Error during update: {str(e)}")

cur.close()
conn.close()
