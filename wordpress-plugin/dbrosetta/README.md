# dbRosetta WordPress Plugin

A secure WordPress plugin that allows users to search and view database terms and translations from the dbRosetta API.

## Features

- 🔍 **Search Form** - Simple interface to search for SQL terms and keywords
- 🗄️ **Database Filtering** - Filter results by specific database platforms (PostgreSQL, MySQL, Oracle, SQL Server)
- 🔐 **Secure API Integration** - Uses HTTPS and JWT authentication to communicate with the Azure-hosted API
- 🎨 **Responsive Design** - Mobile-friendly interface that works on all devices
- 🛡️ **Security First** - All inputs sanitized, outputs escaped, nonce verification, and no direct database queries
- 📊 **Translation Display** - Shows how terms translate across different database platforms

## Requirements

- WordPress 5.8 or higher
- PHP 7.4 or higher
- Access to the dbRosetta API endpoint
- Valid API authentication token

## Installation

### 1. Download the Plugin

Copy the entire `dbrosetta` folder to your WordPress installation's plugin directory:

```
wp-content/plugins/dbrosetta/
```

### 2. Configure API Credentials

Add the following constants to your `wp-config.php` file (before the "That's all, stop editing!" line):

```php
// dbRosetta API Configuration
define('DBROSETTA_API_URL', 'https://dbrosetta-api.azurewebsites.net/api/v1');
define('DBROSETTA_API_TOKEN', 'your-jwt-token-here');
```

**Important Security Notes:**
- Never commit `wp-config.php` to version control
- Use a secure JWT token from your API
- Ensure your API endpoint uses HTTPS only

### 3. Activate the Plugin

1. Log in to your WordPress admin dashboard
2. Navigate to **Plugins → Installed Plugins**
3. Find "dbRosetta Search" in the list
4. Click **Activate**

### 4. Add the Search Form to a Page

Add the shortcode to any page or post:

```
[dbrosetta_search]
```

**Examples:**

Basic search form:
```
[dbrosetta_search]
```

With default database filter:
```
[dbrosetta_search database="postgresql"]
```

## Usage

### For Site Administrators

1. **Create a new page or edit an existing one**
2. **Add the shortcode** `[dbrosetta_search]` in the content editor
3. **Publish or update** the page
4. Visit the page to see the search form

### For End Users

1. **Enter a search term** - Type a SQL keyword (e.g., SELECT, INSERT, JOIN)
2. **Optionally filter by database** - Choose a specific database platform or leave as "All Databases"
3. **Click Search** - View results with term descriptions and translations
4. **Review translations** - See how the term translates across different database platforms

## Plugin Structure

```
dbrosetta/
├── dbrosetta.php                          # Main plugin file
├── includes/
│   └── class-dbrosetta-client.php         # API client class
├── templates/
│   ├── search-form.php                    # Search form HTML
│   └── search-results.php                 # Results display HTML
├── assets/
│   └── dbrosetta.css                      # Plugin styles
└── README.md                              # This file
```

## Security Features

### Input Validation
- All user inputs are sanitized using `sanitize_text_field()`
- Form submissions require valid nonce verification
- Empty search terms are rejected with user-friendly error messages

### Output Escaping
- All displayed content is escaped using `esc_html()`, `esc_attr()`, `esc_url()`
- Code snippets are safely displayed in `<code>` blocks
- HTML injection is prevented throughout

### API Communication
- Only HTTPS connections are allowed (HTTP connections are rejected)
- SSL certificates are verified for all API requests
- Authentication tokens are stored in `wp-config.php`, never in plugin code
- Timeout limits prevent hanging requests

### WordPress Best Practices
- Uses WordPress HTTP API (`wp_remote_request()`) instead of cURL
- Implements proper nonce verification for form submissions
- Follows WordPress coding standards
- Escapes all translatable strings

## Customization

### Styling

The plugin includes a stylesheet at `assets/dbrosetta.css`. You can:

1. **Override in your theme** - Add custom CSS to your theme's stylesheet
2. **Modify the plugin CSS** - Edit `assets/dbrosetta.css` directly (changes will be lost on updates)
3. **Use custom classes** - All elements have unique classes for targeting

### Template Modification

Templates are located in the `templates/` directory:

- `search-form.php` - The search form interface
- `search-results.php` - The results display

**Note:** Direct modifications will be overwritten on plugin updates. Consider using hooks or creating a child plugin for permanent changes.

## API Integration

### Endpoints Used

The plugin communicates with the following API endpoints:

1. **POST /api/v1/query** - Search for terms and get translations
   - Used for term searches
   - Used for fetching translations

### Request Format

Example search request:
```json
{
  "entity": "terms",
  "filters": [
    {
      "field": "standard_term",
      "operator": "like",
      "value": "SELECT"
    }
  ],
  "select": ["term_id", "standard_term", "category", "description", "is_active"],
  "limit": 50,
  "page": 1
}
```

### Authentication

All requests include:
```
Authorization: Bearer {your-jwt-token}
Content-Type: application/json
```

## Troubleshooting

### "API is not configured" Error

**Cause:** Missing API configuration in `wp-config.php`

**Solution:** Add the required constants:
```php
define('DBROSETTA_API_URL', 'https://your-api-url.com/api/v1');
define('DBROSETTA_API_TOKEN', 'your-token');
```

### "API connection must use HTTPS" Error

**Cause:** API URL uses HTTP instead of HTTPS

**Solution:** Update your API URL to use HTTPS:
```php
define('DBROSETTA_API_URL', 'https://your-api-url.com/api/v1');
```

### No Results Returned

**Possible causes:**
- Invalid API token (check token in `wp-config.php`)
- API endpoint is down or unreachable
- Search term doesn't exist in database
- Network/firewall blocking API requests

**Debugging steps:**
1. Verify API URL is correct
2. Test API token directly with curl or Postman
3. Check WordPress debug logs
4. Try a different search term (e.g., "SELECT")

### Form Styling Issues

**Cause:** Theme CSS conflicts

**Solution:** Add custom CSS to increase specificity:
```css
.dbrosetta-search-form .dbrosetta-input {
    /* Your custom styles */
}
```

## Development

### Enabling Debug Mode

Add to `wp-config.php`:
```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Check logs at: `wp-content/debug.log`

### Testing the API Client

You can test the API client directly in WordPress:

```php
$client = new DBRosetta_Client(
    'https://your-api.azurewebsites.net/api/v1',
    'your-token'
);

$results = $client->search_terms('SELECT');
if (is_wp_error($results)) {
    echo $results->get_error_message();
} else {
    var_dump($results);
}
```

## Support

For issues or questions:

- **GitHub Issues:** https://github.com/ScaryDBA/dbRosetta/issues
- **Documentation:** See the main dbRosetta project README
- **API Documentation:** Check the API Swagger/OpenAPI documentation

## License

MIT License - See LICENSE file in the main project repository.

## Changelog

### Version 1.0.0 (2025-12-11)
- Initial release
- Basic search functionality
- Term and translation display
- Secure API integration
- Responsive design

## Credits

Developed as part of the dbRosetta project - A database term translation and reference tool.
