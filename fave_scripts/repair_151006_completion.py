"""
One-shot repair script for school 151006 completion divergence.

Directly connects to Azure Postgres (bypassing pgBouncer) and re-derives
ph_school_completion booleans from ph_schools authoritative flags, then
recalculates unit_completion.

Usage:
    python fave_scripts/repair_151006_completion.py
    python fave_scripts/repair_151006_completion.py --all   # fix every school
"""
import argparse
import psycopg2

DB_URL = "postgres://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

# DB cols unit1–unit7 and unit9 map to display units 1–8 (unit9 = terrain/location form)
DB_COLS = [1, 2, 3, 4, 5, 6, 7, 9]

def resync_school(cur, iern, school_id):
    # 1. Read authoritative flags from ph_schools
    cur.execute("""
        SELECT unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit9,
               unit1_completed, unit2_completed, unit3_completed, unit4_completed,
               unit5_completed, unit6_completed, unit7_completed, unit9_completed
        FROM ph_schools WHERE iern = %s
    """, (iern,))
    row = cur.fetchone()
    if not row:
        print(f"  [SKIP] iern={iern} not found in ph_schools")
        return None

    cols = ["unit1","unit2","unit3","unit4","unit5","unit6","unit7","unit9",
            "unit1_completed","unit2_completed","unit3_completed","unit4_completed",
            "unit5_completed","unit6_completed","unit7_completed","unit9_completed"]
    d = dict(zip(cols, row))

    bool_values = []
    completed = 0
    for idx in DB_COLS:
        done = (int(d.get(f"unit{idx}") or 0) == 1) or (d.get(f"unit{idx}_completed") is True)
        bool_values.append(done)
        if done:
            completed += 1

    percentage = round((completed / 8) * 100, 2)

    # 2. Update ph_school_completion
    cur.execute("""
        UPDATE ph_school_completion SET
            unit1_completion=%s, unit2_completion=%s, unit3_completion=%s, unit4_completion=%s,
            unit5_completion=%s, unit6_completion=%s, unit7_completion=%s, unit8_completion=%s,
            total_completion=%s, updated_at=NOW()
        WHERE iern=%s
    """, (*bool_values, percentage, iern))

    # 3. Sync to ph_schools.unit_completion
    cur.execute(
        "UPDATE ph_schools SET unit_completion=%s WHERE iern=%s",
        (percentage, iern)
    )

    return completed, percentage

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="Resync all schools, not just 151006")
    args = parser.parse_args()

    conn = psycopg2.connect(DB_URL, sslmode="require")
    conn.autocommit = False
    cur = conn.cursor()

    try:
        if args.all:
            cur.execute("SELECT school_id, iern FROM ph_schools WHERE iern IS NOT NULL")
        else:
            cur.execute("SELECT school_id, iern FROM ph_schools WHERE school_id = '151006' AND iern IS NOT NULL")

        schools = cur.fetchall()
        print(f"Resyncing {len(schools)} school(s)...")

        updated = 0
        for school_id, iern in schools:
            result = resync_school(cur, iern, school_id)
            if result:
                completed, pct = result
                print(f"  [{school_id}] iern={iern} -> {completed}/8 units = {pct}%")
                updated += 1

        conn.commit()
        print(f"\nDone. {updated} school(s) resynced.")

        # Verify school 151006
        cur.execute("""
            SELECT ps.school_id, ps.unit_completion,
                   psc.unit1_completion, psc.unit2_completion, psc.unit3_completion,
                   psc.unit4_completion, psc.unit5_completion, psc.unit6_completion,
                   psc.unit7_completion, psc.unit8_completion, psc.total_completion
            FROM ph_schools ps
            LEFT JOIN ph_school_completion psc ON ps.iern = psc.iern
            WHERE ps.school_id = '151006'
        """)
        row = cur.fetchone()
        if row:
            print(f"\n--- Verification: school 151006 ---")
            labels = ["school_id","unit_completion","u1","u2","u3","u4","u5","u6","u7","u8","total_completion"]
            for label, val in zip(labels, row):
                print(f"  {label}: {val}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
