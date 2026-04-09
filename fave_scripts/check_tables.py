
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

def check_table_relationship():
    database_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Check if tables are actually the same
        cur.execute("SELECT table_name, table_type FROM information_schema.tables WHERE table_name IN ('ph_schools', 'schools_IERN')")
        tables = cur.fetchall()
        print(f"Tables found: {tables}")

        for table, ttype in tables:
            print(f"\n--- Triggers for {table} ---")
            cur.execute(f"SELECT trigger_name, event_manipulation, condition_timing, action_statement FROM information_schema.triggers WHERE event_object_table = '{table}'")
            triggers = cur.fetchall()
            if triggers:
                for t in triggers:
                    print(t)
            else:
                print("No triggers found.")

        # Check if one is a view of the other
        cur.execute("SELECT view_definition FROM information_schema.views WHERE table_name = 'schools_IERN'")
        view = cur.fetchone()
        if view:
            print(f"\nschools_IERN is a VIEW: {view[0][:200]}...")
        else:
            print("\nschools_IERN is NOT a view.")

        cur.execute("SELECT view_definition FROM information_schema.views WHERE table_name = 'ph_schools'")
        view = cur.fetchone()
        if view:
            print(f"ph_schools is a VIEW: {view[0][:200]}...")
        else:
            print("ph_schools is NOT a view.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    check_table_relationship()
