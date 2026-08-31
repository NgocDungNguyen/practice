/**
 * Light / dark theme toggle.
 *
 * The initial theme is applied by a tiny inline script in <head> (to avoid a
 * flash of the wrong theme); this module only wires the toggle button.
 */

import { selectAll } from '../utils/dom.js';

const STORAGE_KEY = 'cosc27-theme';

export function currentTheme() {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function initTheme() {
    selectAll('[data-action="toggle-theme"]').forEach(button => {
        button.addEventListener('click', () => {
            const next = currentTheme() === 'dark' ? 'light' : 'dark';
            document.documentElement.dataset.theme = next;
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                /* private browsing: theme just won't persist */
            }
        });
    });
}
