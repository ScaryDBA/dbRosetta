# Azure Deployment Quick Start

## Prerequisites

1. **Switch to ZFT subscription:**
   ```powershell
   az account set --subscription 'ZFT'
   az account show  # Verify you're in ZFT
   ```

2. **Install Flyway (optional, for local migrations):**
   - Download from: https://flywaydb.org/download
   - Or skip and let GitHub Actions handle migrations

## Deploy Infrastructure

```powershell
cd c:\Users\grant\OneDrive\Documents\GitHub\dbRosetta\services\dbrosetta-api
.\deploy-azure-complete.ps1
```

The script will:
1. ✅ Verify you're in ZFT subscription
2. ✅ Prompt for database options (create new or use existing)
3. ✅ Create all Azure resources (ACR, Key Vault, App Services, etc.)
4. ✅ Configure Managed Identities
5. ✅ Store secrets in Key Vault
6. ✅ Optionally run Flyway migrations
7. ✅ Output GitHub Secrets you need to configure

## After Deployment

### 1. Configure GitHub Secrets

Go to: https://github.com/ScaryDBA/dbRosetta/settings/secrets/actions

Add these secrets (values provided by script):
- `AZURE_CREDENTIALS` - Service principal JSON
- `ACR_USERNAME` - Container registry username
- `ACR_PASSWORD` - Container registry password
- `AZURE_KEY_VAULT_NAME` - Key vault name
- `AZURE_CONTAINER_REGISTRY` - ACR login server

### 2. Create GitHub Environments

Go to: https://github.com/ScaryDBA/dbRosetta/settings/environments

**staging:**
- No protection rules
- Deployment branches: Any branch

**production:**
- Required reviewers: Add yourself
- Wait timer: 0 minutes (optional)
- Deployment branches: main

### 3. Update CI/CD Workflow

Edit `.github/workflows/api-ci-cd.yml`:

```yaml
env:
  AZURE_WEBAPP_NAME: 'dbrosetta-api'  # Update if different
  AZURE_CONTAINER_REGISTRY: 'dbrosettaacr'  # Update if different
```

### 4. Deploy API

```powershell
# Commit and push to trigger deployment
git add .
git commit -m "Configure Azure infrastructure for ZFT subscription"
git push origin Part5-API
```

## Resources Created

| Resource | Name | Purpose |
|----------|------|---------|
| Resource Group | dbrosetta-rg | Container for all resources |
| Container Registry | dbrosettaacr | Docker image storage |
| Key Vault | dbrosetta-kv | Secrets management |
| App Service Plan | dbrosetta-plan | Hosting plan (B1 tier) |
| App Service (Staging) | dbrosetta-api-staging | Staging environment |
| App Service (Production) | dbrosetta-api | Production environment |
| PostgreSQL Server | dbrosetta-postgres | Database (if created) |

## Estimated Costs (per month)

- App Service Plan (B1): ~$13
- Container Registry (Basic): ~$5
- Key Vault: ~$0.03
- PostgreSQL (Burstable B1ms): ~$12
- **Total: ~$30/month**

## Troubleshooting

**Script fails on resource name conflict:**
- Resource names must be globally unique
- Edit script to change ACR_NAME, KEY_VAULT_NAME, or POSTGRES_SERVER

**Flyway migrations fail:**
- Check database firewall allows your IP
- Verify database credentials are correct
- Run migrations manually or via GitHub Actions

**App Service won't start:**
- Check Application Insights logs
- Verify Key Vault secrets are populated
- Ensure Managed Identity has Key Vault access

## Manual Flyway Migration

If script skipped migrations:

```powershell
$env:FLYWAY_URL = "jdbc:postgresql://your-db-host:5432/dbrosetta?sslmode=require"
$env:FLYWAY_USER = "dbrosetta_admin"
$env:FLYWAY_PASSWORD = "your-password"

cd c:\Users\grant\OneDrive\Documents\GitHub\dbRosetta

flyway migrate `
  -locations="filesystem:./migrations" `
  -schemas="dbrosetta" `
  -validateMigrationNaming=true
```

## Rollback

To delete all resources:

```powershell
az group delete --name dbrosetta-rg --yes --no-wait
```

## Support

Check deployment logs:
```powershell
# View App Service logs
az webapp log tail --name dbrosetta-api-staging --resource-group dbrosetta-rg

# View deployment status
az webapp deployment list --name dbrosetta-api-staging --resource-group dbrosetta-rg
```
