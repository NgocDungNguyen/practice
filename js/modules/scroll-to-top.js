/**
 * Floating "back to top" button, visible after one viewport of scrolling.
 */

import { createElement } from '../utils/dom.js';

export function initScrollToTop() {
    const button = createElement('button', {
        class: 'scroll-top',
        type: 'button',
        'aria-label': 'Scroll back to top'
    });
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5M5.5 11.5L12 5l6.5 6.5"/></svg>';
    document.body.append(button);

    button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    let scheduled = false;
    const update = () => {
        button.classList.toggle('is-visible', window.scrollY > window.innerHeight);
    };
    window.addEventListener('scroll', () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            update();
        });
    }, { passive: true });
    update();
}
