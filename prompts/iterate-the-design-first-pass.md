# Goal
Update the dbRosetta application so that searching for a database term returns:
1. A definition of the term.
2. A grid mapping the equivalent concept across supported database platforms (PostgreSQL, SQL Server, Oracle, MySQL, etc.).

# Scope
- Modify database schema to store equivalence mappings between terms across platforms.
- Update API endpoints to return both definition and equivalence mappings.
- Update WordPress plugin/web interface to display results in a grid format.
- Seed test data for the term "WAL" (Write Ahead Log) and equivalents in other platforms.

# Database Changes
- Add a new table `term_equivalents`:
  - `id` (PK)
  - `term_id` (FK to `terms`)
  - `platform` (VARCHAR)
  - `equivalent_term` (VARCHAR)
  - `notes` (TEXT, optional for clarifications)

# API Changes
- Extend `/terms/search` endpoint:
  - Return JSON object with:
    - `definition`
    - `equivalents`: array of { platform, equivalent_term, notes }

# UI Changes
- Modify plugin/web page output:
  - Show definition at top.
  - Render a grid/table below with columns: Platform | Equivalent Term | Notes.

# Test Data (Seed)
Insert into `terms`:
- `term`: WAL
- `definition`: "Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database."

Insert into `term_equivalents`:
- PostgreSQL → WAL (native concept)
- SQL Server → Transaction Log
- Oracle → Redo Log
- MySQL → Binary Log
- SQLite → Write Ahead Log (same term)

# Expected Behavior
- Searching "WAL" returns:
  - Definition: "Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database."
  - Grid:
    | Platform    | Equivalent Term   | Notes                          |
    |-------------|------------------|--------------------------------|
    | PostgreSQL  | WAL              | Native implementation          |
    | SQL Server  | Transaction Log  | Similar concept, different name|
    | Oracle      | Redo Log         | Equivalent mechanism           |
    | MySQL       | Binary Log       | Used for replication and recovery |
    | SQLite      | WAL              | Same terminology               |

# Validation
- Add unit test: search for "WAL" → assert definition is returned.
- Assert grid contains all 5 platforms with correct equivalents.
