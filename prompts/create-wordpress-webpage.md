Project: dbRosetta WordPress Plugin — Part 6 (Read/Search Integration)

Context
You are an expert WordPress plugin developer. Implement a minimal, secure plugin that allows a WordPress site to query the dbRosetta API (hosted in Azure) and display results. The plugin must:
- Provide a search form where users can enter a term and select a database.
- Send the query securely to the dbRosetta API (using HTTPS and JWT/OAuth tokens).
- Display multiple terms and explanations returned by the API.
- Prevent SQL injection and insecure input handling by validating and sanitizing all user input before sending to the API.
- Be simple: no admin UI or data entry at this stage.

High-level Goals
1. Scaffold a WordPress plugin folder with the necessary files.
2. Implement a shortcode `[dbrosetta_search]` that renders a search form and results.
3. Securely call the Azure-hosted API using WordPress HTTP functions (`wp_remote_get` or `wp_remote_post`).
4. Validate and sanitize all inputs before sending to the API.
5. Provide clear manual steps for installation and activation in WordPress.

Deliverables
- Plugin folder `wp-content/plugins/dbrosetta/`
  - `dbrosetta.php` (main plugin file with headers and shortcode registration)
  - `includes/class-dbrosetta-client.php` (API client class)
  - `templates/search-form.php` (HTML form)
  - `templates/search-results.php` (results rendering)
- Secure API client that:
  - Reads endpoint and token from plugin constants or environment variables.
  - Uses `wp_remote_post` with sanitized payload.
  - Handles errors gracefully.
- Shortcode `[dbrosetta_search]` that:
  - Displays the search form.
  - On submission, calls the API client.
  - Renders results using the template.

Security Requirements
- Sanitize all user input with `sanitize_text_field` and `esc_html`.
- Never construct raw SQL; all queries go through the API.
- Use HTTPS for API calls.
- Store API token securely (in `wp-config.php` or environment variable, not in plugin code).
- Escape all output before rendering.

Manual Steps (outside VS Code)
1. Copy the generated plugin folder into `wp-content/plugins/` of your WordPress installation.
2. In `wp-config.php`, define constants for API endpoint and token:
   ```php
   define('DBROSETTA_API_URL', 'https://your-api.azurewebsites.net/v1/query');
   define('DBROSETTA_API_TOKEN', 'your-secure-jwt-token');
