/**
 * "Export page" control.
 *
 * Prepares the document for printing (see print-assets.js), then opens the
 * browser's print dialog where the reader chooses "Save as PDF".
 * Styling: css/components/button.css and css/print.css.
 */

import { createElement } from '../utils/dom.js';
import {
    addMissingImageReferences,
    addPrintableMediaReferences,
    waitForPrintableAssets
} from './print-assets.js';

const BUTTON_ID = 'exportPdfBtn';
const IDLE_LABEL = 'Export page';
const RESET_DELAY_MS = 1200;

function buildButton() {
    const badge = createElement('span', {
        class: 'pdf-export-button__badge',
        'aria-hidden': 'true',
        text: 'PDF'
    });
    const label = createElement('span', {
        class: 'pdf-export-button__label',
        'aria-live': 'polite',
        text: IDLE_LABEL
    });

    return createElement('button', {
        id: BUTTON_ID,
        class: 'pdf-export-button',
        type: 'button',
        'aria-label': 'Export this page as a PDF',
        title: 'Open the print dialog and choose Save as PDF'
    }, [badge, label]);
}

export function initPdfExport() {
    if (!document.querySelector('main') || document.getElementById(BUTTON_ID)) {
        return;
    }

    const headerContainer = document.querySelector('header .container') || document.querySelector('header');
    if (!headerContainer) {
        return;
    }

    const button = buildButton();
    headerContainer.prepend(createElement('div', { class: 'pdf-export-container' }, [button]));

    addPrintableMediaReferences();

    const label = button.querySelector('.pdf-export-button__label');
    const resetButton = () => {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        label.textContent = IDLE_LABEL;
    };

    window.addEventListener('afterprint', resetButton);

    button.addEventListener('click', async () => {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        label.textContent = 'Preparing PDF...';

        try {
            await waitForPrintableAssets();
            addMissingImageReferences();
            label.textContent = 'Opening dialog...';

            // Give the browser one paint cycle to apply image fallbacks and the
            // final button state before it builds the print document.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            window.print();
        } finally {
            // Some browsers do not dispatch afterprint when their dialog is
            // cancelled, so this keeps the control from remaining disabled.
            window.setTimeout(resetButton, RESET_DELAY_MS);
        }
    });
}
