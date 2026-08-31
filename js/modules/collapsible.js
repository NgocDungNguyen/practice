/**
 * Collapsible sections.
 *
 * Markup contract (same as the original site):
 *   <h2 class="collapsible-header [start-open]">…<span class="collapse-icon"></span></h2>
 *   <div class="collapsible-content">…</div>
 *
 * The body animates via the grid-template-rows 0fr→1fr technique, so no
 * heights need measuring. Sections referenced by the URL hash open
 * automatically, as do all sections before printing.
 */

import { selectAll } from '../utils/dom.js';

function contentFor(header) {
    const next = header.nextElementSibling;
    return next && next.classList.contains('collapsible-content') ? next : null;
}

function setOpen(header, open) {
    const content = contentFor(header);
    if (!content) return;
    header.setAttribute('aria-expanded', String(open));
    content.classList.toggle('is-open', open);
}

function isOpen(header) {
    return header.getAttribute('aria-expanded') === 'true';
}

/** Opens every ancestor collapsible of `element`, then the section itself. */
export function revealSection(element) {
    let node = element;
    while (node && node !== document.body) {
        if (node.classList?.contains('collapsible-content')) {
            const header = node.previousElementSibling;
            if (header?.classList.contains('collapsible-header')) setOpen(header, true);
        }
        node = node.parentElement;
    }
    const ownHeader = element.querySelector?.(':scope > .collapsible-header');
    if (ownHeader) setOpen(ownHeader, true);
}

function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    revealSection(target);
    // The browser's own fragment scroll happened against the collapsed
    // layout (and start-open sections above shift things further), so
    // re-anchor once the expansion has laid out — and once more after the
    // 340ms grid-rows transition settles (same-page hash changes animate).
    requestAnimationFrame(() => {
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    });
    setTimeout(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }), 400);
}

export function initCollapsibles() {
    const headers = selectAll('.collapsible-header');

    headers.forEach(header => {
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        setOpen(header, header.classList.contains('start-open'));

        const toggle = event => {
            // Controls embedded in the header (done toggle, anchor link)
            // handle their own clicks.
            if (event.target.closest('.section-done, .section-anchor, a')) return;
            event.preventDefault();
            setOpen(header, !isOpen(header));
        };

        header.addEventListener('click', toggle);
        header.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') toggle(event);
        });
    });

    document.addEventListener('cosc27:expand-all', () => headers.forEach(h => setOpen(h, true)));
    document.addEventListener('cosc27:collapse-all', () => headers.forEach(h => setOpen(h, false)));
    window.addEventListener('beforeprint', () => headers.forEach(h => setOpen(h, true)));

    window.addEventListener('hashchange', openFromHash);
    openFromHash();
}
