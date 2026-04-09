import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute("SELECT school_id, school_name FROM ph_schools WHERE school_id::text LIKE '9%' ORDER BY school_id")
rows = cur.fetchall()
with open('school_list.md', 'w', encoding='utf-8') as f:
    f.write("# Updated 9-Series Schools\n\n")
    for r in rows:
        f.write(f"- {r[0]}: {r[1]}\n")
cur.close()
conn.close()
