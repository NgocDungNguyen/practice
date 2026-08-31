/**
 * Small DOM helpers shared by the feature modules.
 * Keep this file dependency-free: everything else may import it.
 */

/**
 * Runs a callback once the DOM is parsed, whether or not that already happened.
 * @param {() => void} callback
 */
export function onReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
        callback();
    }
}

/**
 * Creates an element with attributes and children in one call.
 * @param {string} tag
 * @param {Record<string, string>} [attributes] - `class` and `text` are handled specially.
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    for (const [name, value] of Object.entries(attributes)) {
        if (value === undefined || value === null) continue;

        if (name === 'class') {
            element.className = value;
        } else if (name === 'text') {
            element.textContent = value;
        } else {
            element.setAttribute(name, value);
        }
    }

    for (const child of children) {
        element.append(child);
    }

    return element;
}

/**
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {Element[]}
 */
export function selectAll(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
}
