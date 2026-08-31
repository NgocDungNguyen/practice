/**
 * Print preparation helpers.
 *
 * A printed page cannot play audio, video or an embedded iframe, and an image
 * that failed to load leaves a silent gap. These helpers insert readable text
 * stand-ins (hidden on screen by css/print.css) before the print dialog opens.
 */

import { createElement, selectAll } from '../utils/dom.js';

const ASSET_WAIT_TIMEOUT_MS = 5000;

/** Adds a "Media file: <url>" line after every audio, video and iframe. */
export function addPrintableMediaReferences() {
    selectAll('audio, video, iframe').forEach(media => {
        if (media.nextElementSibling?.classList.contains('print-media-reference')) {
            return;
        }

        const sourceElement = media.querySelector('source');
        const source = media.currentSrc || media.getAttribute('src') || sourceElement?.getAttribute('src');

        if (!source) {
            return;
        }

        const label = media.tagName === 'IFRAME' ? 'Interactive content: ' : 'Media file: ';
        const link = createElement('a', { href: source, text: source });
        const reference = createElement('div', { class: 'print-media-reference' }, [label, link]);

        media.insertAdjacentElement('afterend', reference);
    });
}

/** Adds an "Image unavailable" note after every image that failed to load. */
export function addMissingImageReferences() {
    selectAll('img').forEach(image => {
        const existingFallback = image.nextElementSibling?.classList.contains('print-image-fallback')
            ? image.nextElementSibling
            : null;

        if (image.complete && image.naturalWidth > 0) {
            existingFallback?.remove();
            return;
        }

        if (existingFallback) {
            return;
        }

        const description = `Image unavailable: ${image.alt || 'Untitled image'} (${image.currentSrc || image.src})`;
        image.insertAdjacentElement(
            'afterend',
            createElement('span', { class: 'print-image-fallback', text: description })
        );
    });
}

/**
 * Resolves once fonts and images have settled, or after a timeout so a single
 * stalled request can never block the print dialog.
 */
export async function waitForPrintableAssets() {
    const imagePromises = Array.from(document.images, image => {
        if (image.complete) {
            return image.decode?.().catch(() => undefined) || Promise.resolve();
        }

        return new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        });
    });

    const assetsReady = Promise.allSettled([document.fonts?.ready || Promise.resolve(), ...imagePromises]);
    const timeout = new Promise(resolve => window.setTimeout(resolve, ASSET_WAIT_TIMEOUT_MS));

    await Promise.race([assetsReady, timeout]);
}
