# dbRosetta API

Secure, production-ready REST API for dbRosetta PostgreSQL database access, built with TypeScript, Fastify, and Prisma.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 18+ (or Docker for local development)
- Azure CLI (for production deployment)

### Local Development Setup

1. **Install dependencies:**
   ```bash
   cd services/dbrosetta-api
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local database connection
   ```

3. **Start local PostgreSQL (via Docker):**
   ```bash
   npm run docker:up
   ```

4. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

5. **Run database migrations:**
   ```bash
   npm run prisma:migrate:dev
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Access API:**
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/docs
   - Health Check: http://localhost:3000/health

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm test` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Fix code style issues |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type check without emitting files |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate:dev` | Run migrations in development |
| `npm run prisma:migrate:deploy` | Deploy migrations to production |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |

## 🔐 Authentication & Authorization

The API uses **JWT Bearer tokens** issued by Azure AD (or any OIDC provider).

### Obtaining a Token (Azure AD)

```bash
# TODO: Add instructions for obtaining an Azure AD token
```

### Making Authenticated Requests

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/v1/dialects
```

### Role-Based Access Control (RBAC)

- **reader**: Read-only access to all endpoints
- **editor**: Read and write access (excluding admin functions)
- **admin**: Full access including admin operations

## 📚 API Endpoints

### Health & Monitoring

- `GET /health` - Overall health check
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/readiness` - Kubernetes readiness probe
- `GET /v1/metrics` - Prometheus metrics (admin only)

### Core Resources

- `GET /v1/dialects` - List SQL dialects
- `GET /v1/dialects/:id` - Get dialect by ID
- `GET /v1/terms` - List canonical terms
- `GET /v1/terms/:id` - Get term by ID
- `GET /v1/translations` - List translations
- `GET /v1/translations/:id` - Get translation by ID
- `GET /v1/artifacts` - List artifacts
- `GET /v1/artifacts/:id` - Get artifact by ID

### Query & Schema

- `POST /v1/query` - Execute parameterized query
- `GET /v1/schema` - Get sanitized schema information

See **[API Documentation](http://localhost:3000/docs)** for detailed schemas and examples.

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Test Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in `./coverage/lcov-report/index.html`.

### Postman Collection Testing

The API includes a comprehensive **Postman collection** with 40+ requests covering all endpoints.

**Run collection locally:**
```bash
npm run postman:test
```

**Run against staging:**
```bash
npm run postman:test:staging
```

**Run against production:**
```bash
npm run postman:test:production
```

**Import into Postman:**
1. Open Postman
2. Click **Import** → Select files from `postman/` folder
3. Select environment: Local, Staging, or Production
4. Start with **Health Check**, then **Auth > Login**

See **[Postman Collection Documentation](postman/README.md)** for complete usage guide.

## 🐳 Docker

### Build Image

```bash
docker build -t dbrosetta-api:latest .
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_ISSUER="https://..." \
  -e JWT_AUDIENCE="api://dbrosetta-api" \
  dbrosetta-api:latest
```

### Docker Compose (Local Development)

```bash
docker-compose up -d
```

## ☁️ Azure Deployment

### Automated CI/CD Pipeline

The API uses **GitHub Actions** for continuous integration and deployment to Azure.

**Pipeline Workflow (`.github/workflows/api-ci-cd.yml`):**

1. **Build & Test** - Runs on every push/PR
   - Lint, typecheck, and build TypeScript
   - Run unit tests
   - Upload build artifacts

2. **Docker Build** - On push to `main` or `develop`
   - Build Docker image
   - Push to Azure Container Registry
   - Tag with branch name, commit SHA, and `latest`

3. **Database Migrations** - Self-hosted runner with Managed Identity
   - **Staging**: Automatic on `develop` push
   - **Production**: Requires manual approval on `main` push
   - Fetches credentials from Azure Key Vault
   - Runs `prisma migrate deploy`

4. **Deploy to Azure App Service**
   - **Staging**: Automatic deployment to `dbrosetta-api-staging`
   - **Production**: Requires environment approval, deploys to `dbrosetta-api`
   - Health checks verify successful deployment

5. **Smoke Tests** - Post-deployment verification
   - Test health endpoints (`/health`, `/health/liveness`, `/health/readiness`)
   - Test API endpoints (`/api/v1/dialects`)
   - Validate JSON response structure

### Deployment Workflow

#### Deploy to Staging
```bash
git checkout develop
# Make your changes
git commit -m "feat: add new feature"
git push origin develop
# Automatic deployment to https://dbrosetta-api-staging.azurewebsites.net
```

#### Deploy to Production
```bash
git checkout main
git merge develop
git push origin main
# Requires manual approval in GitHub Environments
# Deploys to https://dbrosetta-api.azurewebsites.net
```

### Manual Deployment Trigger

You can manually trigger a deployment via GitHub CLI:

```bash
# Deploy to staging
gh workflow run api-ci-cd.yml --ref develop -f environment=staging

