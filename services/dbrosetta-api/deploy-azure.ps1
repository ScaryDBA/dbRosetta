# Azure Deployment Script for dbRosetta API
# Run this script to set up all required Azure resources

# Exit on error
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Azure Deployment Setup for dbRosetta API" -ForegroundColor Cyan
Write-Host ""

# Variables - Update these as needed
$RESOURCE_GROUP = "dbrosetta-rg"
$LOCATION = "eastus"
$ACR_NAME = "dbrosettaacr"  # Must be globally unique, lowercase only
$KEY_VAULT_NAME = "dbrosetta-kv"  # Must be globally unique
$APP_SERVICE_PLAN = "dbrosetta-plan"
$APP_NAME_STAGING = "dbrosetta-api-staging"
$APP_NAME_PRODUCTION = "dbrosetta-api"

# Database connection details (you'll need to provide these)
$DB_STAGING_HOST = Read-Host "Enter staging PostgreSQL host (e.g., your-db.postgres.database.azure.com)"
$DB_STAGING_NAME = "dbrosetta"
$DB_STAGING_USER = "dbrosetta_admin"
$DB_STAGING_PASSWORD = Read-Host "Enter staging database password" -AsSecureString
$DB_STAGING_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_STAGING_PASSWORD)
)

Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Resource Group: $RESOURCE_GROUP"
Write-Host "  Location: $LOCATION"
Write-Host "  ACR Name: $ACR_NAME"
Write-Host "  Key Vault: $KEY_VAULT_NAME"
Write-Host "  Staging App: $APP_NAME_STAGING"
Write-Host "  Production App: $APP_NAME_PRODUCTION"
Write-Host ""

$confirm = Read-Host "Proceed with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Step 1: Creating Resource Group..." -ForegroundColor Green
az group create --name $RESOURCE_GROUP --location $LOCATION
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create resource group" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Resource group created" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 2: Creating Azure Container Registry..." -ForegroundColor Green
az acr create `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --sku Basic `
    --admin-enabled true
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create ACR" -ForegroundColor Red
    exit 1
}

# Get ACR credentials
$ACR_USERNAME = az acr credential show --name $ACR_NAME --query username -o tsv
$ACR_PASSWORD = az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv
Write-Host "✅ ACR created" -ForegroundColor Green
Write-Host "  Username: $ACR_USERNAME" -ForegroundColor Yellow
Write-Host "  Password: $ACR_PASSWORD" -ForegroundColor Yellow

Write-Host ""
Write-Host "📦 Step 3: Creating Azure Key Vault..." -ForegroundColor Green
az keyvault create `
    --name $KEY_VAULT_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --enable-rbac-authorization false
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create Key Vault" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Key Vault created" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 4: Storing secrets in Key Vault..." -ForegroundColor Green

# Database secrets (staging)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-host" --value $DB_STAGING_HOST | Out-Null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-name" --value $DB_STAGING_NAME | Out-Null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-user" --value $DB_STAGING_USER | Out-Null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-password" --value $DB_STAGING_PASSWORD_PLAIN | Out-Null

# Generate JWT secrets
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$JWT_REFRESH_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$WP_JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

az keyvault secret set --vault-name $KEY_VAULT_NAME --name "jwt-secret" --value $JWT_SECRET | Out-Null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "jwt-refresh-secret" --value $JWT_REFRESH_SECRET | Out-Null
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "wordpress-jwt-secret" --value $WP_JWT_SECRET | Out-Null

Write-Host "✅ Secrets stored in Key Vault" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 5: Creating App Service Plan..." -ForegroundColor Green
az appservice plan create `
    --name $APP_SERVICE_PLAN `
    --resource-group $RESOURCE_GROUP `
    --is-linux `
    --sku B1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create App Service Plan" -ForegroundColor Red
    exit 1
}
Write-Host "✅ App Service Plan created" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 6: Creating Web App (Staging)..." -ForegroundColor Green
az webapp create `
    --resource-group $RESOURCE_GROUP `
    --plan $APP_SERVICE_PLAN `
    --name $APP_NAME_STAGING `
    --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create staging Web App" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Staging Web App created" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 7: Creating Web App (Production)..." -ForegroundColor Green
az webapp create `
    --resource-group $RESOURCE_GROUP `
    --plan $APP_SERVICE_PLAN `
    --name $APP_NAME_PRODUCTION `
    --deployment-container-image-name "mcr.microsoft.com/appsvc/staticsite:latest"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to create production Web App" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production Web App created" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 8: Enabling Managed Identity for Staging..." -ForegroundColor Green
az webapp identity assign `
    --name $APP_NAME_STAGING `
    --resource-group $RESOURCE_GROUP
$STAGING_PRINCIPAL_ID = az webapp identity show `
    --name $APP_NAME_STAGING `
    --resource-group $RESOURCE_GROUP `
    --query principalId -o tsv

