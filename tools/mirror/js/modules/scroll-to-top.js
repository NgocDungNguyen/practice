/**
 * Floating "back to top" control.
 *
 * The button is created here rather than repeated in every page's markup, so
 * a new sub-page gets it for free. Styling: css/components/button.css.
 */

import { createElement } from '../utils/dom.js';

const BUTTON_ID = 'scrollToTopBtn';
const VISIBLE_CLASS = 'is-visible';
const SHOW_AFTER_PX = 100;

export function initScrollToTop() {
    const existing = document.getElementById(BUTTON_ID);
    const button = existing || createElement('button', {
        id: BUTTON_ID,
        class: 'scroll-to-top-button',
        type: 'button',
        title: 'Go to top',
        'aria-label': 'Scroll back to top of page',
        text: '⬆️'
    });

    if (!existing) {
        document.body.append(button);
    }

    const syncVisibility = () => {
        const scrolled = document.documentElement.scrollTop || document.body.scrollTop;
        button.classList.toggle(VISIBLE_CLASS, scrolled > SHOW_AFTER_PX);
    };

    window.addEventListener('scroll', syncVisibility, { passive: true });
    syncVisibility();

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}
