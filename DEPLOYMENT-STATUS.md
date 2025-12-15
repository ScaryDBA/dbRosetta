# dbRosetta API - Deployment Status

## ✅ Successfully Deployed!

The dbRosetta API is now running on Azure App Service:
- **Staging URL**: https://dbrosetta-api-staging.azurewebsites.net
- **Health Status**: ✅ Healthy (database connected)
- **Database**: PostgreSQL Flexible Server on Azure

---

## 🔑 JWT Token for WordPress Plugin

### Test User Credentials
- **Email**: `your-test-user@example.com`
- **Password**: `[Create a test user via API]`

### JWT Access Token
```
[Obtain token by calling POST /api/v1/auth/login with your test user credentials]
```

---

## 📝 WordPress Plugin Configuration

### Step 1: Add to `wp-config.php`

Add these lines to your WordPress `wp-config.php` file (before "That's all, stop editing!"):

```php
// dbRosetta API Configuration
define('DBROSETTA_API_URL', 'https://dbrosetta-api-staging.azurewebsites.net/api/v1');
define('DBROSETTA_API_TOKEN', '[your-jwt-access-token-here]');
```

### Step 2: Install the Plugin

1. Copy the `wordpress-plugin/dbrosetta/` directory to your WordPress plugins folder:
   ```
   wp-content/plugins/dbrosetta/
   ```

2. Go to **WordPress Admin → Plugins** and activate **"dbRosetta Search"**

### Step 3: Add Shortcode to a Page

Create a new page or post and add the shortcode:
```
[dbrosetta_search]
```

---

## ⚠️ Important: Database is Empty

The API is working but **the database has no data yet**. You need to:

1. **Run database migrations** to create the schema
2. **Import sample data** to test the WordPress plugin

### Option 1: Import via Schema File

```bash
# Connect to PostgreSQL
psql "postgresql://postgres:[YOUR_PASSWORD]@rosettacluster.postgres.database.azure.com:5432/dbrosetta?sslmode=require"

# Run the schema initialization
\i schema/init-dbrosetta-schema.sql
```

### Option 2: Use Prisma Migrations

```bash
cd services/dbrosetta-api
npx prisma migrate deploy
```

---

## 🔧 Azure Resources

### Database Credentials
- **Host**: `rosettacluster.postgres.database.azure.com`
- **Port**: `5432`
- **Database**: `dbrosetta`
- **Username**: `postgres`
- **Password**: `[Stored in Azure App Service environment variables]`
- **SSL Mode**: `require`

### App Service Settings
- **Resource Group**: `dbRosetta`
- **Staging App**: `dbrosetta-api-staging`
- **Production App**: `dbrosetta-api` (not yet configured)
- **Container Registry**: `dbrosettaacr.azurecr.io`
- **Image**: `dbrosettaacr.azurecr.io/dbrosetta-api:latest`

### Environment Variables (Already Set)
- `DATABASE_URL`: Connection string with SSL
- `NODE_ENV`: production
- `JWT_SECRET`: secret-key-min-32-chars-change-me-prod
- `JWT_ISSUER`: https://dbrosetta-api-staging.azurewebsites.net
- `JWT_AUDIENCE`: https://dbrosetta-api-staging.azurewebsites.net
- `JWKS_URI`: https://dbrosetta-api-staging.azurewebsites.net/.well-known/jwks.json
- `CORS_ORIGIN`: *
- `PORT`: 3000

---

## 🧪 Testing the API

### Health Check
```bash
curl https://dbrosetta-api-staging.azurewebsites.net/health
```

### Login
```bash
curl -X POST https://dbrosetta-api-staging.azurewebsites.net/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-user@example.com","password":"YOUR_PASSWORD"}'
```

### Query Terms (with token)
```bash
curl -X POST https://dbrosetta-api-staging.azurewebsites.net/api/v1/query \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"entity":"terms","filters":{"canonicalTerm":"SELECT"},"limit":5}'
```

---

## 📦 Next Steps

1. **Populate the database** with SQL terms and translations
2. **Test the WordPress plugin** with real data
3. **Configure production app** (dbrosetta-api) with same settings
4. **Update JWT secrets** in production with more secure values
5. **Set up proper CORS** (replace `*` with specific domains)

---

## 🎉 What's Working

- ✅ Docker image built and pushed to Azure Container Registry
- ✅ App Service configured with correct container image
- ✅ Environment variables configured correctly
- ✅ PostgreSQL firewall allows Azure services
- ✅ Database connection successful
- ✅ API health endpoint responding
- ✅ User registration working
- ✅ JWT authentication working
- ✅ Query endpoint functional (returns empty results - needs data)
- ✅ WordPress plugin complete and ready to use

---

## 📚 Documentation

- **Plugin README**: `wordpress-plugin/dbrosetta/README.md`
- **Quick Install**: `wordpress-plugin/dbrosetta/INSTALL.md`
- **API Documentation**: Visit https://dbrosetta-api-staging.azurewebsites.net/docs (Swagger UI)

---

*Last Updated: December 11, 2025*
