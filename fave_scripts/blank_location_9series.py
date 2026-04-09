import os
import psycopg2
from dotenv import load_dotenv

def main():
    # Load environment variables
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables.")
        return

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        print("--- InsightEd Location Reset Tool (9-series Schools) ---")
        
        # SQL Update Query
        update_query = """
            UPDATE ph_schools
            SET 
                region = 'Blank Region',
                division = 'Blank Division',
                district = 'Blank District',
                barangay = 'Blank Barangay',
                leg_district = 'Blank Legislative District',
                province = 'Blank Province',
                municipality = 'Blank Municipality'
            WHERE school_id::text LIKE '9%'
        """

        print("Executing update for school IDs starting with '9'...")
        cur.execute(update_query)
        rows_affected = cur.rowcount
        
        # Commit the transaction
        conn.commit()
        
        print(f"Success: {rows_affected} records updated.")

        # Post-execution verification (optional preview)
        if rows_affected > 0:
            print("\nPreview of updated records (limit 5):")
            cur.execute("""
                SELECT school_id, region, division, district, barangay, leg_district, province, municipality 
                FROM ph_schools 
                WHERE school_id::text LIKE '9%' 
                LIMIT 5
            """)
            for row in cur.fetchall():
                print(row)

        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")
        if 'conn' in locals() and conn:
            conn.rollback()

if __name__ == "__main__":
    main()
