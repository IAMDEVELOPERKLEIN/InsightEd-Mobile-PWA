import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables from .env file in the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def add_legislative_district(region, province, leg_district):
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ Error: DATABASE_URL not found in .env file.")
        return

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Force all caps for consistency
        region = region.upper().strip()
        province = province.upper().strip()
        leg_district = leg_district.upper().strip()

        # Set hierarchy fields to NULL as requested
        municipality = None
        division = None
        district = None
        barangay = None

        print(f"ℹ️ Creating legislative district mapping in 'all_new_locations' for Province: {province}")
        print(f"   (Municipality, Division, District, and Barangay will be set to NULL)")

        # 1. Check if the exact combination already exists
        check_query = """
            SELECT id FROM all_new_locations 
            WHERE UPPER(TRIM(region)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(province)) = UPPER(TRIM(%s)) 
              AND municipality IS NULL
              AND division IS NULL
              AND district IS NULL
              AND barangay IS NULL
              AND UPPER(TRIM(legislative_district)) = UPPER(TRIM(%s))
        """
        cur.execute(check_query, (region, province, leg_district))
        
        if cur.fetchone():
            print(f"\n[!] Legislative District mapping '{leg_district}' already exists in 'all_new_locations' for {province} ({region}).")
        else:
            # 2. Insert the new legislative district mapping
            insert_query = """
                INSERT INTO all_new_locations (region, province, municipality, division, district, legislative_district, barangay) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cur.execute(insert_query, (region, province, municipality, division, district, leg_district, barangay))
            conn.commit()
            print(f"\n[✅] Successfully added Legislative District '{leg_district}' to 'all_new_locations' for {province} ({region}).")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database Error: {str(e)}")

if __name__ == "__main__":
    print("--- Add Legislative District to Database (all_new_locations) ---")
    try:
        region = input("Enter Region (e.g., REGION III, CARAGA): ").strip()
        province = input("Enter Province (e.g., BULACAN, DAVAO DEL SUR): ").strip()
        leg_district = input("Enter Legislative District (e.g., 2nd District, Lone District): ").strip()

        if not all([region, province, leg_district]):
            print("❌ Error: All fields are required.")
        else:
            add_legislative_district(region, province, leg_district)
            
    except KeyboardInterrupt:
        print("\nExiting...")
