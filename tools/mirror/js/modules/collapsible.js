/**
 * Collapsible sections.
 *
 * Markup contract (see css/components/collapsible.css):
 *   <h2 class="collapsible-header start-open">Title <span class="collapse-icon"></span></h2>
 *   <div class="collapsible-content"> … </div>
 *
 * A header controls the .collapsible-content element that immediately follows
 * it. Without .start-open the section renders collapsed.
 */

import { selectAll } from '../utils/dom.js';

const HEADER_SELECTOR = '.collapsible-header';
const CONTENT_CLASS = 'collapsible-content';
const COLLAPSED_CLASS = 'collapsed';
const START_OPEN_CLASS = 'start-open';

/**
 * @param {Element} header
 * @returns {Element|null}
 */
function contentFor(header) {
    const next = header.nextElementSibling;
    return next?.classList.contains(CONTENT_CLASS) ? next : null;
}

/**
 * @param {Element} header
 * @param {Element} content
 * @param {boolean} collapsed
 */
function setCollapsed(header, content, collapsed) {
    header.classList.toggle(COLLAPSED_CLASS, collapsed);
    content.classList.toggle(COLLAPSED_CLASS, collapsed);
    header.setAttribute('aria-expanded', String(!collapsed));
}

export function initCollapsibles() {
    selectAll(HEADER_SELECTOR).forEach(header => {
        const content = contentFor(header);
        if (!content) return;

        // Headings are not focusable or activatable by default, so give the
        // control the semantics a keyboard user expects.
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');

        setCollapsed(header, content, !header.classList.contains(START_OPEN_CLASS));

        const toggle = () => {
            setCollapsed(header, content, !header.classList.contains(COLLAPSED_CLASS));
        };

        header.addEventListener('click', toggle);
        header.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggle();
            }
        });
    });
}
