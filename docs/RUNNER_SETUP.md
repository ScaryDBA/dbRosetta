# Self-Hosted GitHub Actions Runner Setup Guide

## Overview
This guide documents the setup of a least-cost Azure VM as a self-hosted GitHub Actions runner for the dbRosetta project. The runner has secure access to Azure PostgreSQL via VNet integration and retrieves secrets from Azure Key Vault using managed identity.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Resource Group                      │
│                                                               │
│  ┌──────────────────┐         ┌────────────────────┐        │
│  │   Key Vault      │         │  PostgreSQL Flex   │        │
│  │  (Secrets)       │         │  Server (VNet)     │        │
│  └────────┬─────────┘         └──────────┬─────────┘        │
│           │                              │                   │
│           │ RBAC: Secrets User           │ 5432              │
│           │                              │                   │
│  ┌────────▼──────────────────────────────▼─────────┐        │
│  │           VNet: 10.0.0.0/16                     │        │
│  │  ┌────────────────────┐  ┌───────────────────┐ │        │
│  │  │ Subnet: Runners    │  │ Subnet: Database  │ │        │
│  │  │ 10.0.2.0/24        │  │ 10.0.1.0/24       │ │        │
│  │  │                    │  │                   │ │        │
│  │  │  ┌──────────────┐  │  │                   │ │        │
│  │  │  │ VM Runner    │  │  │                   │ │        │
│  │  │  │ Standard_B1s │◄─┼──┼──► PostgreSQL    │ │        │
│  │  │  │ (Managed ID) │  │  │                   │ │        │
│  │  │  └──────────────┘  │  │                   │ │        │
│  │  └────────────────────┘  └───────────────────┘ │        │
│  └─────────────────────────────────────────────────┘        │
│                                                               │
└───────────────────────────────┬───────────────────────────────┘
                                │ HTTPS (443)
                                │
                     ┌──────────▼─────────┐
                     │  GitHub Actions    │
                     │  (Workflow Trigger)│
                     └────────────────────┘
```

## Cost Breakdown

| Resource | SKU | Monthly Cost (USD) |
|----------|-----|-------------------|
| VM | Standard_B1s (1 vCPU, 1GB RAM) | ~$7.50 |
| Managed Disk | 30 GB Standard SSD | ~$1.54 |
| Key Vault | Operations-based | ~$0.03 |
| **Total** | | **~$9.07/month** |

## Prerequisites

- Azure subscription with Contributor role
- Azure CLI installed locally
- PostgreSQL Flexible Server already provisioned
- GitHub repository with admin access
- GitHub Personal Access Token (PAT) with `repo` scope

## Setup Steps

### Step 1: Provision Azure VM

Run the provisioning script from your local machine:

```bash
cd scripts
chmod +x provision-vm.sh
./provision-vm.sh
```

**What it does:**
- Creates resource group `rg-dbrosetta`
- Creates VNet with two subnets (runners and database)
- Creates Network Security Group with required rules
- Provisions Standard_B1s Ubuntu 22.04 VM
- Enables system-managed identity
- Generates SSH key pair
- Saves configuration to `.azure-config`

**Output:**
```
Resource Group:    rg-dbrosetta
VM Name:           vm-dbrosetta-runner
VM Size:           Standard_B1s (1 vCPU, 1 GB RAM)
Managed Identity:  <principal-id>
SSH Key:           ~/.ssh/dbrosetta-runner
Estimated Cost:    ~$7.50/month
```

### Step 2: Setup Key Vault

Run the Key Vault setup script:

```bash
./setup-keyvault.sh
```

**What it does:**
- Creates Azure Key Vault with RBAC authorization
- Prompts for PostgreSQL password (not stored in script)
- Adds secrets: `PostgresConnectionString`, `PostgresUser`, `PostgresPassword`
- Optionally adds `FlywayLicense` for Enterprise features
- Grants VM managed identity `Key Vault Secrets User` role
- Saves Key Vault name to `.azure-config`

**Important:** The script will prompt you for sensitive values. Never commit these to Git.

### Step 3: SSH into VM

Get the VM's private IP address:

```bash
source .azure-config
VM_PRIVATE_IP=$(az vm show -d \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --query "privateIps" -o tsv)

