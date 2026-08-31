/**
 * Lightweight, dependency-free syntax highlighting for course examples.
 *
 * Authors can opt into a language with:
 *   <pre><code class="language-bash">...</code></pre>
 *
 * When no language class is present, common course commands and configuration
 * formats are detected automatically. Existing hand-authored token spans are
 * preserved.
 */

import { selectAll } from '../utils/dom.js';

const LANGUAGE_META = {
    bash: { label: 'Bash', family: 'shell' },
    debian: { label: 'Debian / apt', family: 'shell' },
    redhat: { label: 'Red Hat / yum', family: 'shell' },
    docker: { label: 'Docker', family: 'shell' },
    dockerfile: { label: 'Dockerfile', family: 'dockerfile' },
    compose: { label: 'Docker Compose', family: 'adaptive-yaml' },
    swarm: { label: 'Docker Swarm', family: 'adaptive-yaml' },
    ansible: { label: 'Ansible', family: 'adaptive-yaml' },
    kubernetes: { label: 'Kubernetes', family: 'adaptive-yaml' },
    aws: { label: 'AWS CLI', family: 'shell' },
    maven: { label: 'Maven', family: 'adaptive-xml' },
    java: { label: 'Java', family: 'java' },
    tomcat: { label: 'Tomcat', family: 'adaptive-xml' },
    jenkins: { label: 'Jenkins', family: 'adaptive-groovy' },
    yaml: { label: 'YAML', family: 'yaml' },
    xml: { label: 'XML', family: 'xml' },
    groovy: { label: 'Groovy', family: 'groovy' },
    properties: { label: 'Properties', family: 'properties' },
    tree: { label: 'Directory structure', family: 'tree' },
    text: { label: 'Text', family: 'text' }
};

const ALIASES = new Map([
    ['sh', 'bash'],
    ['shell', 'bash'],
    ['linux', 'bash'],
    ['ubuntu', 'debian'],
    ['apt', 'debian'],
    ['fedora', 'redhat'],
    ['centos', 'redhat'],
    ['rhel', 'redhat'],
    ['yum', 'redhat'],
    ['docker-compose', 'compose'],
    ['dockercompose', 'compose'],
    ['docker-swarm', 'swarm'],
    ['k8s', 'kubernetes'],
    ['kubectl', 'kubernetes'],
    ['aws-cli', 'aws'],
    ['awscli', 'aws'],
    ['mvn', 'maven'],
    ['pom', 'maven'],
    ['pom.xml', 'maven'],
    ['jenkinsfile', 'jenkins'],
    ['plaintext', 'text'],
    ['plain', 'text']
]);

const SHELL_KEYWORDS = new Set([
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'do', 'done',
    'case', 'esac', 'in', 'function', 'select', 'time', 'coproc', 'declare',
    'local', 'readonly', 'export', 'source', 'alias', 'unalias'
]);

const COURSE_COMMANDS = new Set([
    'apt', 'apt-get', 'yum', 'dnf', 'rpm', 'dpkg',
    'awk', 'bash', 'cat', 'cd', 'chmod', 'chown', 'chgrp', 'column', 'cp',
    'curl', 'cut', 'date', 'echo', 'exit', 'find', 'grep', 'groups', 'head', 'history',
    'java', 'javac', 'jar', 'ls', 'mkdir', 'mv', 'nano', 'printf', 'command', 'cowsay', 'hollywood', 'pwd', 'rm',
    'rmdir', 'sed', 'sh', 'sort', 'ssh', 'sudo', 'systemctl', 'tail', 'tar', 'touch',
    'tree', 'uniq', 'unzip', 'vboxmanage', 'wc', 'wget', 'whoami', 'xargs',
    'ansible', 'ansible-config', 'ansible-galaxy', 'ansible-inventory',
    'ansible-playbook', 'aws', 'docker', 'docker-compose', 'helm', 'kubectl',
    'mvn', 'catalina.sh', 'startup.sh', 'shutdown.sh', 'jenkins'
]);

