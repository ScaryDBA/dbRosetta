# dbRosetta WordPress Plugin - Quick Start Guide

## Installation Steps

### 1. Upload Plugin

Copy the `dbrosetta` folder to:
```
wp-content/plugins/dbrosetta/
```

### 2. Configure API Access

Edit `wp-config.php` and add (before "That's all, stop editing!"):

```php
// dbRosetta API Configuration
define('DBROSETTA_API_URL', 'https://dbrosetta-api.azurewebsites.net/api/v1');
define('DBROSETTA_API_TOKEN', 'your-jwt-token-here');
```

### 3. Activate Plugin

1. Login to WordPress Admin
2. Go to **Plugins → Installed Plugins**
3. Activate "dbRosetta Search"

### 4. Add to Page

Create or edit a page and add the shortcode:
```
[dbrosetta_search]
```

## Getting Your API Token

### Option 1: Using the API /auth/login endpoint

```bash
curl -X POST https://dbrosetta-api.azurewebsites.net/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

The response will contain an `accessToken` - use this as your `DBROSETTA_API_TOKEN`.

### Option 2: WordPress JWT (if configured)

If your WordPress site is configured with the WordPress JWT integration, the plugin can automatically handle authentication.

## Security Checklist

- ✅ API URL uses HTTPS (not HTTP)
- ✅ API token is stored in `wp-config.php` (not in plugin files)
- ✅ `wp-config.php` is not committed to version control
- ✅ WordPress and PHP versions meet minimum requirements

## Testing

After activation, test the plugin:

1. Visit the page with the `[dbrosetta_search]` shortcode
2. Enter a search term like "SELECT"
3. Click "Search"
4. Verify results are displayed

## Troubleshooting

**"API is not configured" error:**
- Check that constants are defined in `wp-config.php`
- Verify no typos in constant names

**"API connection must use HTTPS" error:**
- Update API URL to use `https://` instead of `http://`

**No results:**
- Verify API token is valid
- Test API endpoint directly with curl or Postman
- Check search term exists in database

## Next Steps

For full documentation, see `README.md` in the plugin folder.

For API documentation and setup, see the main dbRosetta project repository.
