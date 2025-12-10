# Azure Deployment Script for dbRosetta API
# Recreates infrastructure in new subscription (ZFT) with Flyway migrations

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "🚀 dbRosetta API - Azure Infrastructure Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# STEP 1: Verify Subscription
# ===================================================================
Write-Host "📋 Step 1: Verifying Azure Subscription..." -ForegroundColor Green
$currentAccount = az account show | ConvertFrom-Json
Write-Host "  Current Subscription: $($currentAccount.name)" -ForegroundColor Yellow
Write-Host "  Subscription ID: $($currentAccount.id)" -ForegroundColor Yellow
Write-Host ""

if ($currentAccount.name -ne "ZFT") {
    Write-Host "⚠️  WARNING: You are not in the 'ZFT' subscription!" -ForegroundColor Red
    Write-Host "Current subscription: $($currentAccount.name)" -ForegroundColor Red
    Write-Host ""
    Write-Host "To switch subscriptions, run:" -ForegroundColor Yellow
    Write-Host "  az account set --subscription 'ZFT'" -ForegroundColor Cyan
    Write-Host ""
    $continue = Read-Host "Continue anyway? (yes/no)"
    if ($continue -ne "yes") {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit 1
    }
}

# ===================================================================
# CONFIGURATION
# ===================================================================
Write-Host "📋 Configuration Parameters" -ForegroundColor Green
Write-Host ""

# Resource naming (using existing resources you'll create manually)
$RESOURCE_GROUP = "dbRosetta"
$LOCATION = "centralus"
$ACR_NAME = "dbrosettaacr"  # Must be globally unique, lowercase only
$KEY_VAULT_NAME = "dbrosetta-kv"  # Must be globally unique
$APP_SERVICE_PLAN = "dbrosetta-plan"
$APP_NAME_STAGING = "dbrosetta-api-staging"
$APP_NAME_PRODUCTION = "dbrosetta-api"

# Database configuration (using your manually created resources)
$POSTGRES_SERVER = "rosettacluster"
$DB_HOST = "$POSTGRES_SERVER.postgres.database.azure.com"
$DB_ADMIN_USER = "postgres"
$DB_ADMIN_PASSWORD_PLAIN = "password"  # Same as local .env
$DB_NAME = "dbrosetta"

$CREATE_NEW_DB = "no"  # Skipping - you'll create manually

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Yellow
Write-Host "  Subscription: $($currentAccount.name)" -ForegroundColor White
Write-Host "  Resource Group: $RESOURCE_GROUP (must exist)" -ForegroundColor White
Write-Host "  Location: $LOCATION" -ForegroundColor White
Write-Host "  ACR Name: $ACR_NAME" -ForegroundColor White
Write-Host "  Key Vault: $KEY_VAULT_NAME" -ForegroundColor White
Write-Host "  Staging App: $APP_NAME_STAGING" -ForegroundColor White
Write-Host "  Production App: $APP_NAME_PRODUCTION" -ForegroundColor White
Write-Host "  Database Server: $POSTGRES_SERVER (must exist)" -ForegroundColor White
Write-Host "  Database Name: $DB_NAME (must exist)" -ForegroundColor White
Write-Host "  Database User: $DB_ADMIN_USER" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Proceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "Starting Infrastructure Deployment..." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ===================================================================
# STEP 2: Register Required Resource Providers
# ===================================================================
Write-Host "📦 Step 2: Registering required resource providers..." -ForegroundColor Green

$providers = @(
    "Microsoft.ContainerRegistry",
    "Microsoft.Web",
    "Microsoft.KeyVault"
)

