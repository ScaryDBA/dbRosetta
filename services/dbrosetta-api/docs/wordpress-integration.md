# WordPress Integration with dbRosetta API

This guide explains how to integrate your WordPress site with the dbRosetta API using JWT authentication.

## Overview

The dbRosetta API supports authentication via WordPress JWT tokens, allowing your WordPress users to seamlessly access the API without creating separate accounts.

## Prerequisites

1. **WordPress JWT Plugin**: Install a WordPress JWT authentication plugin. We recommend:
   - [JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/)
   - [Simple JWT Authentication](https://wordpress.org/plugins/simple-jwt-authentication/)

2. **Shared Secret**: Configure the same JWT secret in both WordPress and the dbRosetta API.

## Setup Instructions

### 1. Configure WordPress

Add this to your WordPress `wp-config.php`:

```php
define('JWT_AUTH_SECRET_KEY', 'your-secret-key-min-32-chars-please-change-in-production');
define('JWT_AUTH_CORS_ENABLE', true);
```

### 2. Configure dbRosetta API

Add the same secret to your `.env` file:

```env
WORDPRESS_JWT_SECRET=your-secret-key-min-32-chars-please-change-in-production
```

**Important**: Use a strong, random secret. Generate one with:
```bash
openssl rand -base64 32
```

### 3. Add WordPress to CORS Origins

Update your `.env` to allow requests from your WordPress site:

```env
CORS_ORIGIN=http://localhost:3000,https://your-wordpress-site.com
```

## Authentication Flow

1. User logs into WordPress
2. WordPress plugin issues a JWT token
3. WordPress sends the JWT token to dbRosetta API's `/api/v1/auth/wordpress-login` endpoint
4. dbRosetta API validates the WordPress JWT and returns its own API tokens
5. Client uses dbRosetta API tokens for subsequent requests

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  WordPress  │─────>│   Browser   │─────>│  dbRosetta   │
│    (Login)  │      │  (GET JWT)  │      │     API      │
└─────────────┘      └─────────────┘      └──────────────┘
                            │                      │
                            │  POST /wordpress-    │
                            │  login with WP JWT   │
                            │─────────────────────>│
                            │                      │
                            │  Return API tokens   │
                            │<─────────────────────│
                            │                      │
                            │  Use API tokens      │
                            │  for API requests    │
                            │─────────────────────>│
```

## API Endpoint

### POST /api/v1/auth/wordpress-login

Authenticate using a WordPress JWT token and receive dbRosetta API tokens.

**Request Body:**
```json
{
  "wordpressToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "autoRegister": true
}
```

**Parameters:**
- `wordpressToken` (required): JWT token issued by WordPress
- `autoRegister` (optional, default: true): Automatically create a user account if the email doesn't exist

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "user",
    "role": "user",
    "isNew": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired WordPress token
- `404 Not Found`: User not found (when autoRegister=false)

## Example WordPress Plugin Code

See the complete example in `examples/wordpress-plugin/` directory.

### Basic Usage

```php
<?php
// Get WordPress JWT token
$wp_jwt = apply_filters('jwt_auth_token', wp_get_current_user());

// Exchange for dbRosetta API tokens
$response = wp_remote_post('https://api.dbrosetta.com/api/v1/auth/wordpress-login', [
    'headers' => ['Content-Type' => 'application/json'],
    'body' => json_encode([
        'wordpressToken' => $wp_jwt,
        'autoRegister' => true
    ])
]);

$data = json_decode(wp_remote_retrieve_body($response), true);
$api_token = $data['token'];

// Use API token to make requests
$dialects = wp_remote_get('https://api.dbrosetta.com/api/v1/dialects', [
    'headers' => [
        'Authorization' => 'Bearer ' . $api_token
    ]
]);
```

## Security Considerations

1. **Secret Management**: 
   - Never commit secrets to version control
   - Use environment variables or WordPress constants
   - Rotate secrets periodically

2. **HTTPS Only**: 
   - Always use HTTPS in production
   - JWT tokens should never be transmitted over HTTP

3. **Token Storage**:
   - Store API tokens securely in the browser (httpOnly cookies or sessionStorage)
   - Never expose tokens in URLs or logs

4. **Auto-Registration**:
   - Consider setting `autoRegister: false` if you want to control user access
   - Pre-create user accounts for approved users

5. **Role Mapping**:
   - WordPress users are created with 'user' role by default
   - Manually upgrade users to 'admin' role in dbRosetta for administrative access

## Troubleshooting

### "WORDPRESS_JWT_SECRET is not configured"
- Ensure the environment variable is set in your `.env` file
- Restart the API server after changing environment variables

### "Invalid WordPress token"
- Verify both systems use the same secret
- Check token expiration time
- Ensure WordPress JWT plugin is properly configured

### "User not found"
- Set `autoRegister: true` to automatically create users
- Or pre-create user accounts in dbRosetta

### CORS Issues
- Add your WordPress site to `CORS_ORIGIN` in `.env`
- Ensure `JWT_AUTH_CORS_ENABLE` is true in WordPress

## Testing

Use the WordPress JWT decoder to inspect tokens:
```bash
# Decode JWT (without verification)
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d | jq
```

Test with curl:
```bash
curl -X POST https://api.dbrosetta.com/api/v1/auth/wordpress-login \
  -H "Content-Type: application/json" \
  -d '{
    "wordpressToken": "YOUR_WORDPRESS_JWT_TOKEN",
    "autoRegister": true
  }'
```

## Support

For issues or questions:
- API Documentation: https://api.dbrosetta.com/docs
- GitHub Issues: https://github.com/ScaryDBA/dbRosetta/issues
