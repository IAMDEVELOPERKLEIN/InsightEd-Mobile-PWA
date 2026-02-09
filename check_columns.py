
import pandas as pd
from sqlalchemy import create_engine, text

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def check_cols():
    print("Checking columns in school_profiles...")
    engine = create_engine(DB_CONNECTION_STRING)
    
    query = "SELECT * FROM school_profiles LIMIT 1"
    df = pd.read_sql(query, engine)
    
    print("\nColumns:")
    for col in df.columns:
        if 'region' in col or 'division' in col:
            print(col)

if __name__ == "__main__":
    check_cols()
