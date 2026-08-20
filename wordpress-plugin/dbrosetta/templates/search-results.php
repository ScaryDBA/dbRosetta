<?php
/**
 * Template for displaying dbRosetta directional term-lookup results.
 *
 * This template is loaded by the [dbrosetta_search] shortcode after a
 * lookup attempt (either a successful match or a "not found" result).
 *
 * @package DBRosetta
 */

// If this file is called directly, abort.
if (!defined('WPINC')) {
    die;
}

// Resolve a human-readable source platform name for the "not found" message.
$source_dialect_label = $source_dialect;
if (!empty($dialects)) {
    foreach ($dialects as $dialect) {
        if ($dialect['name'] === $source_dialect) {
            $source_dialect_label = $dialect['displayName'];
            break;
        }
    }
}
?>

<div class="dbrosetta-results-container">
    <?php if ($not_found || empty($results)): ?>
        <div class="dbrosetta-no-results">
            <p>
                <?php
                printf(
                    /* translators: 1: term, 2: source platform */
                    esc_html__('No term matching "%1$s" was found for %2$s.', 'dbrosetta'),
                    esc_html($term),
                    esc_html($source_dialect_label)
                );
                ?>
            </p>
        </div>
    <?php else: ?>
        <div class="dbrosetta-results-header">
            <h4 class="dbrosetta-results-title">
                <?php echo esc_html($results['term']['canonicalTerm']); ?>
            </h4>
            <?php if (!empty($results['term']['category'])): ?>
                <span class="dbrosetta-category-badge dbrosetta-category-<?php echo esc_attr(strtolower($results['term']['category'])); ?>">
                    <?php echo esc_html($results['term']['category']); ?>
                </span>
            <?php endif; ?>
        </div>

        <?php if (!empty($results['term']['description'])): ?>
            <div class="dbrosetta-term-description">
                <p><?php echo esc_html($results['term']['description']); ?></p>
            </div>
        <?php endif; ?>

        <?php if (!empty($results['matchedEquivalent'])): ?>
            <div class="dbrosetta-source-match">
                <p>
                    <?php
                    printf(
                        /* translators: 1: source platform, 2: confirmed equivalent term */
                        esc_html__('On %1$s, this is known as: %2$s', 'dbrosetta'),
                        esc_html($results['matchedEquivalent']['dialect']['displayName']),
                        '<code>' . esc_html($results['matchedEquivalent']['equivalentTerm']) . '</code>'
                    );
                    ?>
                </p>
            </div>
        <?php endif; ?>

        <?php if (!empty($results['results'])): ?>
            <div class="dbrosetta-equivalents">
                <h6 class="dbrosetta-equivalents-title">
                    <?php esc_html_e('Platform Equivalents:', 'dbrosetta'); ?>
                </h6>
                <div class="dbrosetta-equivalents-table">
                    <table class="dbrosetta-table">
                        <thead>
                            <tr>
                                <th><?php esc_html_e('Platform', 'dbrosetta'); ?></th>
                                <th><?php esc_html_e('Equivalent Term', 'dbrosetta'); ?></th>
                                <th><?php esc_html_e('Notes', 'dbrosetta'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($results['results'] as $equivalent): ?>
                                <tr>
                                    <td><strong><?php echo esc_html($equivalent['dialect']['displayName']); ?></strong></td>
                                    <td><code><?php echo esc_html($equivalent['equivalentTerm']); ?></code></td>
                                    <td><?php echo esc_html($equivalent['notes'] ?? ''); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>
    <?php endif; ?>
</div>
