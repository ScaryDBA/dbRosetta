# Flyway Migration Guide for dbRosetta

## Overview
This repository uses Flyway Enterprise for database schema version control and migrations. The baseline was created by reverse engineering the existing Azure PostgreSQL database using `pg_dump`.

## Directory Structure
```
dbRosetta/
├── migrations/              # Versioned migration scripts
│   └── V1__baseline.sql    # Initial baseline from existing schema
├── callbacks/              # Flyway lifecycle callbacks (optional)
├── schema-model/          # Flyway Desktop schema model artifacts
├── flyway.toml            # Flyway configuration (SAFE for git)
├── flyway.conf            # Local config with passwords (IGNORED by git)
└── docs/
    └── FLYWAY_ENV_TEMPLATE.md  # Environment setup instructions
```

## Setup Instructions

### 1. Prerequisites
- PostgreSQL client tools 18.x installed
- Flyway Community Edition 11.13+ or Flyway Enterprise
- Access to Azure PostgreSQL database

### 2. Environment Configuration
Set the required environment variable:
```powershell
$env:FLYWAY_PASSWORD = "your-password-here"
```

For persistent setup, see [`docs/FLYWAY_ENV_TEMPLATE.md`](docs/FLYWAY_ENV_TEMPLATE.md)

### 3. Verify Configuration
```bash
flyway info
```

Expected output should show:
- Database connection successful
- V1__baseline migration with "Success" state
- Schema version: 1

## Baseline Information

**Migration:** `V1__baseline.sql`
**Version:** 1
**Description:** Initial baseline from existing schema
**Generated:** December 3, 2025 using pg_dump 18.1
**Source:** Azure PostgreSQL 18.0

### Baseline Contents
- Schema: `dbrosetta`
- Tables: `dialects`, `terms`, `translations`, `artifacts`
- Indexes: GIN and B-tree indexes for performance
- Constraints: Primary keys, foreign keys, check constraints
- Comments: Complete table and column documentation

## Common Flyway Commands

### Check Migration Status
```bash
flyway info
```

### Validate Migrations
```bash
flyway validate
```

### Apply Pending Migrations
```bash
flyway migrate
```

### Generate Migration from Schema Changes (Flyway Enterprise)
```bash
flyway check -changes -drift
```

## Creating New Migrations

### Manual Approach
1. Create a new file: `migrations/V{version}__{description}.sql`
   - Example: `V2__add_user_preferences_table.sql`
2. Write idempotent SQL statements
3. Test locally with `flyway migrate`
4. Commit to Git

### Flyway Enterprise Approach (Recommended)
1. Make changes in development database
2. Run: `flyway check -changes -code`
3. Review generated migration script
4. Approve and commit to Git

## Migration Naming Convention
- **Versioned:** `V{version}__{description}.sql`
  - Example: `V1__baseline.sql`, `V2__add_indexes.sql`
- **Repeatable:** `R__{description}.sql`
  - For views, stored procedures, functions
- **Undo (Enterprise):** `U{version}__{description}.sql`

## CI/CD Integration

### Environment Variables for Pipelines
```bash
FLYWAY_PASSWORD=<secret>
CI_DATABASE_URL=jdbc:postgresql://server:5432/database?sslmode=require
CI_DATABASE_USER=<username>
CI_DATABASE_PASSWORD=<secret>
```

### Example GitHub Actions Workflow
```yaml
- name: Run Flyway Migrations
  env:
    FLYWAY_PASSWORD: ${{ secrets.FLYWAY_PASSWORD }}
  run: |
    flyway migrate -environment=ci
```

## Troubleshooting

### Password Authentication Failed
- Verify `FLYWAY_PASSWORD` is set: `echo $env:FLYWAY_PASSWORD`
- Check `.pgpass` file if using PostgreSQL client tools
- Ensure username format is correct (check if `@servername` suffix is needed)

### Connection Timeout
- Verify Azure PostgreSQL firewall rules include your IP
- Check SSL mode is set to `require`
- Test connection: `psql -h server -d database -U username`

### Migration Checksum Mismatch
- Do not modify applied migrations
- Use `flyway repair` to update checksums (with caution)
- For production, create a new migration to fix issues

## Best Practices

1. **Never modify applied migrations** - Always create new migrations
2. **Keep migrations idempotent** - Safe to run multiple times
3. **Test migrations locally first** - Before committing to main branch
4. **Use descriptive names** - Clear migration descriptions
5. **Review generated SQL** - When using Flyway Enterprise compare
6. **Commit migration artifacts** - Keep baseline and migrations in Git
7. **Never commit passwords** - Use environment variables

## Baseline Strategy

The baseline approach was used because:
- Database already existed with schema and data
- Need to version control going forward
- Avoid destructive recreation of production database

**Baseline Version:** 1
**Baseline Description:** "Initial baseline from existing schema"

All future migrations will be versioned from V2 onwards.

## Support and Resources

- [Flyway Documentation](https://documentation.red-gate.com/fd)
- [Flyway Enterprise Compare](https://documentation.red-gate.com/fd/compare-184127505.html)
- [PostgreSQL Migration Guide](https://documentation.red-gate.com/fd/postgresql-184127574.html)

## License
See [LICENSE](../LICENSE) for details.
