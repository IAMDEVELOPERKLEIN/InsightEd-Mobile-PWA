
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

def trace_school(school_id):
    database_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        tables_to_check = [
            ('schools_IERN', 'SchoolID'),
            ('ph_schools', 'school_id'),
            ('users', 'school_id'),
            ('ph_schools_completion', 'school_id'),
            ('pending_schools', 'school_id')
        ]

        for table, col in tables_to_check:
            print(f"Checking {table} for {school_id} in column {col}...")
            try:
                # Check if table exists
                cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = %s", (table,))
                if not cur.fetchone():
                    # Try quoted for schools_IERN
                    if table == 'schools_IERN':
                        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name = 'schools_IERN'")
                        if not cur.fetchone():
                            print(f"Table {table} not found.")
                            continue
                    else:
                        print(f"Table {table} not found.")
                        continue

                query = f"SELECT * FROM \"{table}\" WHERE \"{col}\" = %s"
                cur.execute(query, (school_id,))
                rows = cur.fetchall()
                if rows:
                    colnames = [desc[0] for desc in cur.description]
                    print(f"Found {len(rows)} records in {table}:")
                    for r in rows:
                        print(dict(zip(colnames, r)))
                else:
                    print(f"Not found in {table}.")
            except Exception as e:
                print(f"Error checking {table}: {e}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    trace_school('502928')
