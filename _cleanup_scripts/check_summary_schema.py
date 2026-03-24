
import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def check_schema():
    print("Checking school_summary schema...")
    engine = create_engine(DB_CONNECTION_STRING)
    
    # Get column names
    query = "SELECT * FROM school_summary LIMIT 1"
    df = pd.read_sql(query, engine)
    
    print("\nColumns in school_summary:")
    for col in df.columns:
        print(f" - {col}")
        
    # Check specifically for removed columns
    removed_cols = ['total_als_learners', 'total_sped_learners', 'total_muslim_learners']
    found = [c for c in removed_cols if c in df.columns]
    
    if found:
        print(f"\n[FAIL] Found removed columns: {found}")
    else:
        print(f"\n[PASS] All target columns removed successfully.")

if __name__ == "__main__":
    check_schema()