echo "VM Private IP: $VM_PRIVATE_IP"
```

SSH into the VM (you may need a bastion host or VPN):

```bash
ssh -i ~/.ssh/dbrosetta-runner azureuser@$VM_PRIVATE_IP
```

**Alternative:** Use Azure Bastion for secure access without public IP.

### Step 4: Run VM Setup Script

Copy the setup script to the VM:

```bash
# From your local machine
scp -i ~/.ssh/dbrosetta-runner scripts/setup-vm.sh azureuser@$VM_PRIVATE_IP:~/
```

SSH into the VM and run the setup script:

```bash
ssh -i ~/.ssh/dbrosetta-runner azureuser@$VM_PRIVATE_IP
chmod +x setup-vm.sh
./setup-vm.sh
```

**What it does:**
- Updates system packages
- Installs Azure CLI and logs in with managed identity
- Installs GitHub Actions runner and registers with repository
- Installs Flyway Enterprise CLI
- Installs PostgreSQL client tools
- Creates helper scripts for Key Vault access
- Validates connectivity to Key Vault
- Starts runner as a systemd service

**You will be prompted for:**
- GitHub repository (format: `owner/repo`)
- Runner name (default: `azure-runner-01`)
- Runner labels (default: `self-hosted,linux,x64`)
- GitHub Personal Access Token (PAT)
- Key Vault name (from previous step)

### Step 5: Validate Setup

#### A. Check Runner Status on VM

```bash
cd ~/actions-runner
sudo ./svc.sh status
```

Expected output:
```
● actions.runner.<repo>.<runner-name>.service - GitHub Actions Runner
   Loaded: loaded
   Active: active (running)
```

#### B. Check Runner in GitHub

Navigate to: `https://github.com/<owner>/<repo>/settings/actions/runners`

You should see your runner listed as "Idle" with a green dot.

#### C. Test Key Vault Access

```bash
# Load environment variables
source ~/load-db-env.sh

# Test Flyway info
flyway info -locations=filesystem:~/actions-runner/_work/<repo>/<repo>/migrations -schemas=dbrosetta
```

Expected output:
```
Database: jdbc:postgresql://dbrosetta.postgres.database.azure.com:5432/dbrosetta (PostgreSQL 18.0)
Schema version: 1

+-----------+---------+-------------+------+--------------+---------+----------+
| Category  | Version | Description | Type | Installed On | State   | Undoable |
+-----------+---------+-------------+------+--------------+---------+----------+
| Versioned | 1       | baseline    | SQL  | 2025-12-03   | Success | No       |
+-----------+---------+-------------+------+--------------+---------+----------+
```

#### D. Test PostgreSQL Connection

```bash
source ~/load-db-env.sh

# Extract host from JDBC URL
PGHOST=$(echo $FLYWAY_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')

# Test connection
psql "host=$PGHOST port=5432 dbname=dbrosetta user=$FLYWAY_USER sslmode=require" -c "SELECT version();"
```

Expected output:
```
PostgreSQL 18.0 on x86_64-pc-linux-gnu, compiled by gcc ...
```

## GitHub Actions Configuration

### Add Repository Secret

Add the Key Vault name as a GitHub repository secret:

1. Go to: `https://github.com/<owner>/<repo>/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `KEY_VAULT_NAME`
4. Value: `<your-key-vault-name>` (from `.azure-config`)
5. Click "Add secret"

### Workflow File

The workflow file is already created at `.github/workflows/flyway-migrate.yml`.

**Key features:**
- Runs on self-hosted runner with labels: `[self-hosted, linux, x64]`
- Logs in with VM managed identity (no credentials needed)
- Retrieves secrets from Key Vault at runtime
- Validates migrations on all branches
- Applies migrations only on `main` branch
- Generates migration report artifact

### Test Workflow

Create a test commit to trigger the workflow:

```bash
# Make a minor change to trigger workflow
git commit --allow-empty -m "Test self-hosted runner"
git push origin main
```

Check workflow run: `https://github.com/<owner>/<repo>/actions`

## Helper Scripts on VM

The setup creates several helper scripts in the runner's home directory:

### `~/get-secret.sh`
Retrieve individual secret from Key Vault:
```bash
~/get-secret.sh PostgresPassword
```

### `~/load-db-env.sh`
Load all database environment variables:
```bash
source ~/load-db-env.sh
echo $FLYWAY_URL
```

### `~/.runner-config`
Configuration file with runner details:
```bash
cat ~/.runner-config
```

