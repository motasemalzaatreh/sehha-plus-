import pyodbc
import os
from dotenv import load_dotenvd

load_dotenv()

DB_SERVER   = os.getenv("DB_SERVER",   "localhost")
DB_NAME     = os.getenv("DB_NAME",     "SehhaPlus")
DB_DRIVER   = os.getenv("DB_DRIVER",   "ODBC Driver 17 for SQL Server")
DB_USER     = os.getenv("DB_USER",     "sa")
DB_PASSWORD = os.getenv("DB_PASSWORD", "sa123456")

CONNECTION_STRING = (
    f"DRIVER={{{DB_DRIVER}}};"
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_NAME};"
    f"UID={DB_USER};"
    f"PWD={DB_PASSWORD};"
)

def get_connection():
    """Return a live pyodbc connection."""
    return pyodbc.connect(CONNECTION_STRING)

def query(sql: str, params: tuple = ()):
    """Run a SELECT and return list of dicts."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    columns = [col[0] for col in cursor.description]
    rows = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    return rows

def execute(sql: str, params: tuple = ()):
    """Run INSERT / UPDATE / DELETE and commit."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(sql, params)
    conn.commit()
    # Return last inserted ID if available
    try:
        cursor.execute("SELECT SCOPE_IDENTITY()")
        row = cursor.fetchone()
        last_id = int(row[0]) if row and row[0] else None
    except Exception:
        last_id = None
    conn.close()
    return last_id
