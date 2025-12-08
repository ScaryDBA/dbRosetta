#!/bin/bash
# =============================================================================
# VM Setup Script - Run this ON the VM after SSH
# =============================================================================
# Purpose: Install GitHub Actions runner and Flyway Enterprise CLI
# Requirements: Ubuntu 22.04 LTS with system-managed identity
# =============================================================================

set -e

echo "=============================================================================
GitHub Actions Runner + Flyway Enterprise Setup
=============================================================================
This script will:
1. Update system packages
2. Install required dependencies
3. Install Azure CLI
4. Install GitHub Actions runner
5. Install Flyway Enterprise CLI
6. Configure runner service
7. Validate Key Vault connectivity
=============================================================================
"

# =============================================================================
# STEP 1: Update System and Install Dependencies
# =============================================================================
echo "[1/7] Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

echo "Installing dependencies..."
sudo apt-get install -y \
    curl \
    wget \
    git \
    jq \
    unzip \
    ca-certificates \
    apt-transport-https \
    lsb-release \
    gnupg \
    openjdk-17-jre-headless

# =============================================================================
# STEP 2: Install Azure CLI
# =============================================================================
echo "[2/7] Installing Azure CLI..."
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login with managed identity
echo "Logging in with managed identity..."
az login --identity

# =============================================================================
# STEP 3: Install GitHub Actions Runner
# =============================================================================
echo "[3/7] Installing GitHub Actions runner..."

# Prompt for GitHub configuration
read -p "Enter GitHub repository (format: owner/repo): " GITHUB_REPO
read -p "Enter runner name (default: azure-runner-01): " RUNNER_NAME
RUNNER_NAME=${RUNNER_NAME:-azure-runner-01}
read -p "Enter runner labels (comma-separated, default: self-hosted,linux,x64): " RUNNER_LABELS
RUNNER_LABELS=${RUNNER_LABELS:-self-hosted,linux,x64}
read -sp "Enter GitHub personal access token (PAT) with repo scope: " GITHUB_TOKEN
echo ""

# Create runner directory
RUNNER_DIR="$HOME/actions-runner"
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download latest runner
RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r '.tag_name' | sed 's/v//')
echo "Downloading GitHub Actions runner v${RUNNER_VERSION}..."
curl -o actions-runner-linux-x64.tar.gz -L "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"

# Extract runner
tar xzf actions-runner-linux-x64.tar.gz
rm actions-runner-linux-x64.tar.gz

# Get registration token
echo "Getting registration token from GitHub..."
REGISTRATION_TOKEN=$(curl -s -X POST \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${GITHUB_REPO}/actions/runners/registration-token" \
    | jq -r '.token')

# Configure runner
echo "Configuring runner..."
./config.sh \
    --url "https://github.com/${GITHUB_REPO}" \
    --token "${REGISTRATION_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}" \
    --work "_work" \
    --unattended \
    --replace

# Install and start runner as a service
echo "Installing runner as a service..."
sudo ./svc.sh install
sudo ./svc.sh start

# =============================================================================
# STEP 4: Install Flyway Enterprise CLI
# =============================================================================
echo "[4/7] Installing Flyway Enterprise CLI..."

FLYWAY_VERSION="11.13.0"
FLYWAY_DIR="/opt/flyway"
sudo mkdir -p "$FLYWAY_DIR"

echo "Downloading Flyway Enterprise ${FLYWAY_VERSION}..."
cd /tmp
wget -q "https://download.red-gate.com/maven/release/com/redgate/flyway/flyway-commandline/${FLYWAY_VERSION}/flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz"

echo "Extracting Flyway..."
sudo tar -xzf "flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz" -C "$FLYWAY_DIR" --strip-components=1
rm "flyway-commandline-${FLYWAY_VERSION}-linux-x64.tar.gz"

# Create symlink
sudo ln -sf "${FLYWAY_DIR}/flyway" /usr/local/bin/flyway
sudo chmod +x /usr/local/bin/flyway

# Verify installation
flyway -v

# =============================================================================
# STEP 5: Install PostgreSQL Client
# =============================================================================
echo "[5/7] Installing PostgreSQL client tools..."
sudo apt-get install -y postgresql-client

# =============================================================================
# STEP 6: Create Helper Scripts for Key Vault Access
# =============================================================================
echo "[6/7] Creating Key Vault helper scripts..."

# Prompt for Key Vault name
read -p "Enter Key Vault name: " KEY_VAULT_NAME

cat > ~/get-secret.sh << 'EOF'
#!/bin/bash
# Helper script to retrieve secrets from Key Vault
if [ -z "$1" ]; then
    echo "Usage: $0 <secret-name>"
    exit 1
fi

SECRET_NAME=$1
az keyvault secret show \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$SECRET_NAME" \
    --query "value" \
    --output tsv
EOF

chmod +x ~/get-secret.sh

# Create environment loader script
cat > ~/load-db-env.sh << EOF
#!/bin/bash
# Load database environment variables from Key Vault
export FLYWAY_URL=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresConnectionString" --query "value" -o tsv)
export FLYWAY_USER=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresUser" --query "value" -o tsv)
export FLYWAY_PASSWORD=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresPassword" --query "value" -o tsv)

# Optional: Flyway license
FLYWAY_LICENSE=\$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "FlywayLicense" --query "value" -o tsv 2>/dev/null)
if [ -n "\$FLYWAY_LICENSE" ]; then
    export FLYWAY_LICENSE_KEY=\$FLYWAY_LICENSE
fi

echo "Environment variables loaded from Key Vault"
EOF

chmod +x ~/load-db-env.sh

# =============================================================================
# STEP 7: Validate Setup
# =============================================================================
echo "[7/7] Validating setup..."

echo ""
echo "Testing Azure CLI with managed identity..."
az account show

echo ""
echo "Testing Key Vault access..."
if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "PostgresUser" --query "value" -o tsv > /dev/null 2>&1; then
    echo "✓ Key Vault access confirmed"
else
    echo "✗ Key Vault access failed - check managed identity permissions"
fi

echo ""
echo "Testing Flyway installation..."
flyway -v

echo ""
echo "Testing PostgreSQL client..."
psql --version

echo ""
echo "Testing GitHub Actions runner service..."
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
- GitHub Actions Runner: Running as service

Helper Scripts:
- ~/get-secret.sh <secret-name>    - Retrieve individual secret
- ~/load-db-env.sh                 - Load all DB env vars

GitHub Actions Runner:
- Name: $RUNNER_NAME
- Repository: $GITHUB_REPO
- Labels: $RUNNER_LABELS
- Status: Use 'sudo $RUNNER_DIR/svc.sh status' to check

Key Vault:
- Name: $KEY_VAULT_NAME
- Secrets: PostgresConnectionString, PostgresUser, PostgresPassword

Next Steps:
1. Test database connectivity:
   source ~/load-db-env.sh
   flyway info -locations=filesystem:/path/to/migrations

2. Check runner in GitHub:
   https://github.com/$GITHUB_REPO/settings/actions/runners

3. Create a test workflow to validate the setup
=============================================================================
"

# Save configuration
cat > ~/.runner-config << EOF
GITHUB_REPO=$GITHUB_REPO
RUNNER_NAME=$RUNNER_NAME
KEY_VAULT_NAME=$KEY_VAULT_NAME
RUNNER_DIR=$RUNNER_DIR
EOF

echo "Configuration saved to ~/.runner-config"
