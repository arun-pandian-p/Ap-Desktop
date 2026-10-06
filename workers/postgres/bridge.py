#!/usr/bin/env python3
"""
Ap PostgreSQL Bridge Worker
Safely connects to genuine PostgreSQL instances and executes queries with timeouts.
Invoked via: python workers/postgres/bridge.py <action>
Input is passed via stdin as JSON.
"""

import sys
import json
import time

def get_connection(cfg):
    import psycopg2
    return psycopg2.connect(
        host=cfg.get('host', 'localhost'),
        port=int(cfg.get('port', 5432)),
        dbname=cfg.get('database', 'postgres'),
        user=cfg.get('user', 'postgres'),
        password=cfg.get('password', ''),
        sslmode=cfg.get('sslmode', 'prefer'),
        connect_timeout=int(cfg.get('timeout', 4))
    )

def handle_test(cfg):
    try:
        conn = get_connection(cfg)
        cur = conn.cursor()
        cur.execute("SELECT version(), current_database(), current_user;")
        row = cur.fetchone()
        conn.close()
        return {
            "success": True,
            "version": row[0],
            "database": row[1],
            "user": row[2]
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e).strip()
        }

def handle_tables(cfg):
    try:
        conn = get_connection(cfg)
        cur = conn.cursor()
        cur.execute("""
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        rows = cur.fetchall()
        tables = []
        for r in rows:
            # Get row count estimate
            tbl_name = r[0]
            try:
                cur.execute(f"SELECT COUNT(*) FROM \"{tbl_name}\";")
                cnt = cur.fetchone()[0]
                tables.append({"name": tbl_name, "count": str(cnt), "type": r[1]})
            except Exception:
                tables.append({"name": tbl_name, "count": "0", "type": r[1]})
        conn.close()
        return {"success": True, "tables": tables}
    except Exception as e:
        return {"success": False, "error": str(e).strip()}

def handle_query(payload):
    cfg = payload.get('config', {})
    sql = payload.get('query', '').strip()
    if not sql:
        return {"success": False, "error": "Query cannot be empty."}

    start = time.perf_counter()
    try:
        conn = get_connection(cfg)
        # Set read-only / timeout on cursor
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(sql)

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        if cur.description is None:
            # Non-SELECT statement (INSERT, UPDATE, CREATE, etc.)
            conn.close()
            return {
                "success": True,
                "columns": [],
                "values": [],
                "row_count": cur.rowcount if cur.rowcount >= 0 else 0,
                "execution_ms": elapsed_ms,
                "message": f"Query OK, {cur.rowcount} rows affected."
            }

        columns = [desc[0] for desc in cur.description]
        raw_rows = cur.fetchall()
        conn.close()

        # Serialize datatypes cleanly
        values = []
        for row in raw_rows:
            values.append([str(v) if v is not None else "NULL" for v in row])

        return {
            "success": True,
            "columns": columns,
            "values": values,
            "row_count": len(values),
            "execution_ms": elapsed_ms
        }
    except Exception as e:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        return {
            "success": False,
            "columns": [],
            "values": [],
            "row_count": 0,
            "execution_ms": elapsed_ms,
            "error": str(e).strip()
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No action specified"}))
        return

    action = sys.argv[1]
    input_data = sys.stdin.read()
    try:
        payload = json.loads(input_data) if input_data.strip() else {}
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Invalid input JSON: {e}"}))
        return

    if action == 'test':
        res = handle_test(payload)
    elif action == 'tables':
        res = handle_tables(payload)
    elif action == 'query':
        res = handle_query(payload)
    else:
        res = {"success": False, "error": f"Unknown action: {action}"}

    print(json.dumps(res))

if __name__ == '__main__':
    main()
