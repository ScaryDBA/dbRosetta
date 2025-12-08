# Self-Hosted Runner Quick Start

## One-Command Setup

### 1. Provision Infrastructure (Local Machine)
```bash
cd scripts
./provision-vm.sh
./setup-keyvault.sh
```

### 2. Configure VM (On VM via SSH)
```bash
# Copy script to VM
scp -i ~/.ssh/dbrosetta-runner scripts/setup-vm.sh azureuser@<VM_IP>:~/

# SSH and run
ssh -i ~/.ssh/dbrosetta-runner azureuser@<VM_IP>
./setup-vm.sh
```

### 3. Add GitHub Secret
```bash
# Get Key Vault name from local machine
source .azure-config
echo $KEY_VAULT_NAME

# Add to GitHub: Settings → Secrets → New repository secret
# Name: KEY_VAULT_NAME
# Value: <your-key-vault-name>
```

### 4. Test
```bash
git commit --allow-empty -m "Test runner"
git push origin main
```

## Quick Commands

### On Local Machine
```bash
# View VM details
source .azure-config
az vm show -d -g $RESOURCE_GROUP -n $VM_NAME --query "{Name:name, PowerState:powerState, PrivateIP:privateIps}" -o table

# Start/Stop VM
az vm start -g $RESOURCE_GROUP -n $VM_NAME
az vm stop -g $RESOURCE_GROUP -n $VM_NAME

# SSH to VM
VM_IP=$(az vm show -d -g $RESOURCE_GROUP -n $VM_NAME --query "privateIps" -o tsv)
ssh -i $SSH_KEY_PATH $ADMIN_USERNAME@$VM_IP
```

### On VM
```bash
# Load DB environment
source ~/load-db-env.sh

# Test Flyway
flyway info -locations=filesystem:~/actions-runner/_work/dbRosetta/dbRosetta/migrations -schemas=dbrosetta

# Check runner
cd ~/actions-runner && sudo ./svc.sh status

# View logs
journalctl -u actions.runner.* -f

# Get secret
~/get-secret.sh PostgresUser
```

## Cost: ~$9/month
- VM: $7.50
- Disk: $1.54
- Key Vault: $0.03

## Architecture
```
GitHub → Runner (VM) → Key Vault → PostgreSQL
         ↓                ↓
      Managed ID      VNet Access
```

## Support
- Full docs: [docs/RUNNER_SETUP.md](RUNNER_SETUP.md)
- Issues: https://github.com/ScaryDBA/dbRosetta/issues
