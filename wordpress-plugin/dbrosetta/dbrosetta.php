<?php
/**
 * Plugin Name: dbRosetta Search
 * Plugin URI: https://github.com/ScaryDBA/dbRosetta
 * Description: Search and display database terms and translations from the dbRosetta API.
 * Version: 1.0.0
 * Author: dbRosetta Team
 * Author URI: https://github.com/ScaryDBA
 * License: MIT
 * Text Domain: dbrosetta
 * Requires at least: 5.8
 * Requires PHP: 7.4
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

/**
 * Plugin version.
 */
define('DBROSETTA_VERSION', '1.0.0');

/**
 * Plugin directory path.
 */
define('DBROSETTA_PLUGIN_DIR', plugin_dir_path(__FILE__));

/**
 * Plugin directory URL.
 */
define('DBROSETTA_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Load the API client class.
 */
require_once DBROSETTA_PLUGIN_DIR . 'includes/class-dbrosetta-client.php';

/**
 * Enqueue plugin styles.
 */
function dbrosetta_enqueue_styles() {
    wp_enqueue_style(
        'dbrosetta-styles',
        DBROSETTA_PLUGIN_URL . 'assets/dbrosetta.css',
        array(),
        DBROSETTA_VERSION
    );
}
add_action('wp_enqueue_scripts', 'dbrosetta_enqueue_styles');

/**
 * Register the search shortcode.
 *
 * Usage: [dbrosetta_search]
 */
function dbrosetta_search_shortcode($atts) {
    // Parse shortcode attributes
    $atts = shortcode_atts(array(
        'database' => '', // Optional default database
    ), $atts, 'dbrosetta_search');

    // Start output buffering
    ob_start();

    // Check if API is configured
    if (!defined('DBROSETTA_API_URL') || !defined('DBROSETTA_API_TOKEN')) {
        echo '<div class="dbrosetta-error">';
        echo '<p>' . esc_html__('dbRosetta API is not configured. Please add DBROSETTA_API_URL and DBROSETTA_API_TOKEN to wp-config.php', 'dbrosetta') . '</p>';
        echo '</div>';
        return ob_get_clean();
    }

    // Initialize variables
    $search_term = '';
    $selected_database = sanitize_text_field($atts['database']);
    $results = null;
    $error = null;

    // Handle form submission
    if (isset($_POST['dbrosetta_search_submit']) && 
        isset($_POST['dbrosetta_search_nonce']) &&
        wp_verify_nonce($_POST['dbrosetta_search_nonce'], 'dbrosetta_search_action')) {
        
        // Sanitize inputs
        $search_term = isset($_POST['search_term']) ? sanitize_text_field($_POST['search_term']) : '';
        $selected_database = isset($_POST['database']) ? sanitize_text_field($_POST['database']) : '';

        // Validate inputs
        if (empty($search_term)) {
            $error = __('Please enter a search term.', 'dbrosetta');
        } else {
            // Initialize API client
            $client = new DBRosetta_Client(
                DBROSETTA_API_URL,
                DBROSETTA_API_TOKEN
            );

            // Perform search
            $response = $client->search_terms($search_term, $selected_database);

            if (is_wp_error($response)) {
                $error = $response->get_error_message();
            } else {
                $results = $response;
            }
        }
    }

    // Include the search form template
    include DBROSETTA_PLUGIN_DIR . 'templates/search-form.php';

    // Include the results template if we have results
    if ($results !== null) {
        include DBROSETTA_PLUGIN_DIR . 'templates/search-results.php';
    }

    // Include error template if we have an error
    if ($error !== null) {
        echo '<div class="dbrosetta-error">';
        echo '<p>' . esc_html($error) . '</p>';
        echo '</div>';
    }

    // Return the buffered content
    return ob_get_clean();
}
add_shortcode('dbrosetta_search', 'dbrosetta_search_shortcode');

/**
 * Activation hook.
 */
function dbrosetta_activate() {
    // Check PHP version
    if (version_compare(PHP_VERSION, '7.4', '<')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(__('dbRosetta requires PHP 7.4 or higher.', 'dbrosetta'));
    }

    // Check WordPress version
    global $wp_version;
    if (version_compare($wp_version, '5.8', '<')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die(__('dbRosetta requires WordPress 5.8 or higher.', 'dbrosetta'));
    }
}
register_activation_hook(__FILE__, 'dbrosetta_activate');
