#!/bin/bash
# =============================================================================
# Azure VM Provisioning Script for GitHub Actions Self-Hosted Runner
# =============================================================================
# Purpose: Create a least-cost Azure VM in the same VNet as PostgreSQL
# Cost: Standard_B1s (1 vCPU, 1 GB RAM) - approximately $7.50/month
# =============================================================================

set -e

# =============================================================================
# CONFIGURATION VARIABLES - Update these for your environment
# =============================================================================
RESOURCE_GROUP="dbRosetta"
LOCATION="northcentralus"
VM_NAME="vm-dbrosetta-runner"
VM_SIZE="Standard_B1s"
VM_IMAGE="Ubuntu2204"
VNET_NAME="vnet-dbrosetta"
SUBNET_NAME="subnet-runners"
NSG_NAME="nsg-dbrosetta-runner"
ADMIN_USERNAME="azureuser"

# PostgreSQL Configuration
POSTGRES_VNET_NAME="vnet-dbrosetta"
POSTGRES_SUBNET_NAME="subnet-postgresql"
VNET_ADDRESS_PREFIX="10.0.0.0/16"
RUNNER_SUBNET_PREFIX="10.0.2.0/24"
POSTGRES_SUBNET_PREFIX="10.0.1.0/24"

# =============================================================================
# STEP 1: Create Resource Group
# =============================================================================
echo "Creating resource group: $RESOURCE_GROUP"
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags "project=dbRosetta" "purpose=CI/CD" "cost-center=development"

# =============================================================================
# STEP 2: Create VNet and Subnets (if not exists)
# =============================================================================
echo "Checking if VNet exists..."
if ! az network vnet show --resource-group "$RESOURCE_GROUP" --name "$VNET_NAME" &> /dev/null; then
    echo "Creating VNet: $VNET_NAME"
    az network vnet create \
      --resource-group "$RESOURCE_GROUP" \
      --name "$VNET_NAME" \
      --address-prefix "$VNET_ADDRESS_PREFIX" \
      --location "$LOCATION"
else
    echo "VNet $VNET_NAME already exists"
fi

# Create PostgreSQL subnet (if not exists)
echo "Checking if PostgreSQL subnet exists..."
if ! az network vnet subnet show --resource-group "$RESOURCE_GROUP" --vnet-name "$VNET_NAME" --name "$POSTGRES_SUBNET_NAME" &> /dev/null; then
    echo "Creating PostgreSQL subnet: $POSTGRES_SUBNET_NAME"
    az network vnet subnet create \
      --resource-group "$RESOURCE_GROUP" \
      --vnet-name "$VNET_NAME" \
      --name "$POSTGRES_SUBNET_NAME" \
      --address-prefix "$POSTGRES_SUBNET_PREFIX" \
      --service-endpoints "Microsoft.Storage" "Microsoft.KeyVault"
fi

# Create runner subnet
echo "Creating runner subnet: $SUBNET_NAME"
az network vnet subnet create \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --name "$SUBNET_NAME" \
  --address-prefix "$RUNNER_SUBNET_PREFIX" \
  --service-endpoints "Microsoft.Storage" "Microsoft.KeyVault"

# =============================================================================
# STEP 3: Create Network Security Group
# =============================================================================
echo "Creating Network Security Group: $NSG_NAME"
az network nsg create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$NSG_NAME" \
  --location "$LOCATION"

# Allow outbound HTTPS (for GitHub and Azure services)
az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --name "AllowHTTPSOutbound" \
  --priority 100 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --description "Allow HTTPS for GitHub and Azure services"

# Allow PostgreSQL connection within VNet
az network nsg rule create \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "$NSG_NAME" \
  --name "AllowPostgreSQLInVNet" \
  --priority 110 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 5432 \
  --destination-address-prefixes "$POSTGRES_SUBNET_PREFIX" \
  --description "Allow PostgreSQL connection to database subnet"

# Associate NSG with subnet
az network vnet subnet update \
  --resource-group "$RESOURCE_GROUP" \
  --vnet-name "$VNET_NAME" \
  --name "$SUBNET_NAME" \
  --network-security-group "$NSG_NAME"

# =============================================================================
# STEP 4: Generate SSH Key (if not exists)
# =============================================================================
SSH_KEY_PATH="$HOME/.ssh/dbrosetta-runner"
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "dbrosetta-runner"
else
    echo "SSH key already exists at $SSH_KEY_PATH"
fi

# =============================================================================
# STEP 5: Create VM with System-Managed Identity
# =============================================================================
echo "Creating VM: $VM_NAME"
az vm create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --location "$LOCATION" \
  --size "$VM_SIZE" \
  --image "$VM_IMAGE" \
  --admin-username "$ADMIN_USERNAME" \
  --ssh-key-values "@${SSH_KEY_PATH}.pub" \
  --vnet-name "$VNET_NAME" \
  --subnet "$SUBNET_NAME" \
  --nsg "$NSG_NAME" \
  --public-ip-address "" \
  --assign-identity \
  --tags "role=github-runner" "project=dbRosetta" \
  --output json > vm-creation-output.json

echo "VM created successfully!"

# =============================================================================
# STEP 6: Extract VM Identity
# =============================================================================
VM_IDENTITY=$(az vm show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --query "identity.principalId" \
  --output tsv)

echo ""
echo "=============================================================================
VM Provisioning Complete!
=============================================================================
Resource Group:    $RESOURCE_GROUP
VM Name:           $VM_NAME
VM Size:           $VM_SIZE (1 vCPU, 1 GB RAM)
Location:          $LOCATION
VNet:              $VNET_NAME
Subnet:            $SUBNET_NAME
Managed Identity:  $VM_IDENTITY
Admin User:        $ADMIN_USERNAME
SSH Key:           $SSH_KEY_PATH
Public IP:         None (VNet access only)

Estimated Cost:    ~$7.50/month + storage

Next Steps:
1. Run the Key Vault setup script: ./scripts/setup-keyvault.sh
2. SSH into VM: ssh -i $SSH_KEY_PATH $ADMIN_USERNAME@<private-ip>
3. Run VM setup script on the VM: ./scripts/setup-vm.sh
4. Configure GitHub Actions runner
=============================================================================
"

# Save configuration for next steps
cat > .azure-config << EOF
RESOURCE_GROUP=$RESOURCE_GROUP
VM_NAME=$VM_NAME
VM_IDENTITY=$VM_IDENTITY
LOCATION=$LOCATION
ADMIN_USERNAME=$ADMIN_USERNAME
SSH_KEY_PATH=$SSH_KEY_PATH
EOF

echo "Configuration saved to .azure-config"
