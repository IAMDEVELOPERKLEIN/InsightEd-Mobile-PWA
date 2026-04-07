import pandas as pd
import sys

try:
    df = pd.read_excel("e:/InsightEd-Mobile-PWA/Palawan Schools.xlsx")
    print("Columns:", df.columns.tolist())
    print("\nFirst 5 rows:")
    print(df.head())
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
