<?php
/**
 * DBRosetta API Client
 *
 * Handles secure communication with the dbRosetta API.
 *
 * @package DBRosetta
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

/**
 * Class DBRosetta_Client
 *
 * Provides methods to interact with the dbRosetta API securely.
 */
class DBRosetta_Client {
    
    /**
     * API endpoint URL.
     *
     * @var string
     */
    private $api_url;

    /**
     * API authentication token.
     *
     * @var string
     */
    private $api_token;

    /**
     * Request timeout in seconds.
     *
     * @var int
     */
    private $timeout = 30;

    /**
     * Constructor.
     *
     * @param string $api_url The API endpoint URL.
     * @param string $api_token The API authentication token.
     */
    public function __construct($api_url, $api_token) {
        $this->api_url = rtrim($api_url, '/');
        $this->api_token = $api_token;
    }

    /**
     * Search for terms in the dbRosetta database.
     *
     * @param string $search_term The term to search for.
     * @param string $database Optional database filter (dialect).
     * @return array|WP_Error Results array or WP_Error on failure.
     */
    public function search_terms($search_term, $database = '') {
        // Validate inputs
        if (empty($search_term)) {
            return new WP_Error('invalid_input', __('Search term cannot be empty.', 'dbrosetta'));
        }

        // Sanitize inputs
        $search_term = sanitize_text_field($search_term);
        $database = sanitize_text_field($database);

        // Build query filters as object (key-value pairs)
        // The API expects exact matches or uses Prisma's filtering
        $filters = array(
            'canonicalTerm' => $search_term
        );

        // Build request body for the /query endpoint
        $body = array(
            'entity' => 'terms',
            'filters' => $filters,
            'limit' => 50,
            'offset' => 0
        );

        // Make the API request
        return $this->make_request('POST', '/query', $body);
    }

    /**
     * Get available dialects (databases).
     *
     * @return array|WP_Error Results array or WP_Error on failure.
     */
    public function get_dialects() {
        $body = array(
            'entity' => 'dialects',
            'filters' => array(
                array(
                    'field' => 'is_active',
                    'operator' => '=',
                    'value' => true
                )
            ),
            'select' => array('dialect_id', 'name', 'description'),
            'limit' => 100,
            'page' => 1
        );

        return $this->make_request('POST', '/query', $body);
    }

    /**
     * Get translations for a specific term.
     *
     * @param int $term_id The term ID.
     * @return array|WP_Error Results array or WP_Error on failure.
     */
    public function get_translations($term_id) {
        // Validate input
        $term_id = absint($term_id);
        if ($term_id <= 0) {
            return new WP_Error('invalid_input', __('Invalid term ID.', 'dbrosetta'));
        }

        $body = array(
            'entity' => 'translations',
            'filters' => array(
                array(
                    'field' => 'term_id',
                    'operator' => '=',
                    'value' => $term_id
                )
            ),
            'select' => array('translation_id', 'term_id', 'dialect_id', 'translation', 'description', 'confidence_score'),
            'limit' => 100,
            'page' => 1
        );

        return $this->make_request('POST', '/query', $body);
    }

    /**
     * Get a term with its equivalents.
     *
     * @param int $term_id The term ID.
     * @return array|WP_Error Term data with equivalents or WP_Error on failure.
     */
    public function get_term_with_equivalents($term_id) {
        // Validate input
        $term_id = absint($term_id);
        if ($term_id <= 0) {
            return new WP_Error('invalid_input', __('Invalid term ID.', 'dbrosetta'));
        }

        // Make the API request to get term details including equivalents
        return $this->make_request('GET', '/terms/' . $term_id);
    }

    /**
     * Make a request to the API.
     *
     * @param string $method HTTP method (GET, POST, etc.).
     * @param string $endpoint API endpoint path.
     * @param array $body Request body (for POST/PUT requests).
     * @return array|WP_Error Response data or WP_Error on failure.
     */
    private function make_request($method, $endpoint, $body = array()) {
        // Build full URL
        $url = $this->api_url . $endpoint;

        // Validate URL uses HTTPS
        if (parse_url($url, PHP_URL_SCHEME) !== 'https') {
            return new WP_Error(
                'insecure_connection',
                __('API connection must use HTTPS.', 'dbrosetta')
            );
        }

        // Prepare request arguments
        $args = array(
            'method' => strtoupper($method),
            'timeout' => $this->timeout,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->api_token,
                'Accept' => 'application/json'
            ),
            'sslverify' => true, // Always verify SSL certificates
        );

        // Add body for POST/PUT requests
        if (!empty($body) && in_array($method, array('POST', 'PUT', 'PATCH'))) {
            $args['body'] = wp_json_encode($body);
        }

        // Make the request
        $response = wp_remote_request($url, $args);

        // Check for errors
        if (is_wp_error($response)) {
            return new WP_Error(
                'api_request_failed',
                sprintf(
                    /* translators: %s: error message */
                    __('API request failed: %s', 'dbrosetta'),
                    $response->get_error_message()
                )
            );
        }

        // Get response code
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);

        // Parse JSON response
        $data = json_decode($response_body, true);

        // Handle non-200 responses
        if ($response_code !== 200) {
            $error_message = isset($data['message']) 
                ? $data['message'] 
                : sprintf(
                    /* translators: %d: HTTP status code */
                    __('API returned error code: %d', 'dbrosetta'),
                    $response_code
                );

            return new WP_Error('api_error', $error_message);
        }

        // Check for JSON decode errors
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error(
                'json_decode_error',
                __('Failed to parse API response.', 'dbrosetta')
            );
        }

        return $data;
    }

    /**
     * Set request timeout.
     *
     * @param int $seconds Timeout in seconds.
     */
    public function set_timeout($seconds) {
        $this->timeout = absint($seconds);
    }
}
