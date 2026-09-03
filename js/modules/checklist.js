/**
 * Tickable "done when" checklists (runbook pages).
 *
 * Every `.done-list li` becomes a toggle. State is kept in localStorage,
 * keyed by page + owning section id + item index, so a refresh keeps ticks.
 * No accounts, no network — same spirit as progress.js.
 */

import { selectAll } from '../utils/dom.js';

const STORAGE_KEY = 'cosc27-checklist-v1';

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    } catch {
        return {};
    }
}

function save(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        /* private browsing: ticks just won't persist */
    }
}

function render(item, checked) {
    item.classList.toggle('is-checked', checked);
    item.setAttribute('aria-checked', String(checked));
}

export function initChecklists() {
    const items = selectAll('.done-list li');
    if (!items.length) return;

    const pageKey = document.body.dataset.page || location.pathname;
    const state = load();
    const ticks = state[pageKey] ?? {};

    items.forEach(item => {
        const section = item.closest('.cheatsheet-section');
        const list = item.parentElement;
        const index = [...list.children].indexOf(item);
        const key = `${section?.id ?? 'page'}:${index}`;

        item.setAttribute('role', 'checkbox');
        item.setAttribute('tabindex', '0');
        render(item, Boolean(ticks[key]));

        const toggle = event => {
            if (event.target.closest('a')) return;
            event.preventDefault();
            const next = !item.classList.contains('is-checked');
            render(item, next);
            if (next) ticks[key] = true; else delete ticks[key];
            state[pageKey] = ticks;
            save(state);
        };

        item.addEventListener('click', toggle);
        item.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') toggle(event);
        });
    });
}
