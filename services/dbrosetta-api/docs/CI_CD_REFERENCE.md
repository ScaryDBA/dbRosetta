# CI/CD Pipeline Quick Reference

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Push/PR Event                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 1: Build & Test (ubuntu-latest)                           │
│  • npm ci                                                       │
│  • npm run lint                                                 │
│  • npm run typecheck                                            │
│  • npm run prisma:generate                                      │
│  • npm run build                                                │
│  • Upload artifacts                                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 2: Docker Build (ubuntu-latest)                           │
│  Condition: push to main/develop                                │
│  • docker build                                                 │
│  • docker tag (branch, sha, latest)                             │
│  • docker push to ACR                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 3: Migrate Database (self-hosted runner)                  │
│  • Staging: automatic (develop)                                 │
│  • Production: requires approval (main)                         │
│  • az login --identity                                          │
│  • Fetch DB credentials from Key Vault                          │
│  • npx prisma migrate deploy                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 4: Deploy to Azure (ubuntu-latest)                        │
│  • Staging: automatic                                           │
│  • Production: requires environment approval                    │
│  • az webapp deploy                                             │
│  • Health check (10 retries)                                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  Job 5: Smoke Tests (ubuntu-latest)                            │
│  • Test /health endpoints                                       │
│  • Test /api/v1/dialects                                        │
│  • Validate JSON structure                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Workflow Triggers

| Event | Branch | Behavior |
|-------|--------|----------|
| Push | `main` | Build → Deploy to Production (requires approval) |
| Push | `develop` | Build → Deploy to Staging (automatic) |
| Push | `Part5-API` | Build only (no deployment) |
| Pull Request | `main`, `develop` | Build and test only |
| Manual | Any | Manual trigger with environment selection |

## Job Dependencies

```
build-and-test
    └─> docker-build
            └─> migrate-staging (if develop)
                    └─> deploy-staging
                            └─> smoke-test-staging

build-and-test
    └─> docker-build
            └─> migrate-production (if main + approval)
                    └─> deploy-production
                            └─> smoke-test-production
```

## Environment Variables

### Workflow-Level (`env:`)
- `NODE_VERSION`: 18.x
- `API_PATH`: services/dbrosetta-api
- `AZURE_WEBAPP_NAME`: dbrosetta-api
- `AZURE_CONTAINER_REGISTRY`: dbrosettaacr
- `IMAGE_NAME`: dbrosetta-api

### GitHub Secrets (Required)
- `AZURE_CREDENTIALS`: Service principal JSON
- `ACR_USERNAME`: Container registry username
- `ACR_PASSWORD`: Container registry password
- `AZURE_KEY_VAULT_NAME`: Key Vault name

### Runtime Secrets (from Key Vault)
- `db-staging-host`
- `db-staging-name`
- `db-staging-user`
- `db-staging-password`
- `db-production-host`
- `db-production-name`
- `db-production-user`
- `db-production-password`

## Docker Image Tags

| Tag Pattern | Example | Usage |
|-------------|---------|-------|
| `latest` | `latest` | Latest from `main` branch |
| `{branch}` | `develop` | Latest from specific branch |
| `{branch}-{sha}` | `develop-sha-abc123` | Specific commit |

## Health Check Endpoints

The smoke tests verify these endpoints:

| Endpoint | Expected Status | Description |
|----------|----------------|-------------|
| `/health` | 200 | Overall health with DB connection |
| `/health/liveness` | 200 | Service is alive (no DB check) |
| `/health/readiness` | 200 | Service is ready to handle traffic |

## Common Tasks

### View Workflow Runs
```bash
gh run list --workflow=api-ci-cd.yml
```

### Watch Live Build
```bash
gh run watch
```

### Cancel Running Workflow
```bash
gh run cancel <run-id>
```

### Re-run Failed Workflow
```bash
gh run rerun <run-id>
```

### View Logs
```bash
gh run view <run-id> --log
```

### Trigger Manual Deployment
```bash
# Staging
gh workflow run api-ci-cd.yml --ref develop -f environment=staging

# Production (requires approval in UI)
gh workflow run api-ci-cd.yml --ref main -f environment=production
```

## Troubleshooting

