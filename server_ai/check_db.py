import os
from pathlib import Path
import psycopg2

try:
    from dotenv import load_dotenv
    load_dotenv(Path(r"C:\CSM\Smart-CSM\.env"))
except ImportError:
    pass

url = os.environ.get("SUPABASE_DATABASE_URL")
if not url:
    print("No URL found in env")
    exit(1)

print(f"Connecting to: {url}")
try:
    conn = psycopg2.connect(url)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")

# Try direct connection if password exists
pwd = os.environ.get("SUPABASE_DB_PASSWORD")
if pwd:
    try:
        direct_host = "db.szmwawvfejodcjylxtmc.supabase.co"
        print(f"\nTrying direct connection to {direct_host}...")
        conn = psycopg2.connect(
            host=direct_host,
            user="postgres",
            password=pwd,
            dbname="postgres",
            port=5432
        )
        print("Direct connection successful!")
        conn.close()
    except Exception as e:
        print(f"Direct connection failed: {e}")
