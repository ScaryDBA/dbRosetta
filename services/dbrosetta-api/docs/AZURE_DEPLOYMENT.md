# Azure Deployment Setup Guide

This guide walks through setting up Azure infrastructure and GitHub Actions for deploying the dbRosetta API.

## Prerequisites

- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- GitHub repository access with admin rights
- Docker installed locally (for testing)

## Azure Resources Required

### 1. Azure Container Registry (ACR)

```bash
# Variables
RESOURCE_GROUP="dbrosetta-rg"
LOCATION="eastus"
ACR_NAME="dbrosettaacr"  # Must be globally unique

# Create resource group (if not exists)
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR credentials for GitHub Secrets
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

echo "ACR_USERNAME: $ACR_USERNAME"
echo "ACR_PASSWORD: $ACR_PASSWORD"
```

### 2. Azure Key Vault

```bash
KEY_VAULT_NAME="dbrosetta-kv"  # Must be globally unique

# Create Key Vault
az keyvault create \
  --name $KEY_VAULT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --enable-rbac-authorization false

# Store database credentials (staging)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-host" --value "your-staging-db.postgres.database.azure.com"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-name" --value "dbrosetta"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-user" --value "dbrosetta_admin"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-staging-password" --value "your-staging-password"

# Store database credentials (production)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-production-host" --value "your-production-db.postgres.database.azure.com"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-production-name" --value "dbrosetta"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-production-user" --value "dbrosetta_admin"
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "db-production-password" --value "your-production-password"

# Store JWT secrets
JWT_SECRET=$(openssl rand -base64 32)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "jwt-secret" --value "$JWT_SECRET"

# Store WordPress JWT secret (if using WordPress integration)
WP_JWT_SECRET=$(openssl rand -base64 32)
az keyvault secret set --vault-name $KEY_VAULT_NAME --name "wordpress-jwt-secret" --value "$WP_JWT_SECRET"
```

### 3. Azure App Service (Staging)

```bash
APP_SERVICE_PLAN="dbrosetta-plan"
APP_NAME_STAGING="dbrosetta-api-staging"

# Create App Service Plan (Linux, B1 tier)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --is-linux \
  --sku B1

# Create Web App (Staging)
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $APP_NAME_STAGING \
  --deployment-container-image-name $ACR_NAME.azurecr.io/dbrosetta-api:develop

# Configure Web App to use ACR
az webapp config container set \
  --name $APP_NAME_STAGING \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/dbrosetta-api:develop \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Enable continuous deployment
az webapp deployment container config \
  --name $APP_NAME_STAGING \
  --resource-group $RESOURCE_GROUP \
  --enable-cd true
```

### 4. Azure App Service (Production)

```bash
APP_NAME_PRODUCTION="dbrosetta-api"

# Create Web App (Production)
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $APP_NAME_PRODUCTION \
  --deployment-container-image-name $ACR_NAME.azurecr.io/dbrosetta-api:latest

# Configure Web App to use ACR
az webapp config container set \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/dbrosetta-api:latest \
  --docker-registry-server-url https://$ACR_NAME.azurecr.io \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Enable continuous deployment
az webapp deployment container config \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP \
  --enable-cd true
```

### 5. Configure App Service Environment Variables

#### Staging Environment

```bash
az webapp config appsettings set \
  --name $APP_NAME_STAGING \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=staging \
    PORT=8080 \
    AZURE_KEY_VAULT_NAME=$KEY_VAULT_NAME \
    JWT_ISSUER="https://login.microsoftonline.com/{tenant-id}/v2.0" \
    JWT_AUDIENCE="api://dbrosetta-api" \
    CORS_ORIGIN="https://staging.yourwordpress.com,https://admin.yourwordpress.com" \
    LOG_LEVEL=info \
    ENABLE_SWAGGER=true \
    ENABLE_METRICS=true
```

#### Production Environment

```bash
az webapp config appsettings set \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    AZURE_KEY_VAULT_NAME=$KEY_VAULT_NAME \
    JWT_ISSUER="https://login.microsoftonline.com/{tenant-id}/v2.0" \
    JWT_AUDIENCE="api://dbrosetta-api" \
    CORS_ORIGIN="https://yourwordpress.com,https://admin.yourwordpress.com" \
    LOG_LEVEL=warn \
    ENABLE_SWAGGER=false \
    ENABLE_METRICS=true
```

### 6. Managed Identity for Key Vault Access

```bash
# Enable managed identity for staging app
az webapp identity assign \
  --name $APP_NAME_STAGING \
  --resource-group $RESOURCE_GROUP

STAGING_IDENTITY=$(az webapp identity show \
  --name $APP_NAME_STAGING \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# Enable managed identity for production app
az webapp identity assign \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP

PRODUCTION_IDENTITY=$(az webapp identity show \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# Grant Key Vault access to both apps
az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $STAGING_IDENTITY \
  --secret-permissions get list

az keyvault set-policy \
  --name $KEY_VAULT_NAME \
  --object-id $PRODUCTION_IDENTITY \
  --secret-permissions get list
```

