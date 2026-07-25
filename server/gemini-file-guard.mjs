import { existsSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const workspace = realpathSync('/Users/youngyang/macagent/Gemini CLI');

function deny(reason) {
    process.stdout.write(JSON.stringify({ decision: 'deny', reason }));
    process.exit(0);
}

function allow() {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
    process.exit(0);
}

let input;
try {
    input = JSON.parse(await new Promise((resolveInput) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => resolveInput(data));
    }));
} catch {
    deny('Unable to validate the requested file operation.');
}

const toolName = input?.tool_name;
const filePath = input?.tool_input?.file_path;
if (!['write_file', 'replace'].includes(toolName) || typeof filePath !== 'string' || !filePath.trim()) {
    deny('Only validated write_file and replace operations are permitted.');
}

const requestedPath = isAbsolute(filePath) ? resolve(filePath) : resolve(workspace, filePath);
let resolvedParent;
try {
    resolvedParent = realpathSync(dirname(requestedPath));
} catch {
    deny('The destination directory does not exist.');
}

const parentRelative = relative(workspace, resolvedParent);
if (parentRelative.startsWith('..') || isAbsolute(parentRelative)) {
    deny('File operations are restricted to the Gemini CLI workspace.');
}

if (existsSync(requestedPath)) {
    let resolvedTarget;
    try {
        resolvedTarget = realpathSync(requestedPath);
    } catch {
        deny('Unable to validate the target file.');
    }
    const targetRelative = relative(workspace, resolvedTarget);
    if (targetRelative.startsWith('..') || isAbsolute(targetRelative)) {
        deny('Symbol links and paths outside the Gemini CLI workspace are not allowed.');
    }
}

if (toolName === 'write_file') {
    if (existsSync(requestedPath)) {
        deny('Existing files cannot be overwritten. Use replace for precise edits.');
    }
    if (typeof input.tool_input.content !== 'string' || !input.tool_input.content.trim()) {
        deny('New files must contain non-empty content.');
    }
}

if (toolName === 'replace') {
    if (!existsSync(requestedPath)) {
        deny('replace can only modify an existing file.');
    }
    if (typeof input.tool_input.old_string !== 'string' || !input.tool_input.old_string) {
        deny('A non-empty old_string is required for precise edits.');
    }
    if (typeof input.tool_input.new_string !== 'string' || !input.tool_input.new_string.trim()) {
        deny('Replacing content with an empty value is blocked to prevent accidental deletion.');
    }
    const removedCharacters = input.tool_input.old_string.length - input.tool_input.new_string.length;
    if (removedCharacters > 200 && input.tool_input.new_string.length < input.tool_input.old_string.length / 2) {
        deny('This edit removes too much content at once. Use smaller, precise replacements.');
    }
    if (input.tool_input.allow_multiple === true && removedCharacters > 0) {
        deny('Bulk replacements that shorten content are blocked to prevent accidental deletion.');
    }
}

allow();
