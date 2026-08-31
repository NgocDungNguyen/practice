/**
 * Interactive demos on the Swift & SwiftUI cheatsheet.
 *
 * Each demo is opted into from the markup with a data-demo attribute, so this
 * module stays inert on every other page.
 */

import { selectAll } from '../utils/dom.js';

const FRUITS = ['Apple', 'Banana', 'Cherry'];

/** data-demo="tap-counter": increments the count shown by its output element. */
function initTapCounters() {
    selectAll('[data-demo="tap-counter"]').forEach(button => {
        const output = document.getElementById(button.dataset.demoTarget || '');
        if (!output) return;

        let taps = 0;
        button.addEventListener('click', () => {
            taps += 1;
            output.textContent = `Taps: ${taps}`;
        });
    });
}

/** data-demo="random-values": illustrates Int.random and randomElement output. */
function initRandomValues() {
    selectAll('[data-demo="random-values"]').forEach(output => {
        const fruit = FRUITS[Math.floor(Math.random() * FRUITS.length)];
        const number = Math.floor(Math.random() * 100) + 1;

        output.replaceChildren(
            `Random number: ${number}`,
            document.createElement('br'),
            `Random fruit: ${fruit}`,
            document.createElement('br'),
            'From empty: Default Value'
        );
    });
}

export function initCheatsheetDemos() {
    initTapCounters();
    initRandomValues();
}