### 7. Service Principal for GitHub Actions

```bash
# Create service principal for GitHub Actions
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad sp create-for-rbac \
  --name "github-actions-dbrosetta-api" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# Output will be JSON - save this for AZURE_CREDENTIALS secret
```

## GitHub Secrets Configuration

Add the following secrets to your GitHub repository (Settings → Secrets and variables → Actions):

### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `AZURE_CREDENTIALS` | Service principal credentials (JSON) | Output from `az ad sp create-for-rbac` command above |
| `ACR_USERNAME` | Azure Container Registry username | Output from ACR creation |
| `ACR_PASSWORD` | Azure Container Registry password | Output from ACR creation |
| `AZURE_KEY_VAULT_NAME` | Key Vault name | The `KEY_VAULT_NAME` variable you set |

### Optional Secrets (if not using Key Vault for everything)

| Secret Name | Description |
|-------------|-------------|
| `DATABASE_URL_STAGING` | Staging database connection string |
| `DATABASE_URL_PRODUCTION` | Production database connection string |
| `JWT_SECRET` | JWT signing secret |
| `WORDPRESS_JWT_SECRET` | WordPress JWT verification secret |

## GitHub Environments Configuration

Create two environments in your GitHub repository (Settings → Environments):

### 1. Staging Environment
- **Name**: `staging`
- **Deployment branches**: `develop` branch only
- **No protection rules needed**

### 2. Production Environment
- **Name**: `production`
- **Deployment branches**: `main` branch only
- **Protection rules**:
  - ✅ Required reviewers (at least 1)
  - ✅ Wait timer: 5 minutes (optional)

## Testing the Deployment

### Manual Workflow Trigger

```bash
# Trigger workflow manually via GitHub CLI
gh workflow run api-ci-cd.yml \
  --ref develop \
  -f environment=staging
```

### Push to Branch

```bash
# Deploy to staging
git checkout develop
git push origin develop

# Deploy to production (requires PR + approval)
git checkout main
git merge develop
git push origin main
```

## Monitoring and Troubleshooting

### View Logs

```bash
# Staging logs
az webapp log tail --name $APP_NAME_STAGING --resource-group $RESOURCE_GROUP

# Production logs
az webapp log tail --name $APP_NAME_PRODUCTION --resource-group $RESOURCE_GROUP
```

### Check Health Endpoints

```bash
# Staging
curl https://dbrosetta-api-staging.azurewebsites.net/health

# Production
curl https://dbrosetta-api.azurewebsites.net/health
```

### View Metrics

```bash
# CPU and Memory metrics
az monitor metrics list \
  --resource /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$APP_NAME_PRODUCTION \
  --metric "CpuPercentage" "MemoryPercentage" \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --interval PT1M
```

## Rollback Procedure

### Via Azure Portal
1. Navigate to App Service → Deployment Center
2. Select previous deployment
3. Click "Redeploy"

### Via CLI

```bash
# List deployments
az webapp deployment list \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP

# Redeploy specific version
az webapp deployment source config \
  --name $APP_NAME_PRODUCTION \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_NAME.azurecr.io/dbrosetta-api:sha-abc123
```

### Database Migration Rollback

```bash
# SSH into self-hosted runner or use Cloud Shell
cd services/dbrosetta-api

# View migration history
npx prisma migrate status

# Rollback not directly supported by Prisma
# Must manually create a new migration that reverts changes
# Or restore database from backup
```

## Cost Optimization

- **App Service Plan**: Consider scaling down to Free/Shared tier for staging
- **Container Registry**: Use Basic tier (sufficient for most cases)
- **Key Vault**: Minimal cost (~$0.03 per 10,000 operations)
- **Enable autoscaling** for production during high traffic

## Security Checklist

- ✅ Secrets stored in Key Vault (not in code)
- ✅ Managed Identity enabled for App Services
- ✅ HTTPS enforced on all endpoints
- ✅ CORS restricted to known origins
- ✅ Rate limiting enabled
- ✅ Swagger disabled in production
- ✅ Database firewall rules configured
- ✅ Private endpoints (if using VNet)
- ✅ Regular security updates via Dependabot

## Next Steps

1. **Set up monitoring alerts** in Azure Monitor
2. **Configure Application Insights** for detailed telemetry
3. **Set up Azure Front Door or API Management** for advanced routing
4. **Implement blue-green deployment** for zero-downtime releases
5. **Add Postman/Newman tests** to CI/CD pipeline
6. **Configure custom domain** and SSL certificate
