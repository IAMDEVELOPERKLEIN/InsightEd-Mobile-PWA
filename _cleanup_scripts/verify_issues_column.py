
import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def verify_issues_column():
    print("=== Verification: Enhanced Penalties & Issues Column ===\n")
    engine = create_engine(DB_CONNECTION_STRING)
    
    # Overall statistics
    stats_query = """
        SELECT 
            COUNT(*) as total_schools,
            AVG(data_health_score) as avg_health_score,
            COUNT(CASE WHEN data_health_description = 'Excellent' THEN 1 END) as excellent,
            COUNT(CASE WHEN data_health_description = 'Good' THEN 1 END) as good,
            COUNT(CASE WHEN data_health_description = 'Fair' THEN 1 END) as fair,
            COUNT(CASE WHEN data_health_description = 'Critical' THEN 1 END) as critical
        FROM school_summary
    """
    stats = pd.read_sql(stats_query, engine).iloc[0]
    
    print("Health Score Distribution:")
    print(f"  Total Schools: {int(stats['total_schools'])}")
    print(f"  Average Score: {stats['avg_health_score']:.1f}/100")
    print(f"  Excellent: {int(stats['excellent'])} ({stats['excellent']/stats['total_schools']*100:.1f}%)")
    print(f"  Good: {int(stats['good'])} ({stats['good']/stats['total_schools']*100:.1f}%)")
    print(f"  Fair: {int(stats['fair'])} ({stats['fair']/stats['total_schools']*100:.1f}%)")
    print(f"  Critical: {int(stats['critical'])} ({stats['critical']/stats['total_schools']*100:.1f}%)")
    
    # Critical schools with issues
    print("\n=== Critical Schools (with Issues Column) ===")
    critical_query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms,
               data_health_score, issues
        FROM school_summary 
        WHERE data_health_description = 'Critical'
        ORDER BY data_health_score ASC
        LIMIT 20
    """
    critical = pd.read_sql(critical_query, engine)
    
    print(critical.to_string())
    
    # Sample schools with multiple zero-value flags
    print("\n=== Schools with Multiple Zero-Value Flags ===")
    zero_query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms,
               total_seats, total_toilets, total_furniture,
               data_health_score, data_health_description, issues
        FROM school_summary 
        WHERE (flag_zero_seats = TRUE OR flag_zero_toilets = TRUE OR flag_zero_furniture = TRUE)
        AND total_learners > 0
        ORDER BY data_health_score ASC
        LIMIT 10
    """
    zero_schools = pd.read_sql(zero_query, engine)
    
    print(zero_schools.to_string())
    
    # Sample of schools with different health scores
    print("\n=== Sample Schools Across Health Spectrum ===")
    sample_query = """
        SELECT school_name, data_health_score, data_health_description, issues
        FROM school_summary 
        WHERE data_health_score IN (100, 95, 90, 80, 70, 60, 50, 40, 30)
        LIMIT 10
    """
    sample = pd.read_sql(sample_query, engine)
    
    if len(sample) > 0:
        print(sample.to_string())
    
    print("\n[SUCCESS] Issues column and enhanced penalties verification complete.")

if __name__ == "__main__":
    verify_issues_column()
