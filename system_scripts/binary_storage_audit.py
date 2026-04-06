#!/usr/bin/env python3
"""
Postgres Binary Storage Efficiency Audit (BSAT) v2
====================================================
Measures real storage efficiency across two dimensions:

  1. DEDUPLICATION SAVINGS — How many logical file references share the same
     physical binary in unified_binaries (content-addressed via SHA-256).
     This is the primary real saving tracked in the DB.

  2. STORAGE COVERAGE — What fraction of records are served from Postgres
     binary storage vs disk/Azure fallback paths.

WHY THE OLD "original vs stored" METRIC WAS BROKEN
-----------------------------------------------------
All upload paths call upsertBinary() which returns `stored_size` (the
post-compression buffer length). Child table size columns (file_size,
pow_size) are set to that same stored_size. unified_binaries.size_bytes
is also the compressed size. Comparing the two always yields ~0% saving.

The only exception is SOD disk-fallback records (binary_id IS NULL) where
file_size retains req.file.size (the actual uploaded size). These are
surfaced separately in Section 3 below.
"""
import os
import sys
import math
import psycopg2
from datetime import datetime, timezone
from dotenv import load_dotenv


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def format_bytes(size_bytes):
    if size_bytes is None or size_bytes == 0:
        return "0 B"
    size_bytes = float(size_bytes)
    prefix = "-" if size_bytes < 0 else ""
    size_bytes = abs(size_bytes)
    size_name = ("B", "KB", "MB", "GB", "TB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    return f"{prefix}{size_bytes / p:.2f} {size_name[i]}"


def pct(part, total):
    if not total:
        return 0.0
    return (part / total) * 100


def ts_str(ts):
    if ts is None:
        return "-"
    if hasattr(ts, "strftime"):
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts.astimezone().strftime("%Y-%m-%d %H:%M")
    return str(ts)


def divider(width=72, char="="):
    print(char * width)


def section(title):
    print()
    divider()
    print(f"  {title}")
    divider()


def table(headers, col_widths, rows, footer_lines=None):
    border = "+" + "+".join("-" * w for w in col_widths) + "+"
    def fmt_row(cells):
        return "|" + "|".join(f" {str(c)}"[:w-1].ljust(w-1) for c, w in zip(cells, col_widths)) + "|"
    print(border)
    print(fmt_row(headers))
    print(border)
    if not rows:
        total_w = sum(col_widths) + len(col_widths) - 1
        print("|" + " No records found ".center(total_w) + "|")
    else:
        for row in rows:
            print(fmt_row(row))
    print(border)
    if footer_lines:
        for line in footer_lines:
            print(f"  {line}")


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def run_audit(cur):
    results = {}

    # ── 1. Deduplication stats for PHOTOS ──────────────────────────────────
    cur.execute("""
        WITH photo_dedup AS (
            SELECT
                ub.id              AS binary_id,
                ub.size_bytes      AS physical_size,
                COUNT(ei.id)       AS ref_count,
                MIN(ei.created_at) AS first_seen,
                MAX(ei.created_at) AS last_seen
            FROM unified_binaries ub
            JOIN engineer_image ei ON ei.binary_id = ub.id
            WHERE ub.mime_type LIKE 'image/%'
            GROUP BY ub.id, ub.size_bytes
        )
        SELECT
            COUNT(*)                                       AS unique_binaries,
            SUM(ref_count)                                 AS total_logical_files,
            SUM(physical_size)                             AS physical_bytes_used,
            SUM(physical_size * ref_count)                 AS logical_bytes_if_no_dedup,
            SUM(physical_size * (ref_count - 1))           AS bytes_saved_by_dedup,
            SUM(CASE WHEN ref_count > 1 THEN 1 ELSE 0 END) AS shared_binary_count,
            MAX(ref_count)                                 AS max_refs_on_one_binary
        FROM photo_dedup;
    """)
    results["photo_dedup_summary"] = cur.fetchone()

    # Top duplicated photo binaries
    cur.execute("""
        SELECT
            ub.id::TEXT,
            ub.mime_type,
            ub.size_bytes,
            COUNT(ei.id) AS ref_count,
            ub.size_bytes * (COUNT(ei.id) - 1) AS bytes_saved
        FROM unified_binaries ub
        JOIN engineer_image ei ON ei.binary_id = ub.id
        WHERE ub.mime_type LIKE 'image/%'
        GROUP BY ub.id, ub.mime_type, ub.size_bytes
        HAVING COUNT(ei.id) > 1
        ORDER BY bytes_saved DESC
        LIMIT 15;
    """)
    results["photo_top_dedup"] = cur.fetchall()

    # ── 2. Deduplication stats for PDFs ────────────────────────────────────
    cur.execute("""
        WITH pdf_refs AS (
            -- School ownership docs (binary path)
            SELECT
                ub.id         AS binary_id,
                ub.size_bytes AS physical_size,
                'SOD'         AS source
            FROM school_ownership_docs sod
            JOIN unified_binaries ub ON sod.binary_id = ub.id

            UNION ALL

            -- Engineer POW documents (binary path)
            SELECT
                ub.id         AS binary_id,
                ub.size_bytes AS physical_size,
                'ENG.DOC'     AS source
            FROM engineer_documents ed
            JOIN unified_binaries ub ON ed.binary_id = ub.id
        ),
        pdf_dedup AS (
            SELECT
                binary_id,
                physical_size,
                COUNT(*)       AS ref_count,
                array_agg(DISTINCT source) AS sources
            FROM pdf_refs
            GROUP BY binary_id, physical_size
        )
        SELECT
            COUNT(*)                                       AS unique_binaries,
            SUM(ref_count)                                 AS total_logical_files,
            SUM(physical_size)                             AS physical_bytes_used,
            SUM(physical_size * ref_count)                 AS logical_bytes_if_no_dedup,
            SUM(physical_size * (ref_count - 1))           AS bytes_saved_by_dedup,
            SUM(CASE WHEN ref_count > 1 THEN 1 ELSE 0 END) AS shared_binary_count
        FROM pdf_dedup;
    """)
    results["pdf_dedup_summary"] = cur.fetchone()

    # ── 3. SOD coverage + disk-fallback rows (WHERE original size IS known) ─
    cur.execute("""
        SELECT
            sod.id,
            sod.iern,
            sod.file_name,
            sod.file_size                                   AS size_in_db,
            ub.size_bytes                                   AS binary_store_size,
            CASE
                WHEN sod.binary_id IS NOT NULL              THEN 'BINARY'
                WHEN sod.file_path LIKE '/uploads/%'        THEN 'DISK'
                ELSE 'UNKNOWN'
            END                                             AS storage_mode,
            COALESCE(sod.original_size, sod.file_size)       AS known_original_size,
            sod.created_at
        FROM school_ownership_docs sod
        LEFT JOIN unified_binaries ub ON sod.binary_id = ub.id
        ORDER BY sod.created_at DESC
        LIMIT 60;
    """)
    results["sod_detail"] = cur.fetchall()

    # ── 4. Photo coverage: binary vs fallback ──────────────────────────────
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE binary_id IS NOT NULL)    AS binary_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND file_path LIKE '/uploads/%') AS disk_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND (image_data LIKE 'http%'
                                  OR file_path LIKE 'http%')) AS azure_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND (file_path IS NULL
                                  OR (file_path NOT LIKE '/uploads/%'
                                      AND file_path NOT LIKE 'http%')))
                                                             AS unknown_count,
            COUNT(*)                                         AS total
        FROM engineer_image;
    """)
    results["photo_coverage"] = cur.fetchone()

    # ── 5. Engineer PDF coverage ───────────────────────────────────────────
    cur.execute("""
        SELECT
            COUNT(*) FILTER (WHERE binary_id IS NOT NULL) AS binary_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND pow_pdf LIKE '/uploads/%') AS disk_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND pow_pdf LIKE 'http%')      AS azure_count,
            COUNT(*) FILTER (WHERE binary_id IS NULL
                             AND pow_pdf IS NOT NULL
                             AND pow_pdf NOT LIKE '/uploads/%'
                             AND pow_pdf NOT LIKE 'http%')  AS unknown_count,
            COUNT(*) FILTER (WHERE pow_pdf IS NOT NULL)     AS total_with_pow
        FROM engineer_documents;
    """)
    results["eng_pdf_coverage"] = cur.fetchone()

    # ── 6. Global unified_binaries summary by MIME group ──────────────────
    cur.execute("""
        SELECT
            CASE
                WHEN mime_type LIKE 'image/%'       THEN 'Images (WebP)'
                WHEN mime_type = 'application/pdf'  THEN 'PDFs'
                ELSE mime_type
            END                         AS asset_type,
            COUNT(*)                    AS unique_stored,
            SUM(size_bytes)             AS total_physical_bytes,
            AVG(size_bytes)             AS avg_bytes,
            MAX(size_bytes)             AS max_bytes,
            MIN(size_bytes)             AS min_bytes
        FROM unified_binaries
        GROUP BY 1
        ORDER BY total_physical_bytes DESC;
    """)
    results["binary_by_mime"] = cur.fetchall()

    # ── 7. Recent Photos (Last 20) for detailed savings comparison ────────
    cur.execute("""
        SELECT 
            ei.id,
            ei.file_size           AS original_size,
            ub.size_bytes          AS stored_size,
            ei.created_at
        FROM engineer_image ei
        JOIN unified_binaries ub ON ei.binary_id = ub.id
        ORDER BY ei.created_at DESC
        LIMIT 20;
    """)
    results["recent_photos"] = cur.fetchall()

    # ── 8. Recent PDFs (Last 20) for detailed savings comparison ──────────
    cur.execute("""
        (SELECT 
            sod.id::TEXT,
            'SOD'                  AS source,
            COALESCE(sod.original_size, sod.file_size) AS original_size,
            ub.size_bytes          AS stored_size,
            sod.created_at
        FROM school_ownership_docs sod
        JOIN unified_binaries ub ON sod.binary_id = ub.id)
        UNION ALL
        (SELECT 
            ed.doc_id::TEXT,
            'ENG.DOC'              AS source,
            COALESCE(ed.pow_original_size, ed.pow_size) AS original_size,
            ub.size_bytes          AS stored_size,
            ed.created_at
        FROM engineer_documents ed
        JOIN unified_binaries ub ON ed.binary_id = ub.id
        WHERE COALESCE(ed.pow_original_size, ed.pow_size) IS NOT NULL)
        ORDER BY created_at DESC
        LIMIT 20;
    """)
    results["recent_pdfs"] = cur.fetchall()

    return results


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

def render_dedup_summary(label, row):
    """
    row columns: unique_binaries, total_logical_files, physical_bytes_used,
                 logical_bytes_if_no_dedup, bytes_saved_by_dedup, shared_binary_count,
                 [max_refs_on_one_binary — photos only]
    """
    if not row or row[0] is None:
        print(f"  No {label} binary records found.")
        return

    (unique_bins, total_logical, phys_bytes, logical_bytes,
     saved_bytes, shared_count, *rest) = row

    max_refs = rest[0] if rest else None
    dedup_ratio = pct(saved_bytes or 0, logical_bytes or 1)

    print(f"  Unique physical binaries  : {unique_bins:,}")
    print(f"  Total logical file refs   : {total_logical:,}")
    print(f"  Physical storage used     : {format_bytes(phys_bytes)}")
    print(f"  Would-be size (no dedup)  : {format_bytes(logical_bytes)}")
    print(f"  Saved via deduplication   : {format_bytes(saved_bytes)}  ({dedup_ratio:.1f}%)")
    print(f"  Shared binaries (2+ refs) : {shared_count:,}")
    if max_refs is not None:
        print(f"  Highest ref count         : {max_refs:,}")


def render_coverage(label, row, total_key_idx=4):
    if not row:
        print(f"  No {label} records found.")
        return
    binary, disk, azure, unknown, total = row
    print(f"  Total records             : {total:,}")
    print(f"  [PASS] Binary (Postgres)  : {binary:,}  ({pct(binary, total):.1f}%)")
    print(f"  [DISK] Disk fallback      : {disk:,}  ({pct(disk, total):.1f}%)")
    print(f"  [CLOUD] Azure fallback    : {azure:,}  ({pct(azure, total):.1f}%)")
    if unknown:
        print(f"  [UNKNOWN] Unknown path    : {unknown:,}  ({pct(unknown, total):.1f}%)")


def render_sod_detail(rows):
    headers = ["ID", "IERN", "File Name", "DB Size", "Binary Size", "Mode", "Known Orig.", "Uploaded"]
    col_w   = [6,    18,     22,          12,        13,            8,      13,             17]

    display = []
    disk_rows_with_original = []

    for row in rows:
        rid, iern, fname, size_in_db, bin_size, mode, known_orig, created = row
        display.append([
            str(rid),
            str(iern or "-")[:17],
            str(fname or "-")[:21],
            format_bytes(size_in_db),
            format_bytes(bin_size),
            mode,
            format_bytes(known_orig) if known_orig else "-",
            ts_str(created),
        ])
        if known_orig and bin_size is None:
            disk_rows_with_original.append((rid, known_orig))

    table(headers, col_w, display)

    if disk_rows_with_original:
        print(f"\n  NOTE: {len(disk_rows_with_original)} disk-fallback record(s) have a known original upload size.")
        print("  These files were NOT processed through the binary pipeline.")
        print("  Migrate them to binary storage for true compression gains.")


def render_mime_table(rows):
    headers = ["Asset Type", "Unique Blobs", "Total Physical", "Avg Size", "Max Size"]
    col_w   = [20,           14,             18,               12,         12]
    display = []
    for row in rows:
        asset_type, unique, total_phys, avg_b, max_b, min_b = row
        display.append([
            str(asset_type),
            f"{unique:,}",
            format_bytes(total_phys),
            format_bytes(int(avg_b) if avg_b else 0),
            format_bytes(max_b),
        ])
    table(headers, col_w, display)


def render_top_dedup(rows, label):
    if not rows:
        print(f"  No duplicate {label} binaries found.")
        return
    headers = ["Binary ID (trunc.)", "MIME", "Physical Size", "Refs", "Bytes Saved"]
    col_w   = [22,                   16,     15,               6,      14]
    display = []
    for row in rows:
        bid, mime, phys, refs, saved = row
        display.append([
            str(bid)[:21],
            str(mime)[:15],
            format_bytes(phys),
            str(refs),
            format_bytes(saved),
        ])
    table(headers, col_w, display)


def render_recent_uploads(label, rows, has_source=False):
    if not rows:
        print(f"  No recent {label} uploads found.")
        return
    
    if has_source:
        headers = ["ID", "Source", "Original Size", "Stored Size", "Saving %", "Timestamp"]
        col_w   = [8,    10,       15,              15,            12,         18]
    else:
        headers = ["ID", "Original Size", "Stored Size", "Saving %", "Timestamp"]
        col_w   = [10,   15,              15,            12,         18]

    display_rows = []
    for row in rows:
        if has_source:
            rid, source, orig, stored, ts = row
            saving = pct(orig - stored, orig) if orig else 0.0
            display_rows.append([
                str(rid), source, format_bytes(orig), format_bytes(stored), f"{saving:.1f}%", ts_str(ts)
            ])
        else:
            rid, orig, stored, ts = row
            saving = pct(orig - stored, orig) if orig else 0.0
            display_rows.append([
                str(rid), format_bytes(orig), format_bytes(stored), f"{saving:.1f}%", ts_str(ts)
            ])
    
    table(headers, col_w, display_rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            data = run_audit(cur)
    except Exception as e:
        print(f"CRITICAL: Audit failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

    print()
    print("  Postgres Binary Storage Efficiency Audit  (BSAT v2)")
    print(f"  Run at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # ── Section 1: Global binary table summary ──────────────────────────────
    section("1. UNIFIED_BINARIES — GLOBAL INVENTORY BY ASSET TYPE")
    render_mime_table(data["binary_by_mime"])

    # ── Section 2: Photo deduplication ─────────────────────────────────────
    section("2. PHOTO DEDUPLICATION SAVINGS (engineer_image -> unified_binaries)")
    render_dedup_summary("photo", data["photo_dedup_summary"])

    if data["photo_top_dedup"]:
        print()
        print("  Top duplicated photo binaries:")
        render_top_dedup(data["photo_top_dedup"], "photo")

    # ── Section 3: PDF deduplication ───────────────────────────────────────
    section("3. PDF DEDUPLICATION SAVINGS (SOD + engineer_documents -> unified_binaries)")
    # pdf_dedup_summary has 6 cols (no max_refs), pad with None for render helper
    pdf_row = data["pdf_dedup_summary"]
    if pdf_row and pdf_row[0] is not None:
        render_dedup_summary("PDF", (*pdf_row, None))
    else:
        print("  No PDF binary records found.")

    # ── Section 4: SOD detail with storage mode ─────────────────────────────
    section("4. SCHOOL OWNERSHIP DOCS — STORAGE MODE DETAIL (last 60)")
    print()
    print("  COLUMN NOTES:")
    print("  * DB Size       = file_size stored in school_ownership_docs")
    print("  * Binary Size   = ub.size_bytes from unified_binaries (post-compression)")
    print("  * For BINARY records, DB Size matches Binary Size (both post-compression).")
    print("    The pre-upload original size was not persisted — this is expected.")
    print("  * For DISK records,  DB Size = original uploaded size (no binary pipeline).")
    print()
    render_sod_detail(data["sod_detail"])

    # ── Section 5: Binary storage coverage ─────────────────────────────────
    section("5. STORAGE COVERAGE — BINARY vs FALLBACK")
    print()
    print("  [ Photos (engineer_image) ]")
    render_coverage("photo", data["photo_coverage"])
    print()
    print("  [ Engineer PDFs (engineer_documents.pow_pdf) ]")
    render_coverage("engineer PDF", data["eng_pdf_coverage"])

    # ── Section 6: Recent uploads detail (Last 20) ─────────────────────────
    section("6. RECENT PHOTO UPLOADS — DETAILED SAVINGS (Last 20)")
    render_recent_uploads("photo", data["recent_photos"])

    section("7. RECENT PDF UPLOADS — DETAILED SAVINGS (Last 20)")
    render_recent_uploads("PDF", data["recent_pdfs"], has_source=True)

    # ── Footer guidance ─────────────────────────────────────────────────────
    print()
    divider(char="-")
    print("  INTERPRETATION GUIDE")
    divider(char="-")
    print("  • Deduplication savings are the PRIMARY real storage gain tracked here.")
    print("  • Compression savings (96 DPI) happen in-process before upsertBinary()")
    print("    and are therefore not separately visible in the DB — both the child")
    print("    table size column and ub.size_bytes reflect the post-compression value.")
    print("  • To measure compression savings, compare file_size of a DISK-fallback")
    print("    record against the ub.size_bytes of the same content after migration.")
    print("  • High disk/Azure fallback % = binary pipeline errors during those uploads.")
    print()


if __name__ == "__main__":
    main()