### Build Fails on Lint
```bash
# Fix locally first
cd services/dbrosetta-api
npm run lint:fix
git commit -am "fix: lint errors"
git push
```

### Docker Build Fails
- Check Dockerfile syntax
- Verify `.dockerignore` doesn't exclude required files
- Check ACR credentials in GitHub Secrets

### Migration Fails
- Verify self-hosted runner is online
- Check runner has Azure CLI installed
- Verify Managed Identity has Key Vault access
- Check database firewall rules allow runner IP

### Deployment Fails
- Verify Azure App Service exists
- Check App Service can pull from ACR
- Verify container image was pushed successfully
- Check App Service logs: `az webapp log tail`

### Health Check Fails
- Check App Service status in Azure Portal
- View container logs: `az webapp log tail`
- Verify DATABASE_URL is set correctly
- Check database is accessible from App Service

### Smoke Tests Fail
- Check API is responding: `curl https://app-url/health`
- Verify database has data
- Check CORS settings if calling from browser
- Review API logs for errors

## Approval Process (Production)

1. Code is merged to `main` branch
2. Build and Docker jobs complete
3. **GitHub pauses for approval** (environment protection rule)
4. Reviewer receives notification
5. Reviewer clicks "Review deployments" in GitHub Actions UI
6. Reviewer approves or rejects
7. If approved, migration and deployment proceed

## Rollback Checklist

If production deployment causes issues:

- [ ] Stop the workflow if still running
- [ ] Identify last known good commit SHA
- [ ] Redeploy previous container:
  ```bash
  az webapp config container set \
    --name dbrosetta-api \
    --resource-group dbrosetta-rg \
    --docker-custom-image-name dbrosettaacr.azurecr.io/dbrosetta-api:main-sha-<good-commit>
  ```
- [ ] Verify health check passes
- [ ] Run smoke tests manually
- [ ] Check if database migration needs rollback (requires manual intervention)
- [ ] Document incident and root cause

## Monitoring

### GitHub Actions
- View all runs: https://github.com/ScaryDBA/dbRosetta/actions/workflows/api-ci-cd.yml
- Enable notifications for failed deployments

### Azure
- App Service Metrics: CPU, Memory, Response Time
- Log Stream: Real-time logs
- Application Insights: Detailed telemetry (if configured)

### Alerts (Configure in Azure Monitor)
- CPU > 80% for 5 minutes
- Memory > 90% for 5 minutes
- HTTP 5xx errors > 10 per minute
- Response time > 2 seconds (p95)

## Best Practices

1. **Always test in staging first**
   - Merge to `develop` → automatic staging deployment
   - Verify functionality in staging
   - Then merge `develop` to `main` for production

2. **Use feature branches**
   - Branch from `develop` for features
   - PR to `develop` for review
   - CI runs tests on PR

3. **Tag releases**
   ```bash
   git tag -a v1.2.0 -m "Release v1.2.0"
   git push origin v1.2.0
   ```

4. **Monitor after deployment**
   - Watch health metrics for 15 minutes
   - Check error logs
   - Verify smoke tests pass

5. **Database migrations**
   - Test migrations in staging first
   - Ensure migrations are reversible
   - Back up database before production migration

## Workflow Customization

### Add More Tests
Edit `.github/workflows/api-ci-cd.yml`, job `build-and-test`:
```yaml
- name: Run integration tests
  working-directory: ${{ env.API_PATH }}
  run: npm run test:integration
```

### Add Postman/Newman Tests
Add to smoke test jobs:
```yaml
- name: Run Postman Collection
  run: |
    npm install -g newman
    newman run postman-collection.json \
      --env-var baseUrl=$BASE_URL
```

### Deploy to Multiple Regions
Duplicate the deploy job with different regions:
```yaml
deploy-staging-east:
  # Deploy to East US
deploy-staging-west:
  # Deploy to West US
```

## Cost Considerations

| Resource | Tier | Monthly Cost (est.) |
|----------|------|---------------------|
| App Service Plan B1 | Basic | ~$13 |
| Container Registry | Basic | ~$5 |
| Key Vault | Standard | ~$0.03 per 10k ops |
| **Total** | | **~$18/month** |

GitHub Actions minutes:
- Public repos: Unlimited
- Private repos: 2,000 free minutes/month
- Self-hosted runners: Free
