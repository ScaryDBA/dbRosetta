<?php
/**
 * Template for the dbRosetta directional term-lookup form.
 *
 * This template is loaded by the [dbrosetta_search] shortcode.
 *
 * @package DBRosetta
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// $dialects, $term, $source_dialect, $target_dialects, $all_platforms are provided by dbrosetta.php.
$dialects = isset($dialects) ? $dialects : array();
$term = isset($term) ? $term : '';
$source_dialect = isset($source_dialect) ? $source_dialect : '';
$target_dialects = isset($target_dialects) ? $target_dialects : array();
$all_platforms = isset($all_platforms) ? $all_platforms : false;
?>

<div class="dbrosetta-search-container">
    <form method="post" action="" class="dbrosetta-search-form">
        <?php wp_nonce_field('dbrosetta_search_action', 'dbrosetta_search_nonce'); ?>

        <div class="dbrosetta-form-header">
            <h3><?php esc_html_e('Look Up a Database Term', 'dbrosetta'); ?></h3>
            <p class="dbrosetta-form-description">
                <?php esc_html_e('Enter a term as you know it on one platform and see its equivalent on other platforms.', 'dbrosetta'); ?>
            </p>
        </div>

        <div class="dbrosetta-form-row">
            <label for="dbrosetta-term" class="dbrosetta-label">
                <?php esc_html_e('Term', 'dbrosetta'); ?>
                <span class="dbrosetta-required">*</span>
            </label>
            <input
                type="text"
                id="dbrosetta-term"
                name="term"
                class="dbrosetta-input"
                placeholder="<?php esc_attr_e('e.g., transaction log', 'dbrosetta'); ?>"
                value="<?php echo esc_attr($term); ?>"
                required
            />
            <span class="dbrosetta-help-text">
                <?php esc_html_e('Enter the term as you know it on your source platform', 'dbrosetta'); ?>
            </span>
        </div>

        <div class="dbrosetta-form-row">
            <label for="dbrosetta-source-dialect" class="dbrosetta-label">
                <?php esc_html_e('I know this term in', 'dbrosetta'); ?>
                <span class="dbrosetta-required">*</span>
            </label>
            <select
                id="dbrosetta-source-dialect"
                name="source_dialect"
                class="dbrosetta-select"
                required
            >
                <option value=""><?php esc_html_e('Select a platform&hellip;', 'dbrosetta'); ?></option>
                <?php foreach ($dialects as $dialect): ?>
                    <option value="<?php echo esc_attr($dialect['name']); ?>" <?php selected($source_dialect, $dialect['name']); ?>>
                        <?php echo esc_html($dialect['displayName']); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="dbrosetta-form-row">
            <span class="dbrosetta-label">
                <?php esc_html_e('Translate to', 'dbrosetta'); ?>
                <span class="dbrosetta-required">*</span>
            </span>
            <div class="dbrosetta-target-dialects">
                <label class="dbrosetta-checkbox-label dbrosetta-checkbox-all">
                    <input
                        type="checkbox"
                        name="all_platforms"
                        value="1"
                        <?php checked($all_platforms); ?>
                    />
                    <?php esc_html_e('All platforms', 'dbrosetta'); ?>
                </label>
                <?php foreach ($dialects as $dialect): ?>
                    <label class="dbrosetta-checkbox-label">
                        <input
                            type="checkbox"
                            name="target_dialects[]"
                            value="<?php echo esc_attr($dialect['name']); ?>"
                            <?php checked(in_array($dialect['name'], $target_dialects, true)); ?>
                        />
                        <?php echo esc_html($dialect['displayName']); ?>
                    </label>
                <?php endforeach; ?>
            </div>
            <span class="dbrosetta-help-text">
                <?php esc_html_e('Choose one, several, or all platforms to translate to', 'dbrosetta'); ?>
            </span>
        </div>

        <div class="dbrosetta-form-actions">
            <button
                type="submit"
                name="dbrosetta_search_submit"
                class="dbrosetta-button dbrosetta-button-primary"
            >
                <?php esc_html_e('Look Up', 'dbrosetta'); ?>
            </button>

            <?php if (!empty($term)): ?>
                <a
                    href="<?php echo esc_url(remove_query_arg(array('term', 'source_dialect', 'target_dialects'))); ?>"
                    class="dbrosetta-button dbrosetta-button-secondary"
                >
                    <?php esc_html_e('Clear', 'dbrosetta'); ?>
                </a>
            <?php endif; ?>
        </div>
    </form>
</div>
