<?php
/**
 * Template for displaying dbRosetta search results.
 *
 * This template is loaded by the [dbrosetta_search] shortcode after a successful search.
 *
 * @package DBRosetta
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Check if we have results
if (empty($results) || !isset($results['data'])) {
    return;
}

$items = $results['data'];
$total = isset($results['total']) ? $results['total'] : count($items);
?>

<div class="dbrosetta-results-container">
    <div class="dbrosetta-results-header">
        <h4 class="dbrosetta-results-title">
            <?php
            printf(
                /* translators: 1: search term, 2: number of results */
                esc_html__('Search Results for "%1$s" (%2$d found)', 'dbrosetta'),
                esc_html($search_term),
                absint($total)
            );
            ?>
        </h4>
    </div>

    <?php if (empty($items)): ?>
        <div class="dbrosetta-no-results">
            <p>
                <?php
                printf(
                    /* translators: %s: search term */
                    esc_html__('No results found for "%s". Try a different search term.', 'dbrosetta'),
                    esc_html($search_term)
                );
                ?>
            </p>
        </div>
    <?php else: ?>
        <div class="dbrosetta-results-list">
            <?php foreach ($items as $item): ?>
                <div class="dbrosetta-result-item">
                    <div class="dbrosetta-result-header">
                        <h5 class="dbrosetta-term-name">
                            <?php echo esc_html($item['standard_term'] ?? 'Unknown Term'); ?>
                        </h5>
                        <?php if (isset($item['category'])): ?>
                            <span class="dbrosetta-category-badge dbrosetta-category-<?php echo esc_attr(strtolower($item['category'])); ?>">
                                <?php echo esc_html($item['category']); ?>
                            </span>
                        <?php endif; ?>
                    </div>

                    <?php if (isset($item['description']) && !empty($item['description'])): ?>
                        <div class="dbrosetta-term-description">
                            <p><?php echo esc_html($item['description']); ?></p>
                        </div>
                    <?php endif; ?>

                    <?php
                    // Try to fetch translations for this term
                    if (isset($item['term_id'])) {
                        $client = new DBRosetta_Client(DBROSETTA_API_URL, DBROSETTA_API_TOKEN);
                        $translations_response = $client->get_translations($item['term_id']);
                        
                        if (!is_wp_error($translations_response) && !empty($translations_response['data'])):
                            $translations = $translations_response['data'];
                    ?>
                        <div class="dbrosetta-translations">
                            <h6 class="dbrosetta-translations-title">
                                <?php esc_html_e('Database-Specific Translations:', 'dbrosetta'); ?>
                            </h6>
                            <div class="dbrosetta-translations-grid">
                                <?php foreach ($translations as $translation): ?>
                                    <div class="dbrosetta-translation-item">
                                        <div class="dbrosetta-translation-header">
                                            <span class="dbrosetta-dialect-name">
                                                <?php
                                                // Display dialect name (you might want to fetch the actual dialect name)
                                                printf(
                                                    /* translators: %d: dialect ID */
                                                    esc_html__('Dialect %d', 'dbrosetta'),
                                                    absint($translation['dialect_id'] ?? 0)
                                                );
                                                ?>
                                            </span>
                                            <?php if (isset($translation['confidence_score'])): ?>
                                                <span class="dbrosetta-confidence">
                                                    <?php
                                                    printf(
                                                        /* translators: %d: confidence percentage */
                                                        esc_html__('%d%% confidence', 'dbrosetta'),
                                                        absint($translation['confidence_score'])
                                                    );
                                                    ?>
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                        <div class="dbrosetta-translation-text">
                                            <code><?php echo esc_html($translation['translation'] ?? ''); ?></code>
                                        </div>
                                        <?php if (isset($translation['description']) && !empty($translation['description'])): ?>
                                            <div class="dbrosetta-translation-description">
                                                <small><?php echo esc_html($translation['description']); ?></small>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php
                        endif;
                    }
                    ?>

                    <div class="dbrosetta-result-meta">
                        <span class="dbrosetta-meta-item">
                            <?php
                            printf(
                                /* translators: %d: term ID */
                                esc_html__('Term ID: %d', 'dbrosetta'),
                                absint($item['term_id'] ?? 0)
                            );
                            ?>
                        </span>
                        <?php if (isset($item['is_active'])): ?>
                            <span class="dbrosetta-meta-item">
                                <?php
                                echo $item['is_active'] 
                                    ? '<span class="dbrosetta-status-active">' . esc_html__('Active', 'dbrosetta') . '</span>'
                                    : '<span class="dbrosetta-status-inactive">' . esc_html__('Inactive', 'dbrosetta') . '</span>';
                                ?>
                            </span>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>

        <?php
        // Display pagination info if available
        if (isset($results['page']) && isset($results['limit'])):
            $current_page = $results['page'];
            $total_pages = isset($results['totalPages']) ? $results['totalPages'] : 1;
            
            if ($total_pages > 1):
        ?>
            <div class="dbrosetta-pagination">
                <p class="dbrosetta-pagination-info">
                    <?php
                    printf(
                        /* translators: 1: current page, 2: total pages */
                        esc_html__('Page %1$d of %2$d', 'dbrosetta'),
                        absint($current_page),
                        absint($total_pages)
                    );
                    ?>
                </p>
            </div>
        <?php
            endif;
        endif;
        ?>
    <?php endif; ?>
</div>
