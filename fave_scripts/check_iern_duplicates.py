
import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env')

def check_duplicates():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ Error: DATABASE_URL not found in .env file.")
        return

    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Check if table exists (case insensitive)
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE 'schools_iern'")
        table = cur.fetchone()
        if not table:
            print("❌ Error: Table 'schools_iern' (or similar) not found.")
            return
        
        table_name = table[0]
        print(f"Found table: {table_name}")

        # Query for iern with multiple active records
        active_query = f"""
        SELECT iern, COUNT(*)
        FROM "{table_name}"
        WHERE status = 'Active'
        GROUP BY iern
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC;
        """
        cur.execute(active_query)
        active_rows = cur.fetchall()

        if not active_rows:
            print("\n✅ No iern found with multiple Active records.")
        else:
            print(f"\n[!] Found {len(active_rows)} iern values with multiple Active records:")
            print("-" * 50)
            print(f"{'IERN':<15} | {'Active Count':<12}")
            print("-" * 50)
            for iern, count in active_rows:
                print(f"{iern:<15} | {count:<12}")
            print("-" * 50)

            print("\n[+] Detailed records for these problematic IERNs:")
            for iern, _ in active_rows:
                print(f"\nComparing Active records for IERN: {iern}")
                cur.execute(f'SELECT * FROM "{table_name}" WHERE iern = %s AND status = \'Active\'', (iern,))
                colnames = [desc[0] for desc in cur.description]
                records = cur.fetchall()
                for i, rec in enumerate(records):
                    print(f" Record {i+1}:")
                    for col, val in zip(colnames, rec):
                        print(f"  {col}: {val}")


        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database Error: {str(e)}")

if __name__ == "__main__":
    check_duplicates()
