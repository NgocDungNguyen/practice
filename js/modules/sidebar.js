/**
 * Mobile sidebar drawer.
 */

export function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const toggle = document.querySelector('[data-action="toggle-sidebar"]');
    const overlay = document.querySelector('.sidebar__overlay');
    if (!sidebar || !toggle) return;

    const set = open => {
        sidebar.classList.toggle('is-open', open);
        overlay?.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
    };

    toggle.addEventListener('click', () => set(!sidebar.classList.contains('is-open')));
    overlay?.addEventListener('click', () => set(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) set(false);
    });
    // Close when a nav link is chosen (relevant on same-page anchors).
    sidebar.addEventListener('click', event => {
        if (event.target.closest('a')) set(false);
    });
}