foreach ($provider in $providers) {
    Write-Host "   Registering $provider..." -ForegroundColor Yellow
    az provider register --namespace $provider --wait --output none
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $provider registered" -ForegroundColor Green
    }
}
Write-Host "✅ Resource providers registered" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 3: Verify Resource Group Exists
# ===================================================================
Write-Host "📦 Step 3: Verifying Resource Group exists..." -ForegroundColor Green
$rgExists = az group exists --name $RESOURCE_GROUP
if ($rgExists -eq "false") {
    Write-Host "❌ Resource group '$RESOURCE_GROUP' does not exist" -ForegroundColor Red
    Write-Host "   Please create it first with: az group create --name $RESOURCE_GROUP --location $LOCATION" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Resource group exists: $RESOURCE_GROUP" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 4: Verify PostgreSQL Database Exists
# ===================================================================
Write-Host "📦 Step 4: Verifying PostgreSQL database exists..." -ForegroundColor Green
Write-Host "   Server: $POSTGRES_SERVER" -ForegroundColor Yellow
Write-Host "   Database: $DB_NAME" -ForegroundColor Yellow
Write-Host "   (Assuming you've created these manually as specified)" -ForegroundColor Gray
Write-Host "✅ Using existing database configuration" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 5: Create Azure Container Registry
# ===================================================================
Write-Host "📦 Step 5: Creating Azure Container Registry..." -ForegroundColor Green

# Check if ACR already exists
$acrExists = az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "id" -o tsv 2>$null
if ($acrExists) {
    Write-Host "   ACR already exists, skipping creation" -ForegroundColor Yellow
} else {
    az acr create `
        --resource-group $RESOURCE_GROUP `
        --name $ACR_NAME `
        --sku Basic `
        --admin-enabled true `
        --location $LOCATION

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create ACR" -ForegroundColor Red
        Write-Host "   Note: ACR names must be globally unique and lowercase only" -ForegroundColor Yellow
        exit 1
    }
}

# Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv

if (-not $ACR_USERNAME -or -not $ACR_PASSWORD) {
    Write-Host "❌ Failed to retrieve ACR credentials" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ACR ready: $ACR_NAME" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 6: Create Azure Key Vault
# ===================================================================
Write-Host "📦 Step 6: Creating Azure Key Vault..." -ForegroundColor Green

# Check if Key Vault already exists
$kvExists = az keyvault show --name $KEY_VAULT_NAME --query "id" -o tsv 2>$null
if ($kvExists) {
    Write-Host "   Key Vault already exists, skipping creation" -ForegroundColor Yellow
} else {
    az keyvault create `
        --name $KEY_VAULT_NAME `
        --resource-group $RESOURCE_GROUP `
        --location $LOCATION `
        --enable-rbac-authorization false

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create Key Vault" -ForegroundColor Red
        Write-Host "   Note: Key Vault names must be globally unique" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Key Vault ready: $KEY_VAULT_NAME" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 7: Store Secrets in Key Vault
# ===================================================================
Write-Host "📦 Step 7: Storing secrets in Key Vault..." -ForegroundColor Green

# Database secrets
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-host" --value $DB_HOST --output none
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-name" --value $DB_NAME --output none
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-user" --value $DB_ADMIN_USER --output none
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-password" --value $DB_ADMIN_PASSWORD_PLAIN --output none

# Generate JWT secrets
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$JWT_REFRESH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$WP_JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

az keyvault secret set --vault-name $KEY_VAULT_NAME --name "jwt-secret" --value $JWT_SECRET --output none
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "jwt-refresh-secret" --value $JWT_REFRESH_SECRET --output none
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "wordpress-jwt-secret" --value $WP_JWT_SECRET --output none

Write-Host "✅ Secrets stored in Key Vault" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 8: Create App Service Plan
# ===================================================================
Write-Host "📦 Step 8: Creating App Service Plan..." -ForegroundColor Green

# Check if App Service Plan already exists
$planExists = az appservice plan show --name $APP_SERVICE_PLAN --resource-group $RESOURCE_GROUP --query "id" -o tsv 2>$null
if ($planExists) {
    Write-Host "   App Service Plan already exists, skipping creation" -ForegroundColor Yellow
} else {
    az appservice plan create `
        --name $APP_SERVICE_PLAN `
        --resource-group $RESOURCE_GROUP `
        --is-linux `
        --sku B1 `
        --location $LOCATION

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create App Service Plan" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ App Service Plan ready: $APP_SERVICE_PLAN" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 9: Create Web Apps (Staging & Production)
# ===================================================================
Write-Host "📦 Step 9: Creating Web Apps..." -ForegroundColor Green

# Staging App
$stagingExists = az webapp show --name $APP_NAME_STAGING --resource-group $RESOURCE_GROUP --query "id" -o tsv 2>$null
if ($stagingExists) {
    Write-Host "   Staging Web App already exists, skipping creation" -ForegroundColor Yellow
} else {
    az webapp create `
        --resource-group $RESOURCE_GROUP `
        --plan $APP_SERVICE_PLAN `
        --name $APP_NAME_STAGING `
        --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create staging Web App" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Staging Web App ready: $APP_NAME_STAGING" -ForegroundColor Green

# Production App
$productionExists = az webapp show --name $APP_NAME_PRODUCTION --resource-group $RESOURCE_GROUP --query "id" -o tsv 2>$null
if ($productionExists) {
    Write-Host "   Production Web App already exists, skipping creation" -ForegroundColor Yellow
} else {
    az webapp create `
        --resource-group $RESOURCE_GROUP `
        --plan $APP_SERVICE_PLAN `
        --name $APP_NAME_PRODUCTION `
        --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create production Web App" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Production Web App ready: $APP_NAME_PRODUCTION" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 10: Configure Managed Identity (Staging)
# ===================================================================
Write-Host "📦 Step 10: Configuring Managed Identity for Staging..." -ForegroundColor Green
az webapp identity assign `
    --name $APP_NAME_STAGING `
    --resource-group $RESOURCE_GROUP `
    --output none

$STAGING_PRINCIPAL_ID = az webapp identity show `
    --name $APP_NAME_STAGING `
    --resource-group $RESOURCE_GROUP `
    --query principalId -o tsv

# Grant Key Vault access
az keyvault set-policy `
    --name $KEY_VAULT_NAME `
    --object-id $STAGING_PRINCIPAL_ID `
    --secret-permissions get list `
    --output none

Write-Host "✅ Staging Managed Identity configured" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 11: Configure Managed Identity (Production)
# ===================================================================
Write-Host "📦 Step 11: Configuring Managed Identity for Production..." -ForegroundColor Green
az webapp identity assign `
    --name $APP_NAME_PRODUCTION `
    --resource-group $RESOURCE_GROUP `
    --output none

$PRODUCTION_PRINCIPAL_ID = az webapp identity show `
    --name $APP_NAME_PRODUCTION `
    --resource-group $RESOURCE_GROUP `
    --query principalId -o tsv

# Grant Key Vault access
az keyvault set-policy `
    --name $KEY_VAULT_NAME `
    --object-id $PRODUCTION_PRINCIPAL_ID `
    --secret-permissions get list `
    --output none

Write-Host "✅ Production Managed Identity configured" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 12: Create Service Principal for GitHub Actions
# ===================================================================
Write-Host "📦 Step 12: Creating Service Principal for GitHub Actions..." -ForegroundColor Green
$SUBSCRIPTION_ID = az account show --query id -o tsv
$SP_NAME = "dbrosetta-github-actions-sp"

$SP_JSON = az ad sp create-for-rbac `
    --name $SP_NAME `
    --role contributor `
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" `
    --sdk-auth

Write-Host "✅ Service Principal created" -ForegroundColor Green
Write-Host ""

# ===================================================================
# STEP 13: Run Flyway Migrations
# ===================================================================
Write-Host "📦 Step 13: Running Flyway Migrations..." -ForegroundColor Green

# Check if Flyway is installed
$flywayInstalled = Get-Command flyway -ErrorAction SilentlyContinue
if (-not $flywayInstalled) {
    Write-Host "⚠️  Flyway not found on local machine" -ForegroundColor Yellow
    Write-Host "   Migrations will need to be run via GitHub Actions or manually" -ForegroundColor Yellow
    Write-Host ""
    $runMigrations = "no"
} else {
    $runMigrations = Read-Host "Run Flyway migrations now? (yes/no)"
}

if ($runMigrations -eq "yes") {
    # Set Flyway environment variables
    $env:FLYWAY_URL = "jdbc:postgresql://${DB_HOST}:5432/${DB_NAME}?sslmode=require"
    $env:FLYWAY_USER = $DB_ADMIN_USER
    $env:FLYWAY_PASSWORD = $DB_ADMIN_PASSWORD_PLAIN
    
    # Navigate to repo root (2 levels up from services/dbrosetta-api)
    $repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    
    Write-Host "  Running migrations from: $repoRoot\migrations" -ForegroundColor Yellow
    
    try {
        flyway info `
            -locations="filesystem:$repoRoot/migrations" `
            -schemas="dbrosetta"
        
        flyway migrate `
            -locations="filesystem:$repoRoot/migrations" `
            -schemas="dbrosetta" `
            -validateMigrationNaming=true
        
        Write-Host "✅ Flyway migrations completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Flyway migration failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "   You can run migrations manually or via GitHub Actions" -ForegroundColor Yellow
    }
} else {
    Write-Host "⏭️  Skipping Flyway migrations" -ForegroundColor Yellow
    Write-Host "   Run migrations manually or via GitHub Actions workflow" -ForegroundColor Yellow
}
Write-Host ""

# ===================================================================
# DEPLOYMENT COMPLETE
# ===================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 GitHub Secrets to Configure:" -ForegroundColor Yellow
Write-Host "   Go to: GitHub → Settings → Secrets and variables → Actions" -ForegroundColor Gray
Write-Host ""
Write-Host "1. AZURE_CREDENTIALS:" -ForegroundColor White
Write-Host $SP_JSON -ForegroundColor Gray
Write-Host ""
Write-Host "2. ACR_USERNAME:" -ForegroundColor White
Write-Host "   $ACR_USERNAME" -ForegroundColor Gray
Write-Host ""
Write-Host "3. ACR_PASSWORD:" -ForegroundColor White
Write-Host "   $ACR_PASSWORD" -ForegroundColor Gray
Write-Host ""
Write-Host "4. AZURE_KEY_VAULT_NAME:" -ForegroundColor White
Write-Host "   $KEY_VAULT_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "5. AZURE_CONTAINER_REGISTRY:" -ForegroundColor White
Write-Host "   $ACR_NAME.azurecr.io" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 GitHub Environments to Create:" -ForegroundColor Yellow
Write-Host "   Go to: GitHub → Settings → Environments" -ForegroundColor Gray
Write-Host ""
Write-Host "   1. staging" -ForegroundColor White
Write-Host "      - No protection rules" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. production" -ForegroundColor White
Write-Host "      - Required reviewers: Add yourself" -ForegroundColor Gray
Write-Host "      - Deployment branches: main" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Add the above secrets to GitHub" -ForegroundColor White
Write-Host "   2. Create GitHub Environments (staging and production)" -ForegroundColor White
Write-Host "   3. Update .github/workflows/api-ci-cd.yml with resource names:" -ForegroundColor White
Write-Host "      - AZURE_WEBAPP_NAME: $APP_NAME_PRODUCTION" -ForegroundColor Gray
Write-Host "      - AZURE_CONTAINER_REGISTRY: $ACR_NAME" -ForegroundColor Gray
Write-Host "   4. Push code to trigger CI/CD deployment" -ForegroundColor White
Write-Host ""
Write-Host "🌐 App URLs:" -ForegroundColor Yellow
Write-Host "   Staging:    https://$APP_NAME_STAGING.azurewebsites.net" -ForegroundColor White
Write-Host "   Production: https://$APP_NAME_PRODUCTION.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "🗄️  Database Connection:" -ForegroundColor Yellow
Write-Host "   Host:     $DB_HOST" -ForegroundColor White
Write-Host "   Database: $DB_NAME" -ForegroundColor White
Write-Host "   User:     $DB_ADMIN_USER" -ForegroundColor White
Write-Host ""
Write-Host "📝 IMPORTANT: Save these credentials securely!" -ForegroundColor Red
Write-Host ""

# Save deployment info to file
$deploymentInfo = @{
    Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Subscription = $currentAccount.name
    SubscriptionId = $SUBSCRIPTION_ID
    ResourceGroup = $RESOURCE_GROUP
    ACR = @{
        Name = $ACR_NAME
        LoginServer = "$ACR_NAME.azurecr.io"
        Username = $ACR_USERNAME
    }
    KeyVault = $KEY_VAULT_NAME
    AppServices = @{
        Staging = $APP_NAME_STAGING
        Production = $APP_NAME_PRODUCTION
    }
    Database = @{
        Host = $DB_HOST
        Name = $DB_NAME
        User = $DB_ADMIN_USER
    }
} | ConvertTo-Json -Depth 5

$deploymentInfo | Out-File -FilePath "deployment-info.json" -Encoding UTF8
Write-Host "💾 Deployment information saved to: deployment-info.json" -ForegroundColor Cyan
Write-Host ""
