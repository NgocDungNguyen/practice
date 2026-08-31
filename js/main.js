/**
 * Site entry point — loaded once per page as a module script.
 *
 * Every feature is self-detecting: it inspects the DOM and does nothing when
 * the page has no matching markup, so pages never pick and choose scripts.
 */

import { onReady } from './utils/dom.js';
import { initTheme } from './modules/theme.js';
import { initSyntaxHighlighting } from './modules/syntax-highlight.js';
import { initSections } from './modules/sections.js';
import { initCollapsibles } from './modules/collapsible.js';
import { initProgress } from './modules/progress.js';
import { initToc } from './modules/toc.js';
import { initSearch } from './modules/search.js';
import { initLightbox } from './modules/lightbox.js';
import { initCodeCopy } from './modules/code-copy.js';
import { initSidebar } from './modules/sidebar.js';
import { initScrollToTop } from './modules/scroll-to-top.js';

function initPrintButtons() {
    document.querySelectorAll('[data-action="print-page"]').forEach(button => {
        button.addEventListener('click', () => window.print());
    });
}

const FEATURES = [
    ['theme toggle', initTheme],
    ['syntax highlighting', initSyntaxHighlighting],
    ['section enrichment', initSections],       // before collapsible + progress
    ['collapsible sections', initCollapsibles],
    ['progress tracking', initProgress],
    ['table of contents', initToc],
    ['search palette', initSearch],
    ['screenshot lightbox', initLightbox],
    ['code copy buttons', initCodeCopy],
    ['sidebar drawer', initSidebar],
    ['scroll to top', initScrollToTop],
    ['print buttons', initPrintButtons]
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
