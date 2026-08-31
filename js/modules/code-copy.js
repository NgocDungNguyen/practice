/**
 * One-click copy button on every code block.
 */

import { createElement, selectAll } from '../utils/dom.js';

const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg>';
const DONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';

export function initCodeCopy() {
    selectAll('pre').forEach(pre => {
        const code = pre.querySelector('code') ?? pre;
        const button = createElement('button', {
            class: 'code-copy',
            type: 'button',
            'aria-label': 'Copy code to clipboard'
        });
        button.innerHTML = `${COPY_ICON}<span>Copy</span>`;

        let timer = 0;
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.textContent.trimEnd());
            } catch {
                // Fallback for older browsers / non-secure contexts.
                const range = document.createRange();
                range.selectNodeContents(code);
                const selection = getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                document.execCommand('copy');
                selection.removeAllRanges();
            }
            button.classList.add('is-copied');
            button.innerHTML = `${DONE_ICON}<span>Copied</span>`;
            clearTimeout(timer);
            timer = setTimeout(() => {
                button.classList.remove('is-copied');
                button.innerHTML = `${COPY_ICON}<span>Copy</span>`;
            }, 1600);
        });

        pre.append(button);
    });
}