const FRAMEWORK_KEYWORDS = new Set([
    'build', 'config', 'container', 'context', 'create', 'delete', 'deploy',
    'deployment', 'describe', 'down', 'exec', 'get', 'images', 'info',
    'inspect', 'inventory', 'logs', 'login', 'logout', 'node', 'nodes',
    'playbook', 'ps', 'pull', 'push', 'restart', 'rm', 'run', 'scale',
    'secret', 'service', 'services', 'stack', 'start', 'stop', 'swarm',
    'system', 'tag', 'top', 'up', 'version', 'volume', 'volumes'
]);

const JAVA_KEYWORDS = new Set([
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
    'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
    'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
    'package', 'private', 'protected', 'public', 'return', 'short', 'static',
    'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while'
]);

const GROOVY_KEYWORDS = new Set([
    ...JAVA_KEYWORDS,
    'as', 'def', 'in', 'trait', 'pipeline', 'agent', 'stages', 'stage',
    'steps', 'environment', 'post', 'always', 'success', 'failure', 'when'
]);

const LITERALS = new Set(['true', 'false', 'null', 'yes', 'no', 'on', 'off']);

function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function token(className, value) {
    return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function canonicalLanguage(value) {
    const key = value?.trim().toLowerCase();
    if (!key) return null;
    if (LANGUAGE_META[key]) return key;
    return ALIASES.get(key) ?? null;
}

function explicitLanguage(pre, code) {
    const candidates = [
        pre.dataset.syntax,
        pre.dataset.language,
        ...[...code.classList]
            .filter(name => name.startsWith('language-'))
            .map(name => name.slice('language-'.length))
    ];
    return candidates.map(canonicalLanguage).find(Boolean) ?? null;
}

export function detectLanguage(source) {
    const text = source.trim();
    const lower = text.toLowerCase();

    if (!text) return 'text';
    if (/^[│ ]*(?:├──|└──)/m.test(text) || /^(?:\||`|[ ]{2,})?(?:--|\+-)|^\|--/m.test(text)) return 'tree';
    if (/^(from|run|copy|add|cmd|entrypoint|workdir|expose|env|arg|user|volume)\b/im.test(text)) {
        return 'dockerfile';
    }
    if (/^\s*apiversion\s*:/im.test(text) && /^\s*kind\s*:/im.test(text)) {
        return 'kubernetes';
    }
    if (/^\s*services\s*:/im.test(text) && /^\s*(?:image|build|ports|volumes)\s*:/im.test(text)) {
        return 'compose';
    }
    if (/^\s*(?:-\s*)?hosts\s*:/im.test(text) && /^\s*(?:tasks|roles|become)\s*:/im.test(text)) {
        return 'ansible';
    }
    if (/\bpipeline\s*\{/i.test(text) && /\bstages?\s*\{/i.test(text)) {
        return 'jenkins';
    }
    if (/^<\?xml\b/i.test(text) || /^<(?:project|server|context|tomcat-users)\b/i.test(text)) {
        if (/^<project\b/im.test(text)) return 'maven';
        if (/^<(?:server|context|tomcat-users)\b/im.test(text)) return 'tomcat';
        return 'xml';
    }
    if (/\b(?:public|private|protected)\s+(?:static\s+)?(?:class|interface|void)\b/.test(text)
        || /^\s*(?:package|import)\s+(?:java|javax)\./m.test(text)) {
        return 'java';
    }
    if (/^#!\s*\/(?:usr\/bin\/env\s+)?(?:ba)?sh\b/.test(text)) return 'bash';
    if (/^(?:if|for|while|until|case|function)\b[\s\S]*(?:then|do|\{)/m.test(text)) {
        return 'bash';
    }
    if (/^(?:sudo\s+)?(?:apt|apt-get|dpkg)\b/i.test(text)) return 'debian';
    if (/^(?:sudo\s+)?(?:yum|dnf|rpm)\b/i.test(text)) return 'redhat';
    if (/^(?:sudo\s+)?docker(?:-compose|\s+compose)\b/i.test(text)) return 'compose';
    if (/^(?:sudo\s+)?docker\s+(?:swarm|stack|service|node|secret)\b/i.test(text)) return 'swarm';
    if (/^(?:sudo\s+)?docker\b/i.test(text)) return 'docker';
    if (/^(?:sudo\s+)?(?:kubectl|helm)\b/i.test(text)) return 'kubernetes';
    if (/^(?:sudo\s+)?ansible(?:-playbook|-galaxy|-inventory|-config)?\b/i.test(text)) return 'ansible';
    if (/^aws\b/i.test(text)) return 'aws';
    if (/^mvn\b/i.test(text)) return 'maven';
    if (/^(?:javac?|jar)\b/i.test(text)) return 'java';
    if (/^(?:jenkins\b|java\s+-jar\s+jenkins\.war)/i.test(text)) return 'jenkins';
    if (/^(?:catalina\.sh|startup\.sh|shutdown\.sh)\b/i.test(text)
        || /\bsystemctl\s+(?:start|stop|restart|status)\s+tomcat\b/i.test(text)) {
        return 'tomcat';
    }
    if (/^(?:sudo\s+)?(?:awk|bash|cat|cd|chmod|chown|chgrp|column|command|cp|cowsay|curl|cut|date|echo|exit|find|grep|groups|head|history|hollywood|ls|mkdir|mv|nano|printf|pwd|rm|rmdir|sed|sh|sort|ssh|systemctl|tail|tar|touch|tree|uniq|unzip|vboxmanage|wc|wget|whoami|xargs)\b/i.test(text)
        || /^\.\/[A-Za-z0-9_.\/-]+/.test(text)
        || /(?:\|\||&&|\$\(|\$\{|\|\s*\w+|>\s*\S)/.test(text)) {
        return 'bash';
    }
    if ((text.match(/^\s*[\w.-]+\s*:/gm) ?? []).length >= 2) return 'yaml';
    if (/^\s*[\w.-]+\s*=\s*.+$/m.test(text)) return 'properties';
    if (lower.includes('def ') && lower.includes('{')) return 'groovy';
    return 'text';
}

function familyFor(language, source) {
    const family = LANGUAGE_META[language].family;
    if (family === 'adaptive-yaml') {
        return /^\s*(?:[\w.-]+|-\s+[\w.-]+)\s*:/m.test(source) ? 'yaml' : 'shell';
    }
    if (family === 'adaptive-xml') {
        return /^\s*</.test(source) ? 'xml' : 'shell';
    }
    if (family === 'adaptive-groovy') {
        return /\bpipeline\s*\{|\bstages?\s*\{/.test(source) ? 'groovy' : 'shell';
    }
    return family;
}

function highlightTree(source) {
    return source.split('\n').map(line => {
        const match = line.match(/^([|` +\-│├└─]*)(.*?)(\s+(?:<--|←).*)?$/u);
        if (!match) return escapeHtml(line);
        const [, branch, name, note = ''] = match;
        const nameClass = name.trimEnd().endsWith('/') ? 'type' : 'string';
        return `${token('operator', branch)}${token(nameClass, name)}${note ? token('comment', note) : ''}`;
    }).join('\n');
}

