/**
 * Course-wide search palette (⌘K / Ctrl+K / "/").
 *
 * The index (data/search-index.json, generated at build time) contains one
 * entry per section across every page. Scoring is a simple weighted
 * substring/word-prefix match — no dependencies, instant on ~150 entries.
 */

import { createElement, selectAll } from '../utils/dom.js';

const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/></svg>';

let dialog = null;
let input = null;
let resultsBox = null;
let index = null;
let indexPromise = null;
let activeIndex = 0;
let flatResults = [];

function rootPrefix() {
    return document.body.dataset.root ?? '';
}

async function loadIndex() {
    if (index) return index;
    indexPromise ??= fetch(`${rootPrefix()}data/search-index.json`)
        .then(response => response.json())
        .then(data => (index = data))
        .catch(() => (index = []));
    return indexPromise;
}

function normalize(text) {
    return text.toLowerCase().normalize('NFKD');
}

function scoreEntry(entry, query, terms) {
    const title = normalize(entry.title);
    const page = normalize(entry.pageTitle);
    const body = normalize(entry.text);
    let score = 0;

    if (title.includes(query)) score += 120;
    if (title.startsWith(query)) score += 60;
    if (page.includes(query)) score += 40;

    for (const term of terms) {
        const inTitle = title.includes(term);
        const inPage = page.includes(term);
        const inBody = body.includes(term);
        if (!inTitle && !inPage && !inBody) return 0; // every term must hit somewhere
        if (inTitle) score += 30;
        if (inPage) score += 10;
        if (inBody) score += 6;
    }
    return score;
}

function highlight(text, terms) {
    let result = text;
    for (const term of terms) {
        if (!term) continue;
        const pattern = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
        result = result.replace(pattern, '$1');
    }
    return result
        .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('', '<mark>').replaceAll('', '</mark>');
}

function render(query) {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    resultsBox.replaceChildren();
    activeIndex = 0;
    flatResults = [];

    if (!terms.length) {
        // Default view: one entry per page, in course order.
        const pages = [];
        const seen = new Set();
        for (const entry of index) {
            if (seen.has(entry.page)) continue;
            seen.add(entry.page);
            pages.push({ ...entry, title: entry.pageTitle, isPageLink: true });
        }
        paint([{ label: 'Jump to page', entries: pages }], terms);
        return;
    }

    const q = terms.join(' ');
    const scored = index
        .map(entry => ({ entry, score: scoreEntry(entry, q, terms) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 24);

    if (!scored.length) {
        resultsBox.append(createElement('div', {
            class: 'search-empty',
            text: `No matches for “${query}” — try a command name, tool, or week topic.`
        }));
        return;
    }

    // Group results by page, keeping the score order of first appearance.
    const groups = [];
    const byPage = new Map();
    for (const { entry } of scored) {
        if (!byPage.has(entry.page)) {
            const group = { label: entry.pageTitle, stage: entry.stage, entries: [] };
            byPage.set(entry.page, group);
            groups.push(group);
        }
        byPage.get(entry.page).entries.push(entry);
    }
    paint(groups, terms);
}

function paint(groups, terms) {
    for (const group of groups) {
        const label = createElement('div', { class: 'search-group-label', text: group.label });
        if (group.stage) label.style.setProperty('--group-accent', `var(--stage-${group.stage})`);
        resultsBox.append(label);

        for (const entry of group.entries) {
            const link = createElement('a', {
                class: 'search-result',
                href: `${rootPrefix()}${entry.page}${entry.isPageLink || !entry.section ? '' : `#${entry.section}`}`
            });
            if (entry.stage) link.style.setProperty('--group-accent', `var(--stage-${entry.stage})`);

            const icon = createElement('span', { class: 'search-result__icon', text: entry.emoji || '📄', 'aria-hidden': 'true' });
            const text = createElement('span', { class: 'search-result__text' });
            const title = createElement('span', { class: 'search-result__title' });
            title.innerHTML = highlight(entry.title, terms);
            const meta = createElement('span', { class: 'search-result__meta' });
            meta.innerHTML = entry.isPageLink
                ? highlight(entry.text.slice(0, 90), terms)
                : `${highlight(entry.pageTitle, terms)} · ${highlight(entry.text.slice(0, 80), terms)}`;
            text.append(title, meta);
            const enter = createElement('span', { class: 'search-result__enter', text: '↵', 'aria-hidden': 'true' });
            link.append(icon, text, enter);

            const position = flatResults.length;
            link.addEventListener('mousemove', () => setActive(position));
            link.addEventListener('click', () => dialog.close());
            flatResults.push(link);
            resultsBox.append(link);
        }
    }
    setActive(0);
}

function setActive(position) {
    flatResults[activeIndex]?.classList.remove('is-active');
    activeIndex = Math.max(0, Math.min(position, flatResults.length - 1));
    const link = flatResults[activeIndex];
    if (link) {
        link.classList.add('is-active');
        link.scrollIntoView({ block: 'nearest' });
    }
}

function buildDialog() {
    dialog = createElement('dialog', { class: 'search-dialog', 'aria-label': 'Search the course guides' });
    const panel = createElement('div', { class: 'search-panel' });

    const row = createElement('div', { class: 'search-input-row' });
    const iconWrap = createElement('span', { 'aria-hidden': 'true' });
    iconWrap.innerHTML = SEARCH_ICON;
    input = createElement('input', {
        class: 'search-input',
        type: 'search',
        placeholder: 'Search labs, commands, topics…',
        autocomplete: 'off',
        spellcheck: 'false',
        'aria-label': 'Search'
    });
    row.append(iconWrap, input, createElement('kbd', { text: 'esc' }));

    resultsBox = createElement('div', { class: 'search-results' });

    const footer = createElement('div', { class: 'search-footer' });
    footer.innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span>';

    panel.append(row, resultsBox, footer);
    dialog.append(panel);
    document.body.append(dialog);

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(activeIndex + 1); }
        if (event.key === 'ArrowUp') { event.preventDefault(); setActive(activeIndex - 1); }
        if (event.key === 'Enter') {
            event.preventDefault();
            flatResults[activeIndex]?.click();
        }
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
}

async function open() {
    if (!dialog) buildDialog();
    if (dialog.open) return;
    dialog.showModal();
    input.value = '';
    input.focus();
    await loadIndex();
    if (dialog.open) render('');
}

export function initSearch() {
    selectAll('[data-action="open-search"]').forEach(button => {
        button.addEventListener('click', open);
    });

    document.addEventListener('keydown', event => {
        const inField = /^(input|textarea|select)$/i.test(document.activeElement?.tagName ?? '')
            || document.activeElement?.isContentEditable;
        // Don't fight another open modal (e.g. the screenshot lightbox).
        const otherModalOpen = [...document.querySelectorAll('dialog[open]')]
            .some(d => d !== dialog);
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            if (otherModalOpen) return;
            event.preventDefault();
            dialog?.open ? dialog.close() : open();
        } else if (event.key === '/' && !inField && !dialog?.open) {
            if (otherModalOpen) return;
            event.preventDefault();
            open();
        }
    });

    // Warm the index as soon as the page is idle so the first ⌘K is instant.
    (window.requestIdleCallback ?? setTimeout)(() => loadIndex());
}
