/**
 * "On this page" rail: scrollspy highlighting, expand/collapse-all tools,
 * and the top-of-viewport reading progress bar.
 */

import { selectAll } from '../utils/dom.js';
import { revealSection } from './collapsible.js';

function initScrollSpy() {
    const links = selectAll('.toc__link[href^="#"]');
    if (!links.length) return;

    const byId = new Map(links.map(link => [decodeURIComponent(link.hash.slice(1)), link]));
    const sections = [...byId.keys()]
        .map(id => document.getElementById(id))
        .filter(Boolean);
    if (!sections.length) return;

    let active = null;
    const activate = id => {
        const link = byId.get(id);
        if (!link || link === active) return;
        active?.classList.remove('toc__link--active');
        link.classList.add('toc__link--active');
        active = link;
    };

    const pick = () => {
        // The active section is the last one whose top has passed the header.
        const line = 110;
        let current = sections[0];
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= line) current = section;
            else break;
        }
        activate(current.id);
    };

    let scheduled = false;
    window.addEventListener('scroll', () => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            pick();
        });
    }, { passive: true });
    pick();

    // Clicking a TOC entry must open a collapsed section before jumping.
    links.forEach(link => {
        link.addEventListener('click', () => {
            const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
            if (target) revealSection(target);
        });
    });
}

function initTools() {
    document.querySelector('[data-action="expand-all"]')?.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('cosc27:expand-all'));
    });
    document.querySelector('[data-action="collapse-all"]')?.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('cosc27:collapse-all'));
    });
}

function initReadingProgress() {
    const fill = document.querySelector('.progress-rail__fill');
    if (!fill) return;

    const update = () => {
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        fill.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : '0%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
}

export function initToc() {
    initScrollSpy();
    initTools();
    initReadingProgress();
}
