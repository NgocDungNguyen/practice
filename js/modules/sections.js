/**
 * Section header enrichment for lab pages.
 *
 * Each top-level section header (h2.collapsible-header inside a
 * .cheatsheet-section) is decorated — without touching its text content —
 * with:
 *   - the leading emoji lifted into a coloured icon tile,
 *   - a copy-link anchor,
 *   - a "mark as done" toggle (wired up by progress.js).
 */

import { createElement, selectAll } from '../utils/dom.js';

const ANCHOR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';

/** Splits "🎯 Objective" into ["🎯", "Objective"]; returns null without emoji. */
function splitEmoji(text) {
    const match = text.match(/^(\p{Extended_Pictographic}(?:️|⃣)?(?:‍\p{Extended_Pictographic}(?:️)?)*)\s+(.*)$/su);
    return match ? [match[1], match[2]] : null;
}

export function initSections() {
    selectAll('.cheatsheet-section > .collapsible-header').forEach(header => {
        const section = header.closest('.cheatsheet-section');
        const icon = header.querySelector('.collapse-icon');

        // Lift the header's text (everything before the collapse icon) so we
        // can re-compose it as tile + title without losing a character.
        const textNodes = [...header.childNodes].filter(node =>
            node !== icon && !(node instanceof Element && node.classList.contains('collapse-icon')));
        const raw = textNodes.map(node => node.textContent).join('').trim();
        textNodes.forEach(node => node.remove());

        const split = splitEmoji(raw);
        const emoji = split ? split[0] : null;
        const title = split ? split[1] : raw;

        const pieces = [];
        if (emoji) pieces.push(createElement('span', { class: 'section-emoji', 'aria-hidden': 'true', text: emoji }));
        pieces.push(createElement('span', { class: 'section-title-text', text: title }));

        if (section?.id) {
            const anchor = createElement('a', {
                class: 'section-anchor',
                href: `#${section.id}`,
                'aria-label': `Link to section: ${title}`,
                title: 'Copy link to this section'
            });
            anchor.innerHTML = ANCHOR_ICON;
            anchor.addEventListener('click', () => {
                navigator.clipboard?.writeText(new URL(`#${section.id}`, location.href).href)
                    .catch(() => { /* clipboard unavailable — the hash still updates */ });
            });
            pieces.push(anchor);

            const done = createElement('button', {
                class: 'section-done',
                type: 'button',
                'aria-pressed': 'false',
                'aria-label': `Mark section as done: ${title}`,
                title: 'Mark as done',
                'data-section-id': section.id
            });
            done.innerHTML = CHECK_ICON;
            pieces.push(done);
        }

        if (icon) {
            icon.before(...pieces);
        } else {
            header.append(...pieces);
        }
    });
}
