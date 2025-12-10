# dbRosetta WordPress Plugin Example

This is an example WordPress plugin that demonstrates how to integrate with the dbRosetta API using JWT authentication.

## Features

- ✅ Automatic authentication with dbRosetta API when users log into WordPress
- ✅ Seamless JWT token exchange (WordPress JWT → dbRosetta API tokens)
- ✅ Token caching and refresh handling
- ✅ AJAX endpoints for accessing API from WordPress admin
- ✅ Shortcode `[dbrosetta_dialects]` to display database dialects on any page
- ✅ Admin settings page with connection testing

## Prerequisites

### WordPress JWT Authentication Plugin

Install one of these WordPress JWT plugins:

1. **JWT Authentication for WP REST API** (Recommended)
   - Plugin URL: https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/
   - Install via WordPress admin or: `wp plugin install jwt-authentication-for-wp-rest-api --activate`

2. **Simple JWT Authentication**
   - Plugin URL: https://wordpress.org/plugins/simple-jwt-authentication/

### Composer Dependencies (Optional)

For JWT token generation, optionally install:

```bash
composer require firebase/php-jwt
```

## Installation

### 1. Add JWT Secret to wp-config.php

Add this line to your `wp-config.php` file (before "That's all, stop editing!"):

```php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key-min-32-chars-please-change-in-production');
define('JWT_AUTH_CORS_ENABLE', true);
```

**Generate a secure secret:**
```bash
openssl rand -base64 32
```

### 2. Configure dbRosetta API

In your dbRosetta API `.env` file, set the same secret:

```env
WORDPRESS_JWT_SECRET=your-secret-key-min-32-chars-please-change-in-production
CORS_ORIGIN=http://localhost:3000,https://your-wordpress-site.com
```

### 3. Install Plugin

Copy `dbrosetta-api-integration.php` to your WordPress plugins directory:

```bash
cp dbrosetta-api-integration.php /path/to/wordpress/wp-content/plugins/
```

Or create a plugin folder:

```bash
mkdir -p /path/to/wordpress/wp-content/plugins/dbrosetta-api-integration
cp dbrosetta-api-integration.php /path/to/wordpress/wp-content/plugins/dbrosetta-api-integration/
```

### 4. Activate Plugin

In WordPress admin:
1. Go to **Plugins** → **Installed Plugins**
2. Find "dbRosetta API Integration"
3. Click **Activate**

Or via WP-CLI:
```bash
wp plugin activate dbrosetta-api-integration
```

## Configuration

### Settings Page

Navigate to **Settings** → **dbRosetta API** in WordPress admin.

**Available Options:**
- **API Base URL**: The base URL of your dbRosetta API (default: `https://api.dbrosetta.com`)
- **Auto-Login**: Automatically authenticate with API when users log in

### Test Connection

Use the "Test API Connection" button on the settings page to verify your configuration.

## Usage

### Automatic Authentication

When enabled, users are automatically authenticated with the dbRosetta API upon WordPress login. API tokens are stored securely in user meta.

### Shortcodes

#### Display Dialects

Show a list of database dialects on any page or post:

```
[dbrosetta_dialects]
```

### Programmatic Access

Access the API from your theme or plugin:

```php
// Get API token
$user_id = get_current_user_id();
$token = get_user_meta($user_id, '_dbrosetta_api_token', true);

// Make API request
$response = wp_remote_get('https://api.dbrosetta.com/api/v1/dialects', [
    'headers' => [
        'Authorization' => 'Bearer ' . $token
    ]
]);

$dialects = json_decode(wp_remote_retrieve_body($response), true);
```

### AJAX Endpoints

The plugin registers AJAX endpoints for admin users:

#### Get Dialects
```javascript
jQuery.post(ajaxurl, {
    action: 'dbrosetta_get_dialects'
}, function(response) {
    if (response.success) {
        console.log('Dialects:', response.data);
    }
});
```

#### Translate Term
```javascript
jQuery.post(ajaxurl, {
    action: 'dbrosetta_translate',
    term_id: 123,
    dialect_id: 456
}, function(response) {
    if (response.success) {
        console.log('Translation:', response.data);
    }
});
```

## Architecture

### Authentication Flow

```
1. User logs into WordPress
   ↓
2. Plugin generates WordPress JWT token
   ↓
3. Plugin sends WordPress JWT to dbRosetta API /wordpress-login endpoint
   ↓
4. API validates WordPress JWT and returns API tokens
   ↓
5. Plugin caches API tokens in WordPress user meta
   ↓
6. Subsequent API requests use cached tokens
```

### Token Storage

Tokens are stored securely in WordPress user meta:
- `_dbrosetta_api_token`: Access token (short-lived)
- `_dbrosetta_refresh_token`: Refresh token (long-lived)

## Customization

### Custom API Requests

Extend the plugin to make custom API requests:

```php
class My_DBRosetta_Extension {
    
    private function get_terms() {
        $token = get_user_meta(get_current_user_id(), '_dbrosetta_api_token', true);
        
        $response = wp_remote_get('https://api.dbrosetta.com/api/v1/terms', [
            'headers' => ['Authorization' => 'Bearer ' . $token]
        ]);
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
}
```

### Custom Shortcodes

Add your own shortcodes:

```php
add_shortcode('dbrosetta_terms', function($atts) {
    // Fetch and display terms
    $terms = /* API call */;
    
    $output = '<ul>';
    foreach ($terms['data'] as $term) {
        $output .= '<li>' . esc_html($term['term']) . '</li>';
    }
    $output .= '</ul>';
    
    return $output;
});
```

## Troubleshooting

### "Unable to authenticate with dbRosetta API"

**Causes:**
- JWT secret mismatch between WordPress and API
- WordPress JWT plugin not installed/configured
- API endpoint unreachable

**Solutions:**
1. Verify `JWT_AUTH_SECRET_KEY` in `wp-config.php` matches `WORDPRESS_JWT_SECRET` in API `.env`
2. Ensure JWT Authentication plugin is active
3. Check API URL in plugin settings
4. Test with "Test Connection" button

### "JWT_AUTH_SECRET_KEY not defined"

Add the constant to `wp-config.php`:
```php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key-here');
```

### "CORS Error"

Add your WordPress site to the API's CORS origins:
```env
CORS_ORIGIN=https://your-wordpress-site.com
```

### Token Expired

Tokens expire after 1 hour. The plugin automatically re-authenticates on next request. To force refresh:

```php
delete_user_meta(get_current_user_id(), '_dbrosetta_api_token');
delete_user_meta(get_current_user_id(), '_dbrosetta_refresh_token');
```

## Security

- **HTTPS Only**: Always use HTTPS in production
- **Secret Management**: Never commit secrets to version control
- **Token Storage**: Tokens stored in user meta (not accessible to non-admin users)
- **Sanitization**: All output is escaped with `esc_html()` and `esc_attr()`

## Development

### Debug Mode

Enable WordPress debug mode in `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

Check logs at `wp-content/debug.log` for API errors.

### Local Development

For local development, update API URL to localhost:

**Settings** → **dbRosetta API** → API Base URL: `http://localhost:3000`

## License

MIT License - See main dbRosetta repository for details.

## Support

- API Documentation: https://api.dbrosetta.com/docs
- GitHub Issues: https://github.com/ScaryDBA/dbRosetta/issues
- WordPress Support: https://wordpress.org/support/
