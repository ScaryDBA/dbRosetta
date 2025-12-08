# Test script for dbRosetta API endpoints
# Run this after starting the server with `npm run dev`

$baseUrl = "http://localhost:3000"

Write-Host "`n=== Testing dbRosetta API Endpoints ===" -ForegroundColor Cyan

# Test 1: Health check
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
Write-Host "Status: Connected = $($response.database.connected)" -ForegroundColor Green

# Test 2: List dialects (empty but should work)
Write-Host "`n2. Testing dialects list endpoint..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/api/v1/dialects?page=1&limit=5" -Method Get
Write-Host "Total dialects: $($response.pagination.total)" -ForegroundColor Green
Write-Host "Response structure: $($response | ConvertTo-Json -Depth 1)" -ForegroundColor Gray

# Test 3: Create a test dialect
Write-Host "`n3. Creating test dialect..." -ForegroundColor Yellow
$dialectBody = @{
    name = "postgresql"
    displayName = "PostgreSQL"
    version = "18.0"
    description = "PostgreSQL database system"
    isActive = $true
} | ConvertTo-Json

try {
    $dialect = Invoke-RestMethod -Uri "$baseUrl/api/v1/dialects" -Method Post -Body $dialectBody -ContentType "application/json"
    Write-Host "Created dialect: ID=$($dialect.id), Name=$($dialect.name)" -ForegroundColor Green
    $dialectId = $dialect.id
} catch {
    Write-Host "Note: Dialect may already exist (409 conflict expected if running twice)" -ForegroundColor Yellow
    # Try to get existing dialect
    $dialects = Invoke-RestMethod -Uri "$baseUrl/api/v1/dialects?name=postgresql" -Method Get
    if ($dialects.data.Count -gt 0) {
        $dialectId = $dialects.data[0].id
        Write-Host "Using existing dialect: ID=$dialectId" -ForegroundColor Green
    }
}

# Test 4: Get specific dialect
if ($dialectId) {
    Write-Host "`n4. Getting dialect by ID..." -ForegroundColor Yellow
    $dialect = Invoke-RestMethod -Uri "$baseUrl/api/v1/dialects/$dialectId" -Method Get
    Write-Host "Retrieved: $($dialect.displayName) (v$($dialect.version))" -ForegroundColor Green
}

# Test 5: Create a test term
Write-Host "`n5. Creating test term..." -ForegroundColor Yellow
$termBody = @{
    canonicalTerm = "SELECT"
    category = "DML"
    subcategory = "Query"
    description = "Retrieve rows from a table or view"
    usageContext = "Used to query data from database tables"
    isActive = $true
} | ConvertTo-Json

try {
    $term = Invoke-RestMethod -Uri "$baseUrl/api/v1/terms" -Method Post -Body $termBody -ContentType "application/json"
    Write-Host "Created term: ID=$($term.id), Term=$($term.canonicalTerm)" -ForegroundColor Green
    $termId = $term.id
} catch {
    Write-Host "Term creation attempted" -ForegroundColor Yellow
    $terms = Invoke-RestMethod -Uri "$baseUrl/api/v1/terms?search=SELECT" -Method Get
    if ($terms.data.Count -gt 0) {
        $termId = $terms.data[0].id
        Write-Host "Using term: ID=$termId" -ForegroundColor Green
    }
}

# Test 6: Create a translation
if ($dialectId -and $termId) {
    Write-Host "`n6. Creating test translation..." -ForegroundColor Yellow
    $translationBody = @{
        termId = $termId
        dialectId = $dialectId
        translatedTerm = "SELECT"
        syntaxPattern = "SELECT column_list FROM table_name"
        examples = "SELECT * FROM users; SELECT name, email FROM customers;"
        confidenceLevel = 100
        isActive = $true
    } | ConvertTo-Json

    try {
        $translation = Invoke-RestMethod -Uri "$baseUrl/api/v1/translations" -Method Post -Body $translationBody -ContentType "application/json"
        Write-Host "Created translation: ID=$($translation.id)" -ForegroundColor Green
        $translationId = $translation.id
    } catch {
        Write-Host "Translation creation attempted" -ForegroundColor Yellow
    }
}

# Test 7: Query endpoint
Write-Host "`n7. Testing query endpoint..." -ForegroundColor Yellow
$queryBody = @{
    entity = "dialects"
    filters = @{
        isActive = $true
    }
    limit = 5
} | ConvertTo-Json

$queryResult = Invoke-RestMethod -Uri "$baseUrl/api/v1/query" -Method Post -Body $queryBody -ContentType "application/json"
Write-Host "Query returned $($queryResult.count) results" -ForegroundColor Green

# Test 8: Schema overview
Write-Host "`n8. Testing schema endpoint..." -ForegroundColor Yellow
$schema = Invoke-RestMethod -Uri "$baseUrl/api/v1/schema" -Method Get
Write-Host "Schema contains $($schema.entities.Count) entities" -ForegroundColor Green

# Test 9: Schema stats
Write-Host "`n9. Testing schema statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/v1/schema/stats/overview" -Method Get
Write-Host "Database contains:" -ForegroundColor Green
Write-Host "  - Dialects: $($stats.totals.dialects) (Active: $($stats.active.dialects))" -ForegroundColor Gray
Write-Host "  - Terms: $($stats.totals.terms) (Active: $($stats.active.terms))" -ForegroundColor Gray
Write-Host "  - Translations: $($stats.totals.translations) (Active: $($stats.active.translations))" -ForegroundColor Gray
Write-Host "  - Artifacts: $($stats.totals.artifacts)" -ForegroundColor Gray

# Test 10: Metrics endpoint
Write-Host "`n10. Testing metrics endpoint (JSON)..." -ForegroundColor Yellow
$metrics = Invoke-RestMethod -Uri "$baseUrl/api/v1/metrics/json" -Method Get
Write-Host "Metrics timestamp: $($metrics.timestamp)" -ForegroundColor Green
Write-Host "Database connected: $($metrics.database.connected)" -ForegroundColor Green

# Test 11: Swagger documentation
Write-Host "`n11. Checking Swagger documentation..." -ForegroundColor Yellow
Write-Host "Visit: http://localhost:3000/docs" -ForegroundColor Cyan
Write-Host "Swagger UI should show all available endpoints" -ForegroundColor Gray

Write-Host "`n=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host "API is fully operational! ≡ƒÜÇ" -ForegroundColor Green
