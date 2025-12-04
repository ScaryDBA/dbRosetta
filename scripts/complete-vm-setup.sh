#!/bin/bash
# Complete VM setup - Run this if setup-vm.sh didn't finish
set -e

KEY_VAULT_NAME="kv-dbrosetta-24461e90"

echo "Completing VM setup..."
echo ""

# Check if Flyway is already installed
if command -v flyway &> /dev/null; then
    echo "Flyway is already installed: $(flyway -v | head -n 1)"
else
    echo "Installing Flyway..."
    FLYWAY_VERSION="11.13.0"
    FLYWAY_DIR="/opt/flyway"
    
    cd /tmp
    wget -q "https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz"
    sudo mkdir -p "$FLYWAY_DIR"
    sudo tar -xzf "flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz" -C "$FLYWAY_DIR" --strip-components=1
    rm "flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz"
    sudo ln -sf "${FLYWAY_DIR}/flyway" /usr/local/bin/flyway
    sudo chmod +x /usr/local/bin/flyway
    echo "Flyway installed: $(flyway -v | head -n 1)"
fi

# Install PostgreSQL client if needed
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL client..."
    sudo apt-get install -y postgresql-client
fi

# Create helper scripts
echo "Creating helper scripts..."

cat > ~/get-secret.sh << EOF
#!/bin/bash
if [ -z "\$1" ]; then
    echo "Usage: \$0 <secret-name>"
    exit 1
fi
az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "\$1" --query "value" --output tsv
EOF
chmod +x ~/get-secret.sh

cat > ~/load-db-env.sh << EOF
#!/bin/bash
export FLYWAY_URL=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresConnectionString" --query "value" -o tsv)
export FLYWAY_USER=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresUser" --query "value" -o tsv)
export FLYWAY_PASSWORD=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresPassword" --query "value" -o tsv)
echo "Environment variables loaded from Key Vault"
EOF
chmod +x ~/load-db-env.sh

# Test Key Vault access
echo ""
echo "Testing Key Vault access..."
if ~/get-secret.sh PostgresUser > /dev/null 2>&1; then
    echo "✓ Key Vault access confirmed"
else
    echo "✗ Key Vault access failed"
    exit 1
fi

# Test runner status
echo ""
echo "Testing GitHub Actions runner..."
cd ~/actions-runner
sudo ./svc.sh status

echo ""
echo "=============================================================================
Setup Complete!
=============================================================================
Installed Components:
- Azure CLI: $(az version --query '"azure-cli"' -o tsv)
- Java: $(java -version 2>&1 | head -n 1)
- Flyway: $(flyway -v | head -n 1)
- PostgreSQL Client: $(psql --version)

Helper Scripts:
- ~/get-secret.sh <secret-name>    - Retrieve individual secret
- ~/load-db-env.sh                 - Load all DB env vars

Key Vault: $KEY_VAULT_NAME

Test Database Connection:
  source ~/load-db-env.sh
  flyway info -locations=filesystem:~/actions-runner/_work/dbRosetta/dbRosetta/migrations -schemas=dbrosetta

Configuration saved to ~/.runner-config
=============================================================================
"

cat > ~/.runner-config << EOF
GITHUB_REPO=ScaryDBA/dbRosetta
RUNNER_NAME=azure-runner-01
KEY_VAULT_NAME=$KEY_VAULT_NAME
RUNNER_DIR=~/actions-runner
EOF
