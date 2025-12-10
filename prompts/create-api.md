Project: dbRosetta Secure API — Implementation Plan and Tasks

Context
You are an expert backend engineer and DevOps automation assistant. Implement a secure, production-ready REST API for dbRosetta that runs in Azure, accesses our PostgreSQL database, and is consumable by a WordPress front end. All code must be TypeScript, follow best practices, include a full test suite, and integrate into the existing GitHub repository and GitHub Actions pipeline.

High-level Goals
1. Create a secure, well-documented REST API that exposes read and query endpoints for dbRosetta PostgreSQL data.
2. Use Azure-managed services and security best practices (Managed Identity, Key Vault, private endpoints, firewall rules).
3. Integrate code into the existing GitHub repo with clear branch/PR workflow and CI/CD via existing GitHub Actions.
4. Provide unit, integration, and end-to-end tests plus a Postman collection and contract tests.
5. Produce OpenAPI (Swagger) documentation and example client usage for WordPress (AJAX/REST calls).

Constraints and Nonfunctional Requirements
- Language: **TypeScript** (Node.js 18+).
- Framework: **Fastify** (or Express if preferred) with dependency injection and typed request/response models.
- ORM/DB Layer: **TypeORM** or **Prisma** (prefer Prisma for type-safety and migrations).
- Secrets: **Azure Key Vault** for DB connection strings and JWT signing keys.
- Authentication: **OAuth2 / OpenID Connect** with Azure AD or JWT bearer tokens issued by a trusted identity provider; support role-based access control (RBAC).
- Network: Use **Azure Private Endpoint** for PostgreSQL and restrict API access via Azure App Service VNet integration or Azure API Management.
- CI/CD: Use existing GitHub Actions pipeline; add jobs for build, lint, test, migration, and deploy.
- Observability: Structured logging (Winston/Pino), distributed tracing (OpenTelemetry), and Azure Monitor integration.
- Security: Parameterized queries, input validation, rate limiting, CORS restricted to WordPress domain(s), and automated dependency scanning.

Deliverables
- New API service in `services/dbrosetta-api/` with:
  - `src/` TypeScript source
  - `tests/` unit and integration tests
  - `prisma/` or `migrations/` DB schema and migration scripts
  - `openapi.yaml` generated from code
  - `Dockerfile` and Azure deployment manifest (ARM/Bicep or Terraform snippets)
  - `README.md` with setup, local dev, and deployment instructions
- GitHub Actions workflow updates or new workflow file that plugs into existing pipeline steps
- Postman collection and example WordPress client snippet
- Test coverage report and contract tests
- Security checklist and runbook for rotating secrets and emergency rollback

API Surface and Example Endpoints
Design endpoints to be RESTful, paginated, and filterable. Example endpoints:
- `GET /v1/records` — list records with pagination, sorting, and filters (query params).
- `GET /v1/records/{id}` — fetch single record by id.
- `POST /v1/query` — parameterized, read-only query endpoint that accepts a safe query DSL (no raw SQL).
- `GET /v1/schema` — returns a sanitized schema summary for the WordPress UI.
- `GET /v1/health` — readiness and liveness checks.
- `GET /v1/metrics` — Prometheus-compatible metrics (secured).

Security and Access Control
- **Authentication**: Validate JWTs issued by Azure AD or a configured OIDC provider. Reject unsigned or expired tokens.
- **Authorization**: Implement RBAC with scopes/roles (e.g., `reader`, `admin`). Enforce at route level.
- **Secrets**: Do not store secrets in repo or environment variables in plaintext. Use Azure Key Vault and assign the API a Managed Identity to fetch secrets at runtime.
- **Network Security**: Use private endpoints for PostgreSQL; restrict API inbound traffic via Azure API Management or App Service access restrictions; enable TLS everywhere.
- **SQL Safety**: Use Prisma/TypeORM parameterized queries; never interpolate user input into raw SQL. Validate and sanitize all inputs.
- **Rate Limiting and Throttling**: Implement per-IP and per-client rate limits; return standard 429 responses.
- **CORS**: Restrict to the WordPress domain(s) and admin origins only.

