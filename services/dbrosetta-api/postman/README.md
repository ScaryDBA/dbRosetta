# dbRosetta API - Postman Collection

Comprehensive Postman collection for testing and integrating with the dbRosetta API.

## Contents

- **dbRosetta-API.postman_collection.json** - Complete API collection with all endpoints
- **dbRosetta-Local.postman_environment.json** - Environment for local development
- **dbRosetta-Staging.postman_environment.json** - Staging environment
- **dbRosetta-Production.postman_environment.json** - Production environment

## Quick Start

### 1. Import Collection and Environments

1. Open Postman
2. Click **Import** button (top left)
3. Drag and drop or select these files:
   - `dbRosetta-API.postman_collection.json`
   - `dbRosetta-Local.postman_environment.json`
   - `dbRosetta-Staging.postman_environment.json`
   - `dbRosetta-Production.postman_environment.json`

### 2. Select Environment

Click the environment dropdown (top right) and select:
- **dbRosetta Local** - for local development (http://localhost:3000)
- **dbRosetta Staging** - for staging environment
- **dbRosetta Production** - for production environment

### 3. Start Testing

1. Start with **Health Check** requests (no authentication required)
2. Use **Auth > Register User** to create an account
3. Use **Auth > Login** to authenticate (tokens saved automatically)
4. All subsequent requests will use the saved token

## Collection Structure

```
dbRosetta API/
├── Health/
│   ├── Health Check
│   ├── Liveness Check
│   └── Readiness Check
├── Auth/
│   ├── Register User
│   ├── Login
│   ├── Get Current User
│   ├── Refresh Token
│   ├── Change Password
│   ├── Logout
│   └── WordPress Login
├── Dialects/
│   ├── List Dialects
│   ├── Get Dialect by ID
│   ├── Create Dialect
│   ├── Update Dialect
│   └── Delete Dialect
├── Terms/
│   ├── List Terms
│   ├── Get Term by ID
│   ├── Create Term
│   ├── Update Term
│   └── Delete Term
├── Translations/
│   ├── List Translations
│   ├── Get Translation by ID
│   ├── Create Translation
│   ├── Update Translation
│   └── Delete Translation
├── Artifacts/
│   ├── List Artifacts
│   ├── Get Artifact by ID
│   ├── Create Artifact
│   ├── Update Artifact
│   └── Delete Artifact
├── Query/
│   ├── Execute Query
│   └── Query Help
├── Schema/
│   ├── Get Full Schema
│   ├── Get Entity Schema
│   └── Get Statistics
└── Metrics/
    ├── Prometheus Metrics
    └── JSON Metrics
```

## Authentication Flow

The collection includes automatic token management:

1. **Register** or **Login** → Access token and refresh token saved to environment
2. **All authenticated requests** → Automatically use saved access token
3. **Token expires** → Use **Refresh Token** request to get new access token
4. **Logout** → Tokens automatically cleared from environment

### Manual Token Management

If needed, you can manually set tokens in the environment:

1. Click **Environments** (top right)
2. Select your active environment
3. Set values:
   - `accessToken` - Your JWT access token
   - `refreshToken` - Your JWT refresh token
   - `userId` - Your user ID

## Environment Variables

All environments include these variables:

| Variable | Description | Auto-populated |
|----------|-------------|----------------|
| `baseUrl` | API base URL | ✓ |
| `accessToken` | JWT access token | ✓ (after login) |
| `refreshToken` | JWT refresh token | ✓ (after login) |
| `userId` | Authenticated user ID | ✓ (after login) |
| `dialectId` | Sample dialect ID | ✓ (after list) |
| `termId` | Sample term ID | ✓ (after list) |
| `translationId` | Sample translation ID | ✓ (after list) |
| `artifactId` | Sample artifact ID | ✓ (after list) |
| `newDialectId` | Created dialect ID | ✓ (after create) |

## Testing Features

### Global Test Scripts

All requests include automatic tests for:
- ✅ Response time < 2000ms
- ✅ Correct Content-Type header

### Request-Specific Tests

Each request includes custom tests, for example:
- **Login** → Validates tokens and saves to environment
- **List Dialects** → Saves first dialect ID for subsequent requests
- **Health Check** → Validates database connection status

### Pre-request Scripts

Collection-level pre-request script handles:
- Automatic token refresh (if expired)
- Authorization header management

## Example Workflows

### 1. Basic Authentication Workflow

```
1. Health Check (verify API is running)
2. Register User (create account)
3. Login (get tokens)
4. Get Current User (verify authentication)
5. Logout (cleanup)
```

### 2. Dialect Management Workflow

```
1. Login
2. List Dialects (browse existing)
3. Create Dialect (add new)
4. Update Dialect (modify)
5. Get Dialect by ID (verify)
6. Delete Dialect (cleanup)
```

### 3. Translation Workflow

```
1. Login
2. List Terms (find canonical term)
3. List Dialects (find target dialect)
4. Create Translation (map term to dialect)
5. Get Translation by ID (verify)
6. List Translations (with filters)
```

### 4. Query Workflow

```
1. Query Help (understand DSL)
2. Execute Query (find DDL terms)
3. Execute Query (filter by confidence)
4. Get Schema (explore database structure)
```

## Advanced Features

### Filtering and Pagination

Many list endpoints support query parameters:

```
GET /api/v1/terms?
  page=1&
  limit=10&
  category=DDL&
  subcategory=Table&
  search=create&
  sortBy=canonicalTerm&
  sortOrder=asc
```

### Query DSL

The Query endpoint supports flexible filtering:

```json
{
  "entity": "terms",
  "filters": {
    "category": "DDL",
    "isActive": true
  },
  "fields": ["id", "canonicalTerm", "description"],
  "limit": 20,
  "offset": 0,
  "orderBy": {
    "field": "canonicalTerm",
    "direction": "asc"
  }
}
```

### Role-Based Access Control (RBAC)

The API has three roles with different permissions:

| Role | Permissions |
|------|-------------|
| **reader** | Read-only access to all endpoints |
| **editor** | Read + Create + Update (no Delete) |
| **admin** | Full access including Delete and Metrics |

Default role for new users is **reader**.

## Running with Newman (CLI)

### Install Newman

```powershell
npm install -g newman
```

### Run Collection

```powershell
# Local environment
newman run dbRosetta-API.postman_collection.json `
  --environment dbRosetta-Local.postman_environment.json `
  --reporters cli,json

# Staging environment
newman run dbRosetta-API.postman_collection.json `
  --environment dbRosetta-Staging.postman_environment.json `
  --reporters cli,json

# Production environment
newman run dbRosetta-API.postman_collection.json `
  --environment dbRosetta-Production.postman_environment.json `
  --reporters cli,json
```

### Run Specific Folder

```powershell
# Test only health endpoints
newman run dbRosetta-API.postman_collection.json `
  --folder "Health" `
  --environment dbRosetta-Local.postman_environment.json

# Test authentication flow
newman run dbRosetta-API.postman_collection.json `
  --folder "Auth" `
  --environment dbRosetta-Local.postman_environment.json
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run API Tests with Newman
  run: |
    npm install -g newman
    newman run services/dbrosetta-api/postman/dbRosetta-API.postman_collection.json \
      --environment services/dbrosetta-api/postman/dbRosetta-Staging.postman_environment.json \
      --reporters cli,json \
      --reporter-json-export newman-results.json
```

### Generate HTML Report

```powershell
# Install HTML reporter
npm install -g newman-reporter-htmlextra

# Run with HTML report
newman run dbRosetta-API.postman_collection.json `
  --environment dbRosetta-Local.postman_environment.json `
  --reporters cli,htmlextra `
  --reporter-htmlextra-export newman-report.html
```

## Troubleshooting

### Authentication Issues

**Problem:** `401 Unauthorized` error

**Solutions:**
1. Check if access token is set: `{{accessToken}}` in environment
2. Try logging in again: **Auth > Login**
3. Refresh expired token: **Auth > Refresh Token**
4. Verify user has correct role for the endpoint

### Connection Issues

**Problem:** Cannot connect to API

**Solutions:**
1. Verify API is running: Check **Health > Health Check**
2. Check baseUrl in environment matches your setup
3. For local: Ensure API is running on `http://localhost:3000`
4. For staging/prod: Check Azure App Service is running

### Environment Variables Not Saving

**Problem:** Token not saved after login

**Solutions:**
1. Check test script in request ran successfully
2. Verify environment is selected (not "No Environment")
3. Check environment permissions (not read-only)
4. Try manually setting variable in environment editor

### Test Failures

**Problem:** Tests failing unexpectedly

**Solutions:**
1. Check response time (may need to increase threshold)
2. Verify database is seeded with test data
3. Check expected response structure matches API version
4. Review test scripts for environment-specific assertions

## API Documentation

For complete API documentation with Swagger UI:
- Local: http://localhost:3000/docs
- Staging: https://dbrosetta-api-staging.azurewebsites.net/docs
- Production: https://dbrosetta-api.azurewebsites.net/docs

## Support

For issues or questions:
1. Check API logs for errors
2. Review Swagger documentation
3. Test with Health endpoints first
4. Verify authentication token is valid

## Version

Collection version: 1.0.0
API version: 1.0.0
Last updated: 2024
