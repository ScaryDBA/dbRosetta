#!/bin/bash
# =============================================================================
# Azure Key Vault Setup Script
# =============================================================================
# Purpose: Create Key Vault and configure secrets for GitHub Actions runner
# =============================================================================

set -e

# Load configuration from previous step
if [ -f .azure-config ]; then
    source .azure-config
else
    echo "Error: .azure-config not found. Run provision-vm.sh first."
    exit 1
fi

# =============================================================================
# CONFIGURATION VARIABLES - Update these for your environment
# =============================================================================
KEY_VAULT_NAME="kv-dbrosetta-$(openssl rand -hex 4)"  # Must be globally unique
POSTGRES_SERVER="dbrosetta.postgres.database.azure.com"
POSTGRES_DATABASE="dbrosetta"
POSTGRES_USER="postgres"

# Prompt for secrets (not stored in script)
echo "=============================================================================
Azure Key Vault Setup
=============================================================================
"
echo "Key Vault Name: $KEY_VAULT_NAME"
echo ""
read -sp "Enter PostgreSQL password: " POSTGRES_PASSWORD
echo ""
read -sp "Enter Flyway Enterprise license key (or press Enter to skip): " FLYWAY_LICENSE
echo ""

# =============================================================================
# STEP 1: Create Key Vault
# =============================================================================
echo "Creating Key Vault: $KEY_VAULT_NAME"
az keyvault create \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --enable-rbac-authorization true \
  --public-network-access Enabled \
  --tags "project=dbRosetta" "purpose=secrets"

# Get Key Vault resource ID
KEY_VAULT_ID=$(az keyvault show \
  --name "$KEY_VAULT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "id" \
  --output tsv)

# =============================================================================
# STEP 2: Grant VM Identity Access to Key Vault
# =============================================================================
echo "Granting VM managed identity access to Key Vault..."

# Get current user's object ID for initial secret setup
CURRENT_USER_ID=$(az ad signed-in-user show --query "id" --output tsv)

# Assign Key Vault Secrets Officer role to current user (for adding secrets)
az role assignment create \
  --role "Key Vault Secrets Officer" \
  --assignee "$CURRENT_USER_ID" \
  --scope "$KEY_VAULT_ID"

# Wait for RBAC propagation
echo "Waiting for RBAC propagation (30 seconds)..."
sleep 30

# Assign Key Vault Secrets User role to VM identity (for reading secrets)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$VM_IDENTITY" \
  --scope "$KEY_VAULT_ID"

# =============================================================================
# STEP 3: Add Secrets to Key Vault
# =============================================================================
echo "Adding secrets to Key Vault..."

# PostgreSQL connection string (JDBC format for Flyway)
POSTGRES_CONNECTION_STRING="jdbc:postgresql://${POSTGRES_SERVER}:5432/${POSTGRES_DATABASE}?sslmode=require"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "PostgresConnectionString" \
  --value "$POSTGRES_CONNECTION_STRING" \
  --description "PostgreSQL JDBC connection string for Flyway"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "PostgresUser" \
  --value "$POSTGRES_USER" \
  --description "PostgreSQL username"

az keyvault secret set \
  --vault-name "$KEY_VAULT_NAME" \
  --name "PostgresPassword" \
  --value "$POSTGRES_PASSWORD" \
  --description "PostgreSQL password"

# Add Flyway license if provided
if [ -n "$FLYWAY_LICENSE" ]; then
    az keyvault secret set \
      --vault-name "$KEY_VAULT_NAME" \
      --name "FlywayLicense" \
      --value "$FLYWAY_LICENSE" \
      --description "Flyway Enterprise license key"
    echo "Flyway license added to Key Vault"
fi

# =============================================================================
# STEP 4: Configure Key Vault for GitHub OIDC (Optional)
# =============================================================================
echo ""
read -p "Do you want to set up GitHub OIDC federation? (y/n): " SETUP_OIDC

if [ "$SETUP_OIDC" == "y" ]; then
    read -p "Enter GitHub repository (format: owner/repo): " GITHUB_REPO
    read -p "Enter GitHub environment name (or press Enter for any): " GITHUB_ENV
    
    # Create federated identity credential
    TENANT_ID=$(az account show --query "tenantId" --output tsv)
    SUBSCRIPTION_ID=$(az account show --query "id" --output tsv)
    
    echo "Note: For GitHub OIDC, you need to create a Service Principal with federated credentials."
    echo "Run the following command after this script:"
    echo ""
    echo "az ad sp create-for-rbac --name \"sp-dbrosetta-github\" \\"
    echo "  --role \"Key Vault Secrets User\" \\"
    echo "  --scopes \"$KEY_VAULT_ID\" \\"
    echo "  --sdk-auth"
    echo ""
    echo "Then configure federated identity credential for GitHub Actions."
fi

# =============================================================================
# STEP 5: Save Configuration
# =============================================================================
cat >> .azure-config << EOF
KEY_VAULT_NAME=$KEY_VAULT_NAME
KEY_VAULT_ID=$KEY_VAULT_ID
EOF

echo ""
echo "=============================================================================
Key Vault Setup Complete!
=============================================================================
Key Vault Name:        $KEY_VAULT_NAME
Key Vault ID:          $KEY_VAULT_ID
Location:              $LOCATION

Secrets Added:
- PostgresConnectionString
- PostgresUser
- PostgresPassword"
if [ -n "$FLYWAY_LICENSE" ]; then
    echo "- FlywayLicense"
fi

echo "
Access Granted:
- VM Managed Identity: Key Vault Secrets User role
- Your User:           Key Vault Secrets Officer role

Next Steps:
1. SSH into VM and run setup-vm.sh
2. Configure GitHub Actions runner
3. Test secret retrieval with: az keyvault secret show --vault-name $KEY_VAULT_NAME --name PostgresPassword

Configuration appended to .azure-config
=============================================================================
"
