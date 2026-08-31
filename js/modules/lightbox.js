/**
 * Screenshot lightbox.
 *
 * Every tutorial screenshot opens in a full-screen <dialog> with previous /
 * next navigation (buttons, arrow keys) and the image's alt text as caption.
 */

import { createElement, selectAll } from '../utils/dom.js';

const ICONS = {
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

export function initLightbox() {
    const images = selectAll('.tutorial-image-group img, .lightboxable img');
    if (!images.length) return;

    const dialog = createElement('dialog', { class: 'lightbox', 'aria-label': 'Screenshot viewer' });
    const img = createElement('img', { alt: '' });
    const caption = createElement('div', { class: 'lightbox__caption' });
    const count = createElement('div', { class: 'lightbox__count' });

    const button = (kind, label) => {
        const el = createElement('button', {
            class: `lightbox__btn lightbox__btn--${kind}`,
            type: 'button',
            'aria-label': label
        });
        el.innerHTML = ICONS[kind];
        return el;
    };
    const prevBtn = button('prev', 'Previous screenshot');
    const nextBtn = button('next', 'Next screenshot');
    const closeBtn = button('close', 'Close viewer');

    dialog.append(img, caption, count, prevBtn, nextBtn, closeBtn);
    document.body.append(dialog);

    let index = 0;

    const show = i => {
        index = (i + images.length) % images.length;
        const source = images[index];
        img.src = source.currentSrc || source.src;
        img.alt = source.alt;
        caption.textContent = source.alt;
        caption.style.display = source.alt ? '' : 'none';
        count.textContent = `${index + 1} / ${images.length}`;
        const single = images.length < 2;
        prevBtn.style.display = single ? 'none' : '';
        nextBtn.style.display = single ? 'none' : '';
    };

    images.forEach((image, i) => {
        image.addEventListener('click', () => {
            show(i);
            dialog.showModal();
        });
    });

    prevBtn.addEventListener('click', () => show(index - 1));
    nextBtn.addEventListener('click', () => show(index + 1));
    closeBtn.addEventListener('click', () => dialog.close());

    dialog.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft') show(index - 1);
        if (event.key === 'ArrowRight') show(index + 1);
    });

    // Click on the backdrop (anywhere outside the image itself) closes.
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
}