# Deploy to production (requires approval)
gh workflow run api-ci-cd.yml --ref main -f environment=production
```

### Rollback Procedure

If issues arise after deployment:

**Option 1: Redeploy previous container via Azure CLI**
```bash
# List recent deployments
az webapp deployment list \
  --name dbrosetta-api \
  --resource-group dbrosetta-rg

# Redeploy specific commit
az webapp config container set \
  --name dbrosetta-api \
  --resource-group dbrosetta-rg \
  --docker-custom-image-name dbrosettaacr.azurecr.io/dbrosetta-api:sha-<previous-commit>
```

**Option 2: Via Azure Portal**
1. Navigate to App Service → Deployment Center
2. Find the previous successful deployment
3. Click "Redeploy"

### Monitoring Deployments

- **GitHub Actions UI**: View build/deployment logs
- **Azure Portal**: App Service → Deployment Center
- **Application Logs**: 
  ```bash
  az webapp log tail --name dbrosetta-api --resource-group dbrosetta-rg
  ```
- **Health Check**: 
  ```bash
  curl https://dbrosetta-api.azurewebsites.net/health
  ```

### Required GitHub Secrets

Configure these secrets in your GitHub repository (Settings → Secrets):

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal JSON for Azure authentication |
| `ACR_USERNAME` | Azure Container Registry username |
| `ACR_PASSWORD` | Azure Container Registry password |
| `AZURE_KEY_VAULT_NAME` | Name of the Azure Key Vault |

### GitHub Environments

Create two environments with protection rules:

- **staging**: No restrictions, deploys from `develop` branch
- **production**: Requires manual approval, deploys from `main` branch

### Prerequisites

- Azure Container Registry (ACR)
- Azure App Service (staging and production)
- Azure Key Vault with database credentials
- Managed Identity assigned to App Services
- Self-hosted GitHub runner (for database migrations)

See **[Azure Deployment Guide](./docs/AZURE_DEPLOYMENT.md)** for complete setup instructions.

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Key Vault Integration (Production)

In production, sensitive values are retrieved from Azure Key Vault:

```typescript
// Database URL from Key Vault secret
DATABASE_URL=@Microsoft.KeyVault(SecretUri=https://YOUR_VAULT.vault.azure.net/secrets/db-connection-string/)
```

## 📊 Observability

### Logging

Structured JSON logs via Pino:

```typescript
logger.info({ userId, action }, 'User performed action');
```

### Metrics

Prometheus metrics exposed at `/v1/metrics` (admin only).

### Distributed Tracing

OpenTelemetry integration for distributed tracing (optional, enable via `OTEL_ENABLED=true`).

## 🔒 Security

- ✅ JWT authentication with Azure AD
- ✅ Role-based access control (RBAC)
- ✅ Helmet.js for security headers
- ✅ Rate limiting (100 req/min by default)
- ✅ CORS restricted to configured origins
- ✅ Input validation with Zod
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Secrets stored in Azure Key Vault
- ✅ TLS/HTTPS in production

### Security Checklist

- [ ] Rotate database credentials quarterly
- [ ] Review and update CORS origins
- [ ] Monitor rate limit violations
- [ ] Review access logs for anomalies
- [ ] Keep dependencies up to date
- [ ] Run security audits: `npm audit`

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Run linter: `npm run lint:fix`
4. Run tests: `npm test`
5. Commit with conventional commits: `git commit -m "feat: add new feature"`
6. Push and create a pull request

## 📄 License

MIT

## 📞 Support

For issues and questions, please open a GitHub issue or contact the dbRosetta team.

---

**Built with ❤️ by the dbRosetta Team**
