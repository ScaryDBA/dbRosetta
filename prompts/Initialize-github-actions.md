# Goal
Provision a least‑cost Azure VM inside the target VNet to act as a self‑hosted GitHub Actions runner for dbRosetta. Configure it to securely retrieve secrets from Azure Key Vault at runtime.

# Context
- Cloud: Azure
- Database: PostgreSQL Flexible Server (private VNet access only)
- Runner: GitHub Actions self‑hosted
- Tooling: Flyway Enterprise CLI
- Secrets: Stored in Azure Key Vault, accessed via managed identity/OIDC
- Cost sensitivity: minimize VM size while maintaining functionality

# Constraints
- VM must be inside the same VNet/subnet as PostgreSQL Flexible Server
- Use Ubuntu LTS image for lowest cost and compatibility
- VM size: Standard_B1s (1 vCPU, 1 GB RAM)
- No public IP; access only via VNet
- GitHub Actions runner service installed
- Flyway Enterprise CLI installed
- Secrets retrieved from Key Vault at runtime (no secrets in repo)

# Deliverable
- Azure CLI commands to provision VM and enable system-managed identity
- Key Vault setup: create vault, add DB connection string + Flyway license
- GitHub Actions workflow snippet to fetch secrets via OIDC
- Connectivity validation log (`flyway info`)

# Steps
1. Create resource group if not exists.
2. Provision VM:
   - `az vm create` with Ubuntu LTS image
   - Size: Standard_B1s
   - VNet/subnet: same as PostgreSQL Flexible Server
   - Disable public IP
   - Enable system-managed identity
3. Create Azure Key Vault; add secrets (DB connection string, Flyway license).
4. Grant VM identity `Key Vault Secrets User` role.
5. SSH into VM; install GitHub Actions runner service.
6. Install Flyway Enterprise CLI.
7. Validate connectivity: runner retrieves secrets from Key Vault → run `flyway info`.
8. Document setup in `/docs/runner-setup.md`.

# Output Format
- Azure CLI commands
- Bash install script for runner + Flyway
- GitHub Actions workflow snippet for OIDC + Key Vault
- Connectivity validation log
