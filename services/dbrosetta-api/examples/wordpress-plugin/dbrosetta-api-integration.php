<?php
/**
 * Plugin Name: dbRosetta API Integration
 * Plugin URI: https://github.com/ScaryDBA/dbRosetta
 * Description: Integrates WordPress with the dbRosetta database translation API using JWT authentication
 * Version: 1.0.0
 * Author: dbRosetta
 * Author URI: https://github.com/ScaryDBA
 * License: MIT
 * Requires PHP: 7.4
 * Requires at least: 5.0
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class DBRosetta_API_Integration {
    
    private $api_base_url;
    private $api_token;
    private $refresh_token;
    
    public function __construct() {
        // Configure API endpoint
        $this->api_base_url = get_option('dbrosetta_api_url', 'https://api.dbrosetta.com');
        
        // Initialize hooks
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('wp_login', [$this, 'on_user_login'], 10, 2);
        
        // Add shortcode for displaying dialects
        add_shortcode('dbrosetta_dialects', [$this, 'dialects_shortcode']);
        
        // AJAX endpoints
        add_action('wp_ajax_dbrosetta_get_dialects', [$this, 'ajax_get_dialects']);
        add_action('wp_ajax_dbrosetta_translate', [$this, 'ajax_translate']);
    }
    
    /**
     * Add admin menu page
     */
    public function add_admin_menu() {
        add_options_page(
            'dbRosetta API Settings',
            'dbRosetta API',
            'manage_options',
            'dbrosetta-api',
            [$this, 'settings_page']
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('dbrosetta_api', 'dbrosetta_api_url');
        register_setting('dbrosetta_api', 'dbrosetta_auto_login');
    }
    
    /**
     * Settings page HTML
     */
    public function settings_page() {
        ?>
        <div class="wrap">
            <h1>dbRosetta API Integration Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields('dbrosetta_api'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">
                            <label for="dbrosetta_api_url">API Base URL</label>
                        </th>
                        <td>
                            <input type="url" 
                                   id="dbrosetta_api_url" 
                                   name="dbrosetta_api_url" 
                                   value="<?php echo esc_attr(get_option('dbrosetta_api_url', 'https://api.dbrosetta.com')); ?>" 
                                   class="regular-text" />
                            <p class="description">Base URL for the dbRosetta API</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">
                            <label for="dbrosetta_auto_login">Auto-Login</label>
                        </th>
                        <td>
                            <input type="checkbox" 
                                   id="dbrosetta_auto_login" 
                                   name="dbrosetta_auto_login" 
                                   value="1" 
                                   <?php checked(get_option('dbrosetta_auto_login', '1'), '1'); ?> />
                            <label for="dbrosetta_auto_login">Automatically authenticate with API on user login</label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
            
            <hr>
            
            <h2>Test Connection</h2>
            <button type="button" class="button" onclick="testDBRosettaConnection()">Test API Connection</button>
            <div id="connection-result"></div>
            
            <script>
            function testDBRosettaConnection() {
                const resultDiv = document.getElementById('connection-result');
                resultDiv.innerHTML = '<p>Testing connection...</p>';
                
                fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: 'action=dbrosetta_get_dialects'
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        resultDiv.innerHTML = '<p style="color:green">✓ Connected! Found ' + 
                            data.data.length + ' dialects.</p>';
                    } else {
                        resultDiv.innerHTML = '<p style="color:red">✗ Error: ' + 
                            data.data.message + '</p>';
                    }
                })
                .catch(err => {
                    resultDiv.innerHTML = '<p style="color:red">✗ Connection failed: ' + 
                        err.message + '</p>';
                });
            }
            </script>
        </div>
        <?php
    }
    
    /**
     * Authenticate user with dbRosetta API using WordPress JWT
     */
    private function authenticate_with_api() {
        // Check if JWT Auth plugin is available
        if (!function_exists('jwt_auth_generate_token')) {
            error_log('dbRosetta: JWT Auth plugin not found');
            return false;
        }
        
        try {
            // Generate WordPress JWT token
            $wp_user = wp_get_current_user();
            $wp_jwt = $this->generate_wordpress_jwt($wp_user);
            
            if (!$wp_jwt) {
                return false;
            }
            
            // Exchange WordPress JWT for API tokens
            $response = wp_remote_post($this->api_base_url . '/api/v1/auth/wordpress-login', [
                'headers' => ['Content-Type' => 'application/json'],
                'body' => json_encode([
                    'wordpressToken' => $wp_jwt,
                    'autoRegister' => true
                ]),
                'timeout' => 15
            ]);
            
            if (is_wp_error($response)) {
                error_log('dbRosetta API Error: ' . $response->get_error_message());
                return false;
            }
            
            $body = json_decode(wp_remote_retrieve_body($response), true);
            
            if (wp_remote_retrieve_response_code($response) === 200) {
                // Store tokens in user meta
                $this->api_token = $body['token'];
                $this->refresh_token = $body['refreshToken'];
                
                update_user_meta($wp_user->ID, '_dbrosetta_api_token', $this->api_token);
                update_user_meta($wp_user->ID, '_dbrosetta_refresh_token', $this->refresh_token);
                
                return true;
            }
            
            error_log('dbRosetta API authentication failed: ' . json_encode($body));
            return false;
            
        } catch (Exception $e) {
            error_log('dbRosetta API exception: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Generate WordPress JWT token
     * This is a simplified version - use the actual JWT Auth plugin in production
     */
    private function generate_wordpress_jwt($user) {
        if (!defined('JWT_AUTH_SECRET_KEY')) {
            error_log('dbRosetta: JWT_AUTH_SECRET_KEY not defined in wp-config.php');
            return false;
        }
        
        $issuedAt = time();
        $expire = $issuedAt + (DAY_IN_SECONDS);
        
        $token = [
            'iss' => get_bloginfo('url'),
            'iat' => $issuedAt,
            'exp' => $expire,
            'data' => [
                'user' => [
                    'id' => $user->ID,
                    'email' => $user->user_email,
                ]
            ]
        ];
        
        // Use JWT library to encode (requires firebase/php-jwt)
        if (class_exists('Firebase\JWT\JWT')) {
            return \Firebase\JWT\JWT::encode($token, JWT_AUTH_SECRET_KEY, 'HS256');
        }
        
        // Fallback: use JWT Auth plugin function
        if (function_exists('jwt_auth_generate_token')) {
            return jwt_auth_generate_token($user);
        }
        
        return false;
    }
    
    /**
     * Handle user login - authenticate with API
     */
    public function on_user_login($user_login, $user) {
        if (get_option('dbrosetta_auto_login', '1') === '1') {
            $this->authenticate_with_api();
        }
    }
    
    /**
     * Get API token (from cache or refresh)
     */
    private function get_api_token() {
        $user_id = get_current_user_id();
        
        if (!$user_id) {
            return false;
        }
        
        // Try to get cached token
        $token = get_user_meta($user_id, '_dbrosetta_api_token', true);
        
        if (!$token) {
            // Authenticate if no token exists
            if ($this->authenticate_with_api()) {
                return $this->api_token;
            }
            return false;
        }
        
        return $token;
    }
    
    /**
     * Make authenticated request to API
     */
    private function api_request($endpoint, $method = 'GET', $body = null) {
        $token = $this->get_api_token();
        
        if (!$token) {
            return new WP_Error('no_token', 'Unable to authenticate with dbRosetta API');
        }
        
        $args = [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ],
            'method' => $method,
            'timeout' => 15
        ];
        
        if ($body) {
            $args['body'] = json_encode($body);
        }
        
        $response = wp_remote_request($this->api_base_url . $endpoint, $args);
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $status = wp_remote_retrieve_response_code($response);
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        if ($status >= 400) {
            return new WP_Error('api_error', $data['message'] ?? 'API request failed', $data);
        }
        
        return $data;
    }
    
    /**
     * AJAX handler: Get dialects
     */
    public function ajax_get_dialects() {
        $dialects = $this->api_request('/api/v1/dialects');
        
        if (is_wp_error($dialects)) {
            wp_send_json_error([
                'message' => $dialects->get_error_message()
            ]);
        }
        
        wp_send_json_success($dialects['data'] ?? []);
    }
    
    /**
     * AJAX handler: Translate term
     */
    public function ajax_translate() {
        $term_id = intval($_POST['term_id'] ?? 0);
        $dialect_id = intval($_POST['dialect_id'] ?? 0);
        
        if (!$term_id || !$dialect_id) {
            wp_send_json_error(['message' => 'Missing parameters']);
        }
        
        $translation = $this->api_request(
            '/api/v1/translations?termId=' . $term_id . '&dialectId=' . $dialect_id
        );
        
        if (is_wp_error($translation)) {
            wp_send_json_error([
                'message' => $translation->get_error_message()
            ]);
        }
        
        wp_send_json_success($translation['data'][0] ?? null);
    }
    
    /**
     * Shortcode: Display dialects
     * Usage: [dbrosetta_dialects]
     */
    public function dialects_shortcode($atts) {
        $dialects = $this->api_request('/api/v1/dialects');
        
        if (is_wp_error($dialects)) {
            return '<p>Unable to load dialects: ' . esc_html($dialects->get_error_message()) . '</p>';
        }
        
        $output = '<div class="dbrosetta-dialects">';
        $output .= '<h3>Database Dialects</h3>';
        $output .= '<ul>';
        
        foreach ($dialects['data'] ?? [] as $dialect) {
            $output .= '<li>';
            $output .= '<strong>' . esc_html($dialect['displayName']) . '</strong> ';
            $output .= '<code>' . esc_html($dialect['name']) . '</code>';
            if (!empty($dialect['version'])) {
                $output .= ' - Version ' . esc_html($dialect['version']);
            }
            $output .= '</li>';
        }
        
        $output .= '</ul>';
        $output .= '</div>';
        
        return $output;
    }
}

// Initialize plugin
new DBRosetta_API_Integration();
