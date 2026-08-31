/**
 * Locked cards.
 *
 * A card that is not published yet announces itself instead of navigating:
 *   <a href="#" class="card card--placeholder" data-locked-message="…">
 *
 * Keeping the message in a data attribute keeps JavaScript out of the markup.
 */

import { selectAll } from '../utils/dom.js';

export function initLockedCards() {
    selectAll('[data-locked-message]').forEach(card => {
        card.addEventListener('click', event => {
            event.preventDefault();
            window.alert(card.dataset.lockedMessage);
        });
    });
}
