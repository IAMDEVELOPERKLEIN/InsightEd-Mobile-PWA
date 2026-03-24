
import pandas as pd
from sqlalchemy import create_engine, text

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def verify_fix(school_id):
    print(f"Verifying School ID: {school_id}")
    engine = create_engine(DB_CONNECTION_STRING)
    
    query = f"SELECT school_name, total_teachers FROM school_summary WHERE school_id = '{school_id}'"
    df = pd.read_sql(query, engine)
    
    if df.empty:
        print("School not found in summary table.")
        return

    print(df.to_string())

if __name__ == "__main__":
    verify_fix('300570')
