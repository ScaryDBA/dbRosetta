<?php
/**
 * Template for the dbRosetta search form.
 *
 * This template is loaded by the [dbrosetta_search] shortcode.
 *
 * @package DBRosetta
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}
?>

<div class="dbrosetta-search-container">
    <form method="post" action="" class="dbrosetta-search-form">
        <?php wp_nonce_field('dbrosetta_search_action', 'dbrosetta_search_nonce'); ?>
        
        <div class="dbrosetta-form-header">
            <h3><?php esc_html_e('Search Database Terms', 'dbrosetta'); ?></h3>
            <p class="dbrosetta-form-description">
                <?php esc_html_e('Search for SQL terms and view their translations across different database platforms.', 'dbrosetta'); ?>
            </p>
        </div>

        <div class="dbrosetta-form-row">
            <label for="dbrosetta-search-term" class="dbrosetta-label">
                <?php esc_html_e('Search Term', 'dbrosetta'); ?>
                <span class="dbrosetta-required">*</span>
            </label>
            <input 
                type="text" 
                id="dbrosetta-search-term"
                name="search_term" 
                class="dbrosetta-input" 
                placeholder="<?php esc_attr_e('e.g., SELECT, INSERT, JOIN', 'dbrosetta'); ?>"
                value="<?php echo esc_attr($search_term); ?>"
                required
            />
            <span class="dbrosetta-help-text">
                <?php esc_html_e('Enter a SQL keyword or term to search for', 'dbrosetta'); ?>
            </span>
        </div>

        <div class="dbrosetta-form-row">
            <label for="dbrosetta-database" class="dbrosetta-label">
                <?php esc_html_e('Filter by Database (Optional)', 'dbrosetta'); ?>
            </label>
            <select 
                id="dbrosetta-database"
                name="database" 
                class="dbrosetta-select"
            >
                <option value="">
                    <?php esc_html_e('All Databases', 'dbrosetta'); ?>
                </option>
                <option value="postgresql" <?php selected($selected_database, 'postgresql'); ?>>
                    <?php esc_html_e('PostgreSQL', 'dbrosetta'); ?>
                </option>
                <option value="mysql" <?php selected($selected_database, 'mysql'); ?>>
                    <?php esc_html_e('MySQL', 'dbrosetta'); ?>
                </option>
                <option value="oracle" <?php selected($selected_database, 'oracle'); ?>>
                    <?php esc_html_e('Oracle', 'dbrosetta'); ?>
                </option>
                <option value="sqlserver" <?php selected($selected_database, 'sqlserver'); ?>>
                    <?php esc_html_e('SQL Server', 'dbrosetta'); ?>
                </option>
            </select>
            <span class="dbrosetta-help-text">
                <?php esc_html_e('Optionally filter results by a specific database platform', 'dbrosetta'); ?>
            </span>
        </div>

        <div class="dbrosetta-form-actions">
            <button 
                type="submit" 
                name="dbrosetta_search_submit" 
                class="dbrosetta-button dbrosetta-button-primary"
            >
                <?php esc_html_e('Search', 'dbrosetta'); ?>
            </button>
            
            <?php if (!empty($search_term)): ?>
                <a 
                    href="<?php echo esc_url(remove_query_arg(array('search_term', 'database'))); ?>" 
                    class="dbrosetta-button dbrosetta-button-secondary"
                >
                    <?php esc_html_e('Clear', 'dbrosetta'); ?>
                </a>
            <?php endif; ?>
        </div>
    </form>
</div>