# Grant Key Vault access to staging
az keyvault set-policy `
    --name $KEY_VAULT_NAME `
    --object-id $STAGING_PRINCIPAL_ID `
    --secret-permissions get list
Write-Host "✅ Staging Managed Identity configured" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 9: Enabling Managed Identity for Production..." -ForegroundColor Green
az webapp identity assign `
    --name $APP_NAME_PRODUCTION `
    --resource-group $RESOURCE_GROUP
$PRODUCTION_PRINCIPAL_ID = az webapp identity show `
    --name $APP_NAME_PRODUCTION `
    --resource-group $RESOURCE_GROUP `
    --query principalId -o tsv

# Grant Key Vault access to production
az keyvault set-policy `
    --name $KEY_VAULT_NAME `
    --object-id $PRODUCTION_PRINCIPAL_ID `
    --secret-permissions get list
Write-Host "✅ Production Managed Identity configured" -ForegroundColor Green

Write-Host ""
Write-Host "📦 Step 10: Creating Service Principal for GitHub Actions..." -ForegroundColor Green
$SUBSCRIPTION_ID = az account show --query id -o tsv
$SP_NAME = "dbrosetta-github-actions"

$SP_JSON = az ad sp create-for-rbac `
    --name $SP_NAME `
    --role contributor `
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP" `
    --sdk-auth

Write-Host "✅ Service Principal created" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 GitHub Secrets to Configure:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. AZURE_CREDENTIALS:" -ForegroundColor White
Write-Host $SP_JSON -ForegroundColor Gray
Write-Host ""
Write-Host "2. ACR_USERNAME:" -ForegroundColor White
Write-Host $ACR_USERNAME -ForegroundColor Gray
Write-Host ""
Write-Host "3. ACR_PASSWORD:" -ForegroundColor White
Write-Host $ACR_PASSWORD -ForegroundColor Gray
Write-Host ""
Write-Host "4. AZURE_KEY_VAULT_NAME:" -ForegroundColor White
Write-Host $KEY_VAULT_NAME -ForegroundColor Gray
Write-Host ""
Write-Host "5. AZURE_CONTAINER_REGISTRY:" -ForegroundColor White
Write-Host "$ACR_NAME.azurecr.io" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Add the above secrets to GitHub: Settings → Secrets and variables → Actions" -ForegroundColor White
Write-Host "2. Create GitHub Environments: 'staging' and 'production'" -ForegroundColor White
Write-Host "3. Build and push Docker image to ACR" -ForegroundColor White
Write-Host "4. Push code to trigger GitHub Actions workflow" -ForegroundColor White
Write-Host ""
Write-Host "🌐 App URLs:" -ForegroundColor Yellow
Write-Host "  Staging: https://$APP_NAME_STAGING.azurewebsites.net" -ForegroundColor White
Write-Host "  Production: https://$APP_NAME_PRODUCTION.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "📝 Save these credentials to a secure location!" -ForegroundColor Red
Write-Host ""