## Security Best Practices

### ✅ Implemented
- [x] VM uses system-managed identity (no credentials in code)
- [x] Key Vault uses RBAC with least privilege access
- [x] Secrets retrieved at runtime (not stored in repo)
- [x] No public IP on VM (VNet access only)
- [x] NSG restricts traffic to required ports only
- [x] PostgreSQL requires SSL connection
- [x] Passwords masked in GitHub Actions logs

### ⚠️ Additional Recommendations
- [ ] Enable Azure Monitor for VM metrics
- [ ] Configure log analytics for audit logs
- [ ] Set up Azure Backup for VM disk
- [ ] Enable automatic security updates
- [ ] Configure firewall rules for GitHub IP ranges
- [ ] Implement Azure Bastion for secure SSH access
- [ ] Rotate GitHub PAT regularly
- [ ] Enable Key Vault soft delete and purge protection

## Maintenance

### Update Runner

```bash
cd ~/actions-runner
sudo ./svc.sh stop
./config.sh remove --token <removal-token>
# Download new version and reconfigure
sudo ./svc.sh start
```

### Update Flyway

```bash
FLYWAY_VERSION="<new-version>"
cd /tmp
wget "https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz"
sudo tar -xzf "flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz" -C /opt/flyway --strip-components=1
flyway -v
```

### Restart Runner Service

```bash
cd ~/actions-runner
sudo ./svc.sh restart
```

### View Runner Logs

```bash
journalctl -u actions.runner.<repo>.<runner-name>.service -f
```

## Troubleshooting

### Runner Not Appearing in GitHub

**Check service status:**
```bash
cd ~/actions-runner
sudo ./svc.sh status
journalctl -u actions.runner.* -n 50
```

**Re-register runner:**
```bash
cd ~/actions-runner
sudo ./svc.sh stop
./config.sh remove --token <removal-token>
# Get new registration token and reconfigure
sudo ./svc.sh start
```

### Key Vault Access Denied

**Verify managed identity:**
```bash
az login --identity
az account show
```

**Check RBAC assignment:**
```bash
az role assignment list --assignee <vm-principal-id> --all
```

**Re-grant access:**
```bash
source .azure-config  # On local machine
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee "$VM_IDENTITY" \
  --scope "$KEY_VAULT_ID"
```

### PostgreSQL Connection Failed

**Check NSG rules:**
```bash
az network nsg rule list \
  --resource-group "$RESOURCE_GROUP" \
  --nsg-name "nsg-dbrosetta-runner" \
  --output table
```

**Test connectivity:**
```bash
nc -zv dbrosetta.postgres.database.azure.com 5432
```

**Check PostgreSQL firewall:**
Ensure VNet rule exists in PostgreSQL server settings.

### Workflow Fails with "Runner Not Found"

**Check runner labels in workflow:**
```yaml
runs-on: [self-hosted, linux, x64]
```

**Verify runner labels in GitHub:**
Settings → Actions → Runners → Your runner → Labels

## Cost Optimization

### Auto-Shutdown
Configure VM to auto-shutdown during non-working hours:

```bash
az vm auto-shutdown \
  --resource-group "$RESOURCE_GROUP" \
  --name "$VM_NAME" \
  --time "1900" \
  --timezone "Eastern Standard Time"
```

### Reserved Instance
For 24/7 usage, purchase a 1-year reserved instance to save ~40%:
- Standard_B1s 1-year reserved: ~$4.50/month (down from $7.50)

### Spot Instance
For non-critical workloads, use spot instance for ~80% discount:
```bash
az vm create ... --priority Spot --max-price 0.01
```

## Decommissioning

To remove all resources:

```bash
# Stop and remove runner
ssh -i ~/.ssh/dbrosetta-runner azureuser@$VM_PRIVATE_IP
cd ~/actions-runner
sudo ./svc.sh stop
./config.sh remove --token <removal-token>

# Delete Azure resources
az group delete --name rg-dbrosetta --yes --no-wait
```

## References

- [GitHub Actions Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Azure Managed Identities](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [Azure Key Vault RBAC](https://learn.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Flyway Documentation](https://documentation.red-gate.com/fd)
- [PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/)

## Support

For issues or questions:
- GitHub Issues: https://github.com/<owner>/dbRosetta/issues
- Azure Support: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
