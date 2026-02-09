
import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def debug_exp():
    print("Debugging Teaching Experience Columns...")
    engine = create_engine(DB_CONNECTION_STRING)
    
    exp_cols = [
        'teach_exp_0_1', 'teach_exp_2_5', 'teach_exp_6_10',
        'teach_exp_11_15', 'teach_exp_16_20', 'teach_exp_21_25',
        'teach_exp_26_30', 'teach_exp_31_35', 'teach_exp_36_40',
        'teach_exp_40_45'
    ]
    
    cols_str = ", ".join(exp_cols)
    query = f"SELECT school_name, {cols_str} FROM school_profiles LIMIT 5"
    df = pd.read_sql(query, engine)
    
    print(df.to_string())
    
    # Check sum
    df['total'] = df[exp_cols].sum(axis=1)
    print("\nCalculated Totals:")
    print(df[['school_name', 'total']])

if __name__ == "__main__":
    debug_exp()
