# Term Equivalents Feature - Implementation Summary

## Overview
Added a new feature to dbRosetta that allows searching for database terms and viewing equivalent concepts across different database platforms (PostgreSQL, SQL Server, Oracle, MySQL, SQLite, etc.).

## Database Changes

### New Table: `term_equivalents`
Created via Flyway migration `V3__add_term_equivalents.sql`

**Schema:**
- `id` (SERIAL PRIMARY KEY)
- `term_id` (INTEGER, FK to terms table)
- `platform` (VARCHAR(100)) - Database platform name
- `equivalent_term` (VARCHAR(200)) - The equivalent term in that platform
- `notes` (TEXT) - Optional clarifications
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Constraints:**
- Foreign key to `terms` table with CASCADE delete
- Unique constraint on `(term_id, platform)` combination

**Indexes:**
- `idx_term_equivalents_term` on `term_id`
- `idx_term_equivalents_platform` on `platform`

## API Changes

### Updated Prisma Schema
- Added `TermEquivalent` model in `schema.prisma`
- Added `equivalents` relation to `Term` model

### New Endpoints (in `term-equivalents.ts`)

1. **GET /api/v1/terms/:termId/equivalents**
   - Returns all platform equivalents for a term
   - Public access (no auth required)

2. **POST /api/v1/terms/:termId/equivalents**
   - Create new equivalent mapping
   - Requires admin authentication
   - Validates unique platform per term

3. **PUT /api/v1/terms/:termId/equivalents/:id**
   - Update existing equivalent
   - Requires admin authentication
   - Prevents platform conflicts

4. **DELETE /api/v1/terms/:termId/equivalents/:id**
   - Delete an equivalent
   - Requires admin authentication

### Modified Endpoints

**GET /api/v1/terms/:id**
- Now includes `equivalents` array in response
- Equivalents are sorted alphabetically by platform

## Seed Data

### Added WAL Term Example
```javascript
{
  canonicalTerm: 'WAL',
  category: 'System',
  subcategory: 'Logging',
  description: 'Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database',
  usageContext: 'Used for crash recovery, replication, and point-in-time recovery'
}
```

### Platform Equivalents for WAL
| Platform    | Equivalent Term   | Notes                          |
|-------------|-------------------|--------------------------------|
| PostgreSQL  | WAL               | Native implementation          |
| SQL Server  | Transaction Log   | Similar concept, different name|
| Oracle      | Redo Log          | Equivalent mechanism           |
| MySQL       | Binary Log        | Used for replication and recovery |
| SQLite      | WAL               | Same terminology               |

## WordPress Plugin Changes

### Updated `class-dbrosetta-client.php`

**New Method:**
```php
public function get_term_with_equivalents($term_id)
```
- Fetches full term details including equivalents
- Makes GET request to `/terms/{id}` endpoint

### Updated `search-results.php` Template

**New Section:**
- Displays platform equivalents in a table format
- Shows after term description, before translations
- Includes Platform, Equivalent Term, and Notes columns

### Updated CSS (`dbrosetta.css`)

**New Styles:**
- `.dbrosetta-equivalents` - Container for equivalents section
- `.dbrosetta-table` - Styled data table
- Responsive design for mobile devices
- Hover effects on table rows
- Code formatting for equivalent terms

## Testing

### New Test File: `term-equivalents.test.ts`

**Test Coverage:**
- ✅ GET equivalents for term (empty and populated)
- ✅ POST create new equivalent (admin auth required)
- ✅ PUT update equivalent (admin auth required)
- ✅ DELETE equivalent (admin auth required)
- ✅ 404 handling for non-existent terms/equivalents
- ✅ 409 handling for duplicate platforms
- ✅ 403 handling for non-admin users
- ✅ Integration with GET /terms/:id endpoint

## Example API Response

### GET /api/v1/terms/11 (WAL term)
```json
{
  "id": 11,
  "canonicalTerm": "WAL",
  "category": "System",
  "subcategory": "Logging",
  "description": "Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database",
  "usageContext": "Used for crash recovery, replication, and point-in-time recovery",
  "isActive": true,
  "metadata": null,
  "createdAt": "2025-12-15T...",
  "updatedAt": "2025-12-15T...",
  "equivalents": [
    {
      "id": 1,
      "termId": 11,
      "platform": "PostgreSQL",
      "equivalentTerm": "WAL",
      "notes": "Native implementation",
      "createdAt": "2025-12-15T...",
      "updatedAt": "2025-12-15T..."
    },
    {
      "id": 2,
      "termId": 11,
      "platform": "SQL Server",
      "equivalentTerm": "Transaction Log",
      "notes": "Similar concept, different name",
      "createdAt": "2025-12-15T...",
      "updatedAt": "2025-12-15T..."
    }
    // ... more platforms
  ],
  "translations": []
}
```

## Deployment Steps

1. **Database Migration:**
   ```bash
   flyway migrate
   ```
   This will apply `V3__add_term_equivalents.sql`

2. **Regenerate Prisma Client:**
   ```bash
   cd services/dbrosetta-api
   npx prisma generate
   ```

3. **Run Seed Script (optional):**
   ```bash
   npm run seed
   ```
   This will add the WAL term and its equivalents

4. **Build and Deploy API:**
   ```bash
   npm run build
   # Deploy to Azure App Service
   ```

5. **Update WordPress Plugin:**
   - Upload updated plugin files
   - Clear WordPress cache if using caching plugin

6. **Run Tests:**
   ```bash
   npm test
   ```

## Files Modified/Created

### Created:
- `migrations/V3__add_term_equivalents.sql` - Database migration
- `services/dbrosetta-api/src/routes/v1/term-equivalents.ts` - API routes
- `services/dbrosetta-api/src/__tests__/routes/term-equivalents.test.ts` - Unit tests

### Modified:
- `services/dbrosetta-api/prisma/schema.prisma` - Added TermEquivalent model
- `services/dbrosetta-api/prisma/seed.ts` - Added WAL term and equivalents
- `services/dbrosetta-api/src/routes/v1/index.ts` - Registered new routes
- `services/dbrosetta-api/src/routes/v1/terms.ts` - Include equivalents in GET
- `wordpress-plugin/dbrosetta/includes/class-dbrosetta-client.php` - Added method
- `wordpress-plugin/dbrosetta/templates/search-results.php` - Display grid
- `wordpress-plugin/dbrosetta/assets/dbrosetta.css` - Table styling

## Validation

### Expected Behavior When Searching "WAL":

1. **Definition Displayed:**
   > Write Ahead Log (WAL) is a mechanism ensuring changes are logged before being applied to the database

2. **Platform Equivalents Grid:**
   - Displays a table with 5 rows (PostgreSQL, SQL Server, Oracle, MySQL, SQLite)
   - Shows equivalent term for each platform
   - Includes explanatory notes

3. **Clean UI:**
   - Responsive table design
   - Hover effects
   - Code-styled equivalent terms
   - Clear column headers

## Success Criteria Met

- ✅ Database schema supports equivalence mappings
- ✅ API endpoints return definition and equivalents
- ✅ WordPress plugin displays results in grid format
- ✅ WAL term seeded with 5 platform equivalents
- ✅ Unit tests verify all functionality
- ✅ Proper authentication/authorization implemented
- ✅ Responsive design for mobile devices