function highlightXml(source) {
    let result = '';
    let cursor = 0;
    const markup = /<!--[\s\S]*?-->|<\/?[A-Za-z_][^>]*>/g;

    for (const match of source.matchAll(markup)) {
        result += escapeHtml(source.slice(cursor, match.index));
        const value = match[0];
        if (value.startsWith('<!--')) {
            result += token('comment', value);
        } else {
            const parts = value.match(/^(<\/?)([\w:.-]+)([\s\S]*?)(\/?>)$/);
            if (!parts) {
                result += escapeHtml(value);
            } else {
                const [, open, tagName, attributes, close] = parts;
                result += token('operator', open);
                result += token('type', tagName);
                let attributeCursor = 0;
                const attributePattern = /([\w:.-]+)(\s*=\s*)(\"[^\"]*\"|'[^']*')/g;
                for (const attribute of attributes.matchAll(attributePattern)) {
                    result += escapeHtml(attributes.slice(attributeCursor, attribute.index));
                    result += token('property', attribute[1]);
                    result += token('operator', attribute[2]);
                    result += token('string', attribute[3]);
                    attributeCursor = attribute.index + attribute[0].length;
                }
                result += escapeHtml(attributes.slice(attributeCursor));
                result += token('operator', close);
            }
        }
        cursor = match.index + value.length;
    }
    return result + escapeHtml(source.slice(cursor));
}

function highlightProperties(source) {
    return source.split('\n').map(line => {
        if (/^\s*[#!]/.test(line)) return token('comment', line);
        const match = line.match(/^(\s*)([^:=\s]+)(\s*[:=]\s*)(.*)$/);
        if (!match) return escapeHtml(line);
        return `${escapeHtml(match[1])}${token('property', match[2])}${token('operator', match[3])}${token('string', match[4])}`;
    }).join('\n');
}

function readQuoted(source, start) {
    const quote = source[start];
    let index = start + 1;
    while (index < source.length) {
        if (source[index] === '\\') {
            index += 2;
            continue;
        }
        index += 1;
        if (source[index - 1] === quote) break;
    }
    return index;
}

function classifyWord(word, family, source, end, firstOnLine) {
    const lower = word.toLowerCase();
    const nextCharacter = source.slice(end).match(/^\s*(.)/)?.[1] ?? '';

    if (LITERALS.has(lower)) return 'literal';
    if (family === 'yaml' && nextCharacter === ':') return 'property';
    if (family === 'java' && JAVA_KEYWORDS.has(lower)) return 'keyword';
    if (family === 'groovy' && GROOVY_KEYWORDS.has(lower)) return 'keyword';
    if (family === 'dockerfile' && /^(from|run|copy|add|cmd|entrypoint|workdir|expose|env|arg|label|user|volume|shell|healthcheck|onbuild|stopsignal)$/i.test(word)) {
        return 'keyword';
    }
    if (SHELL_KEYWORDS.has(lower) || FRAMEWORK_KEYWORDS.has(lower)) return 'keyword';
    if (COURSE_COMMANDS.has(lower) || (family === 'shell' && firstOnLine)) return 'function';
    if ((family === 'java' || family === 'groovy') && /^[A-Z]/.test(word)) return 'type';
    if ((family === 'java' || family === 'groovy') && nextCharacter === '(') return 'function';
    return '';
}

function highlightGeneral(source, family) {
    let result = '';
    let index = 0;
    let firstOnLine = true;

    while (index < source.length) {
        const character = source[index];
        const previous = source[index - 1] ?? '\n';

        if (/\s/.test(character)) {
            let end = index + 1;
            while (end < source.length && /\s/.test(source[end])) end += 1;
            const whitespace = source.slice(index, end);
            result += whitespace;
            if (whitespace.includes('\n')) firstOnLine = true;
            index = end;
            continue;
        }

        if (character === '#' && source[index + 1] === '!' && firstOnLine) {
            const end = source.indexOf('\n', index);
            const boundary = end === -1 ? source.length : end;
            result += token('preprocessor', source.slice(index, boundary));
            index = boundary;
            firstOnLine = false;
            continue;
        }

        const hashComment = (family === 'shell' || family === 'yaml' || family === 'dockerfile')
            && character === '#'
            && (firstOnLine || /\s/.test(previous));
        const slashComment = (family === 'java' || family === 'groovy')
            && character === '/'
            && source[index + 1] === '/';
        if (hashComment || slashComment) {
            const end = source.indexOf('\n', index);
            const boundary = end === -1 ? source.length : end;
            result += token('comment', source.slice(index, boundary));
            index = boundary;
            firstOnLine = false;
            continue;
        }

        if ((family === 'java' || family === 'groovy')
            && character === '/'
            && source[index + 1] === '*') {
            const end = source.indexOf('*/', index + 2);
            const boundary = end === -1 ? source.length : end + 2;
            result += token('comment', source.slice(index, boundary));
            index = boundary;
            firstOnLine = false;
            continue;
        }

        if (character === '"' || character === "'" || (family === 'shell' && character === '`')) {
            const end = readQuoted(source, index);
            result += token('string', source.slice(index, end));
            index = end;
            firstOnLine = false;
            continue;
        }

        if (source.startsWith('{{', index)) {
            const close = source.indexOf('}}', index + 2);
            const end = close === -1 ? source.length : close + 2;
            result += token('variable', source.slice(index, end));
            index = end;
            firstOnLine = false;
            continue;
        }

        if (character === '$') {
            const match = source.slice(index).match(/^\$(?:\{[^}]+\}|\([^)]+\)|[A-Za-z_][\w]*|\d+|[@*#?$!-])/);
            if (match) {
                result += token('variable', match[0]);
                index += match[0].length;
                firstOnLine = false;
                continue;
            }
        }

        if (character === '@' && /[A-Za-z_]/.test(source[index + 1] ?? '')) {
            const match = source.slice(index).match(/^@[A-Za-z_][\w.]*/)[0];
            result += token('property-wrapper', match);
            index += match.length;
            firstOnLine = false;
            continue;
        }

        if (character === '-' && /[-A-Za-z0-9]/.test(source[index + 1] ?? '')) {
            const match = source.slice(index).match(/^--?[A-Za-z0-9][\w-]*/)?.[0];
            if (match) {
                result += token('property', match);
                index += match.length;
                firstOnLine = false;
                continue;
            }
        }

        if (/\d/.test(character)) {
            const match = source.slice(index).match(/^\d+(?:\.\d+)*/)[0];
            result += token('number', match);
            index += match.length;
            firstOnLine = false;
            continue;
        }

        if (/[A-Za-z_]/.test(character)) {
            const match = source.slice(index).match(/^[A-Za-z_][\w.-]*/)[0];
            const className = classifyWord(match, family, source, index + match.length, firstOnLine);
            result += className ? token(className, match) : escapeHtml(match);
            index += match.length;
            firstOnLine = false;
            continue;
        }

        if (/[|&;=+*%!<>?:()[\]{},]/.test(character)) {
            result += token('operator', character);
        } else {
            result += escapeHtml(character);
        }
        index += 1;
        firstOnLine = false;
    }
    return result;
}

export function highlightCode(source, language) {
    const canonical = canonicalLanguage(language) ?? 'text';
    const family = familyFor(canonical, source);
    if (family === 'text') return escapeHtml(source);
    if (family === 'tree') return highlightTree(source);
    if (family === 'xml') return highlightXml(source);
    if (family === 'properties') return highlightProperties(source);
    return highlightGeneral(source, family);
}

function hasOnlyAnnotationWrappers(code) {
    const elements = [...code.children];
    return elements.length > 0 && elements.every(element =>
        element.children.length === 0
        && ['hl-new', 'hl-edit', 'hl-focus'].some(className => element.classList.contains(className))
    );
}

export function initSyntaxHighlighting() {
    selectAll('code:not(pre code)').forEach(code => {
        code.textContent = code.textContent.trim();
    });

    selectAll('pre > code').forEach(code => {
        const pre = code.parentElement;
        if (!pre || pre.dataset.highlighted === 'true') return;

        const explicit = explicitLanguage(pre, code);
        const language = explicit ?? detectLanguage(code.textContent);
        const meta = LANGUAGE_META[language];

        // Preserve component-reference examples that already contain token
        // spans, while still allowing an explicit language label.
        if (code.children.length === 0) {
            code.innerHTML = highlightCode(code.textContent, language);
        } else if (hasOnlyAnnotationWrappers(code)) {
            [...code.children].forEach(line => {
                line.innerHTML = highlightCode(line.textContent, language);
            });
        }

        code.classList.add(`language-${language}`);
        pre.classList.add('code-block--highlighted');
        if (language === 'tree') pre.classList.add('directory-tree');
        pre.dataset.language = meta.label;
        pre.dataset.highlighted = 'true';
        if (!pre.hasAttribute('aria-label')) {
            pre.setAttribute('aria-label', `${meta.label} example`);
        }
    });
}



