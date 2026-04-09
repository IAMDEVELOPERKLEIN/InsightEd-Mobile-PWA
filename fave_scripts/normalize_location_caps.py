import os
import psycopg2
from dotenv import load_dotenv

def run_normalization():
    """
    Standardizes location data (Region, Province, Municipality, etc.) 
    to ALL CAPS across lookup and submission tables to ensure consistency.
    """
    load_dotenv()
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("Error: DATABASE_URL not found in environment variables.")
        return

    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Comprehensive mapping of tables and columns to normalize
        normalization_plan = {
            'all_locations': ['region', 'division', 'district', 'province', 'municipality', 'legislative_district'],
            'all_new_locations': ['region', 'province', 'division', 'district', 'municipality', 'legislative_district', 'barangay'],
            'ph_barangays': ['region', 'province', 'municipality', 'barangay'],
            'engineer_form': ['region', 'division', 'province', 'city', 'municipality', 'leg_district'],
            'ph_schools': ['region', 'province', 'municipality', 'barangay', 'division', 'district', 'leg_district'],
            'users': ['region', 'division', 'province', 'city', 'barangay'],
            'schools_master': ['region', 'division', 'district', 'province', 'municipality', 'legislative_district', 'barangay'],
            'schools': ['region', 'division', 'district', 'province', 'municipality', 'leg_district', 'barangay'],
            'pending_schools': ['region', 'division', 'district', 'province', 'municipality', 'leg_district', 'barangay'],
            'school_profiles': ['region', 'division', 'province', 'municipality', 'barangay', 'district', 'leg_district'],
            'finance_projects': ['region', 'division', 'district', 'legislative_district', 'municipality'],
            'lgu_projects': ['region', 'division', 'district', 'legislative_district', 'municipality'],
            'efd_lms': ['region', 'division', 'municipality', 'legislative_district'],
            'import_beff_projects': ['region', 'division', 'province', 'city', 'municipality', 'leg_district'],
            'engineer_form_old_backup': ['region', 'division', 'province', 'city', 'municipality', 'leg_district'],
            'engineer_form_messy_backup': ['region', 'division', 'province', 'city', 'municipality', 'leg_district'],
            'engineer_form_legacy_1774683767': ['region', 'division', 'province', 'city', 'municipality', 'leg_district'],
            'psip_masterlist': ['region', 'division', 'municipality', 'leg_district'],
            'psip': ['region', 'division', 'municipality', 'leg_district'],
            'efd_data_builder': ['region', 'division', 'district', 'legislative_district', 'barangay'],
            'efd_masterlist': ['region', 'division', 'district'],
            'school_summary': ['region', 'division', 'district'],
            'teachers_list': ['region', 'division', 'district'],
            'private_schools': ['region', 'division', 'legislative_district', 'province', 'barangay'],
            'masterlist_26_30': ['region', 'division', 'municipality', 'legislative_district', 'province'],
            'infra_allotment': ['barangay', 'province', 'district', 'region'],
            'esf7_database': ['region', 'division', 'district'],
            'shs_industry': ['region', 'province'],
            'engineer_mother_moa': ['region', 'province'],
            'congressional_initiatives': ['region', 'division', 'legislative_district']
        }

        print(f"--- Starting Location Normalization (ALL CAPS) ---")
        total_rows_affected = 0
        
        for table, columns in normalization_plan.items():
            set_clauses = [f"{col} = UPPER(TRIM({col}))" for col in columns]
            # Use functional check to avoid redundant updates if already normalized
            # However, for 30MB+ tables, simple update is often faster than complex where checks
            query = f"UPDATE {table} SET {', '.join(set_clauses)}"
            
            try:
                print(f"Normalizing {table}...")
                cur.execute(query)
                count = cur.rowcount
                total_rows_affected += count
                print(f"  Done. Rows affected: {count}")
                conn.commit() # Commit per table for safety
            except Exception as e:
                print(f"  Error in {table}: {e}")
                conn.rollback()

        print(f"\n--- Normalization Complete ---")
        print(f"Total rows updated across all tables: {total_rows_affected}")
        
    except Exception as e:
        print(f"Fatal connection error: {e}")
    finally:
        if 'cur' in locals(): cur.close()
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    run_normalization()