Database Access and Migrations
- Use Prisma (recommended) with a schema that maps to existing PostgreSQL tables; include migration scripts.
- Provide a safe read-only query DSL for complex queries that maps to parameterized Prisma queries.
- Add a migration job in CI that runs `prisma migrate deploy` against a staging DB and requires manual approval for production.

Local Development and Secrets
- Provide `.env.example` with placeholders.
- Local dev should support a Docker Compose setup with a local Postgres instance and a local Key Vault emulator or secrets file (for dev only).
- Document how to authenticate locally with Azure AD (dev flow) or use a test JWT.

Testing Strategy
- **Unit tests**: Jest with ts-jest for services, controllers, and utilities.
- **Integration tests**: Spin up a test Postgres (Docker) and run tests against it; use test fixtures and transactions to isolate tests.
- **Contract tests**: Use Pact or similar to validate API contract with the WordPress client expectations.
- **E2E tests**: Use Supertest or Playwright for API flows.
- **CI**: Run lint, typecheck, unit tests, integration tests (with a test DB container), and generate coverage. Fail pipeline on coverage drop below threshold (e.g., 80%).
- Provide a Postman collection and automated Newman run in CI for smoke tests post-deploy.

CI/CD and GitHub Actions Integration
- Add or update workflow steps:
  - `build` — install, lint, typecheck, build.
  - `test` — run unit and integration tests; start test DB container as needed.
  - `migrate` — run migrations against staging (manual approval for prod).
  - `containerize` — build and push Docker image to Azure Container Registry.
  - `deploy` — deploy to Azure App Service or Azure Container Apps using existing pipeline secrets and service principal.
  - `post-deploy` — run smoke tests and health checks.
- Use environment-specific secrets stored in GitHub Secrets and Azure Key Vault.
- Ensure pipeline uses least privilege service principal and supports rollback.

Repository Integration and Developer Workflow
- Create a feature branch `feature/api/dbrosetta` and open a PR with the implementation.
- Include a PR template that requires: architecture diagram, security checklist, migration plan, and test results.
- Add CODEOWNERS for the API folder.
- Add pre-commit hooks (husky) for linting and formatting.

Observability and Monitoring
- Structured JSON logs with request IDs.
- Expose Prometheus metrics and integrate with Azure Monitor.
- Add alerts for error rate, latency, and failed deployments.

Acceptance Criteria
- API endpoints implemented and documented in OpenAPI.
- All tests pass in CI and coverage meets threshold.
- Secrets are stored in Key Vault and accessed via Managed Identity.
- Deployment via GitHub Actions to staging succeeds and smoke tests pass.
- WordPress-compatible example client snippet provided.
- Security checklist completed and reviewed.

Developer Tasks and Step-by-Step Implementation Plan
1. Initialize service folder `services/dbrosetta-api` with TypeScript, Fastify, Prisma, ESLint, Prettier, and Jest.
2. Add Prisma schema and generate client; create initial migration from existing DB schema.
3. Implement DB layer with typed models and safe query helpers.
4. Implement authentication middleware for JWT/OIDC and RBAC enforcement.
5. Implement endpoints and input validation (zod or class-validator).
6. Add OpenAPI generation and serve Swagger UI on a secured route.
7. Add logging, metrics, and health endpoints.
8. Write unit tests for each module and integration tests for endpoints using a test DB container.
9. Add Dockerfile and Azure deployment manifests.
10. Update GitHub Actions workflows to include build/test/migrate/deploy steps and Newman/Postman smoke tests.
11. Document local dev, secrets, and deployment steps in README.
12. Create Postman collection and example WordPress AJAX client snippet.
13. Run security review and fix any issues; finalize PR.

PR Checklist
- Code compiles and lints clean.
- Tests pass and coverage threshold met.
- OpenAPI spec included and validated.
- Migration scripts included and tested.
- Secrets not in repo; Key Vault integration documented.
- CI pipeline updated and tested on staging.
- README and runbook updated.

Notes for Copilot
- Generate code in small, reviewable commits with clear messages.
- Prefer explicit typing and small, testable functions.
- When scaffolding, include TODOs for environment-specific values and manual approval gates for production migration/deploy steps.
- Provide example curl and WordPress fetch snippets for each endpoint.

End of prompt.
