/**
 * Site entry point.
 *
 * Loaded once per page as `<script type="module" src="…/js/main.js" defer>`.
 * Every feature below is self-detecting: it inspects the DOM and does nothing
 * when the page has no matching markup, so a new sub-page never has to pick
 * and choose scripts. To add a behaviour, write a module under js/modules/ and
 * add one line to FEATURES.
 */

import { onReady } from './utils/dom.js';
import { initCollapsibles } from './modules/collapsible.js';
import { initScrollToTop } from './modules/scroll-to-top.js';
import { initPdfExport } from './modules/pdf-export.js';
import { initLockedCards } from './modules/locked-card.js';
import { initCheatsheetDemos } from './modules/cheatsheet-demos.js';
import { initSyntaxHighlighting } from './modules/syntax-highlight.js';

const FEATURES = [
    ['syntax highlighting', initSyntaxHighlighting],
    ['collapsible sections', initCollapsibles],
    ['scroll to top', initScrollToTop],
    ['PDF export', initPdfExport],
    ['locked cards', initLockedCards],
    ['cheatsheet demos', initCheatsheetDemos]
];

onReady(() => {
    for (const [name, init] of FEATURES) {
        try {
            init();
        } catch (error) {
            // One broken feature must not stop the rest of the page working.
            console.error(`[main] "${name}" failed to initialise:`, error);
        }
    }
});

