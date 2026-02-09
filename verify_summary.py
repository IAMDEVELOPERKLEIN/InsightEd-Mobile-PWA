
import pandas as pd
from sqlalchemy import create_engine, text

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def verify_data():
    print("Verifying School Summary Table...")
    try:
        engine = create_engine(DB_CONNECTION_STRING)
        
        # Check count
        count_query = "SELECT COUNT(*) FROM school_summary"
        with engine.connect() as conn:
            count = conn.execute(text(count_query)).scalar()
            print(f"Total rows in school_summary: {count}")
            
        # Check a sample
        sample_query = "SELECT school_name, total_teaching_experience, total_specialized_teachers FROM school_summary LIMIT 5"
        df = pd.read_sql(sample_query, engine)
        print("\nSample Data (New Columns + Experience + Spec):")
        print(df.to_string())

        # Check for non-zero/non-null iern
        iern_count = pd.read_sql("SELECT count(*) FROM school_summary WHERE iern IS NOT NULL", engine).iloc[0,0]
        print(f"\nSchools with IERN populated: {iern_count}")

        # Check for non-zero values in new columns
        print("\nChecking for non-zero values in new columns:")
        for col in ['total_organized_classes', 'total_school_resources', 'total_teaching_experience', 'total_specialized_teachers']:
            nz_query = f"SELECT count(*) FROM school_summary WHERE {col} > 0"
            with engine.connect() as conn:
                count = conn.execute(text(nz_query)).scalar()
                print(f"Schools with {col} > 0: {count}")
        
        # Check for non-zero values in critical columns


    except Exception as e:
        print(f"Verification Failed: {e}")

if __name__ == "__main__":
    verify_data()
