# Flyway Environment Setup Template

## Setting FLYWAY_PASSWORD Environment Variable

### PowerShell (Current Session)
```powershell
$env:FLYWAY_PASSWORD = "YOUR_PASSWORD_HERE"
```

### PowerShell (Persistent - Current User)
```powershell
[Environment]::SetEnvironmentVariable("FLYWAY_PASSWORD", "YOUR_PASSWORD_HERE", "User")
# Restart terminal after setting
```

### Verify Environment Variable is Set
```powershell
echo $env:FLYWAY_PASSWORD
```

## For CI/CD Pipelines
Set the `FLYWAY_PASSWORD` as a secure environment variable in your CI/CD system:
- **GitHub Actions**: Repository Secrets → New secret → Name: `FLYWAY_PASSWORD`
- **Azure DevOps**: Pipeline Variables → Add variable → Enable "Keep this value secret"
- **GitLab CI**: Settings → CI/CD → Variables → Add variable → Enable "Masked" and "Protected"

## Additional Environment Variables for CI/CD
```bash
CI_DATABASE_URL=jdbc:postgresql://YOUR_SERVER:5432/YOUR_DATABASE?sslmode=require
CI_DATABASE_USER=YOUR_USERNAME
CI_DATABASE_PASSWORD=YOUR_PASSWORD
```

**IMPORTANT**: 
- Never commit actual passwords to Git
- The `flyway.toml` file uses `${FLYWAY_PASSWORD}` which resolves from environment at runtime
- Keep `flyway.conf` out of source control (it's in `.gitignore`)
- Use `.user.toml` for local overrides (also in `.gitignore`)
