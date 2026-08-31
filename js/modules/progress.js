/**
 * Lab progress tracking (localStorage, no accounts, no network).
 *
 * Storage shape: { "week-1": ["objectives", "ubuntu-virtualbox", …], … }
 *
 * Surfaces that react to progress:
 *   - .section-done buttons in section headers (source of truth for clicks)
 *   - TOC items ([data-toc-id]) get data-done ticks + a progress bar
 *   - sidebar links ([data-page-key]) show a tick when a page is 100% done
 *   - homepage week cards ([data-page-key][data-sections]) show progress rings
 */

import { selectAll } from '../utils/dom.js';

const STORAGE_KEY = 'cosc27-progress-v1';

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
        /* private browsing: progress just won't persist */
    }
}

function doneSet(state, pageKey) {
    return new Set(state[pageKey] ?? []);
}

/** Total trackable sections per page, emitted by the build into the sidebar. */
function sectionTotals() {
    const totals = {};
    selectAll('[data-page-key][data-sections]').forEach(el => {
        totals[el.dataset.pageKey] = Number(el.dataset.sections) || 0;
    });
    return totals;
}

function renderPage(state) {
    const pageKey = document.body.dataset.page;
    if (!pageKey) return;
    const done = doneSet(state, pageKey);

    const buttons = selectAll('.section-done[data-section-id]');
    buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(done.has(button.dataset.sectionId)));
    });
    selectAll('.toc__item[data-toc-id]').forEach(item => {
        item.dataset.done = String(done.has(item.dataset.tocId));
    });

    // Count only sections that exist on the page — stored ids may be
    // orphaned after content updates rename or remove sections.
    const total = buttons.length;
    const doneHere = buttons.filter(b => done.has(b.dataset.sectionId)).length;
    const bar = document.querySelector('.toc__progress-fill');
    const label = document.querySelector('[data-progress-label]');
    if (bar && total) bar.style.width = `${Math.round((doneHere / total) * 100)}%`;
    if (label && total) label.textContent = `${doneHere} of ${total} sections done`;
}

function renderNav(state) {
    const totals = sectionTotals();
    selectAll('.sidenav__link[data-page-key]').forEach(link => {
        const key = link.dataset.pageKey;
        const total = totals[key] ?? 0;
        const done = doneSet(state, key).size;
        link.dataset.done = String(total > 0 && done >= total);
    });
}

function renderRings(state) {
    selectAll('.week-card__ring[data-page-key]').forEach(ring => {
        const total = Number(ring.dataset.sections) || 0;
        const done = Math.min(doneSet(state, ring.dataset.pageKey).size, total);
        const circle = ring.querySelector('.ring-fill');
        if (!circle || !total) return;
        const radius = Number(circle.getAttribute('r'));
        const circumference = 2 * Math.PI * radius;
        circle.style.strokeDasharray = String(circumference);
        circle.style.strokeDashoffset = String(circumference * (1 - done / total));
        ring.dataset.complete = String(done >= total);
        ring.setAttribute('aria-label', `${done} of ${total} sections done`);
    });
}

function renderAll(state) {
    renderPage(state);
    renderNav(state);
    renderRings(state);
}

export function initProgress() {
    let state = load();
    renderAll(state);

    document.addEventListener('click', event => {
        const button = event.target.closest('.section-done[data-section-id]');
        if (!button) return;
        event.stopPropagation();

        const pageKey = document.body.dataset.page;
        if (!pageKey) return;
        const done = doneSet(state, pageKey);
        const id = button.dataset.sectionId;
        done.has(id) ? done.delete(id) : done.add(id);
        state[pageKey] = [...done];
        save(state);
        renderAll(state);
    });

    // Reflect changes made in other tabs.
    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY) return;
        state = load();
        renderAll(state);
    });
}
