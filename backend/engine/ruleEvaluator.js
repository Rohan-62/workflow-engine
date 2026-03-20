/**
 * Rule Evaluator Engine
 * 
 * Evaluates condition strings against input data.
 * Supports: ==, !=, <, >, <=, >=, &&, ||
 * Functions: contains(), startsWith(), endsWith()
 * Special: DEFAULT (always true)
 */

function evaluateCondition(condition, data) {
    if (!condition || condition.trim() === '') {
        throw new Error('Empty condition');
    }

    if (condition.trim() === 'DEFAULT') {
        return true;
    }

    try {
        // Tokenize and evaluate
        const result = evaluate(condition, data);
        return Boolean(result);
    } catch (error) {
        throw new Error(`Failed to evaluate condition "${condition}": ${error.message}`);
    }
}

function evaluate(condition, data) {
    // Handle OR (||) - lowest precedence
    const orParts = splitByOperator(condition, '||');
    if (orParts.length > 1) {
        return orParts.some(part => evaluate(part.trim(), data));
    }

    // Handle AND (&&) - higher precedence
    const andParts = splitByOperator(condition, '&&');
    if (andParts.length > 1) {
        return andParts.every(part => evaluate(part.trim(), data));
    }

    // Handle parentheses
    const trimmed = condition.trim();
    if (trimmed.startsWith('(') && findMatchingParen(trimmed, 0) === trimmed.length - 1) {
        return evaluate(trimmed.slice(1, -1), data);
    }

    // Handle functions: contains(), startsWith(), endsWith()
    const funcMatch = trimmed.match(/^(contains|startsWith|endsWith)\s*\(\s*(.+?)\s*,\s*(.+?)\s*\)$/);
    if (funcMatch) {
        const [, funcName, fieldExpr, valueExpr] = funcMatch;
        const fieldValue = String(resolveValue(fieldExpr.trim(), data));
        const searchValue = String(resolveValue(valueExpr.trim(), data));

        switch (funcName) {
            case 'contains': return fieldValue.includes(searchValue);
            case 'startsWith': return fieldValue.startsWith(searchValue);
            case 'endsWith': return fieldValue.endsWith(searchValue);
        }
    }

    // Handle comparison operators
    const compOps = ['!=', '==', '<=', '>=', '<', '>'];
    for (const op of compOps) {
        const idx = findOperatorIndex(trimmed, op);
        if (idx !== -1) {
            const left = resolveValue(trimmed.slice(0, idx).trim(), data);
            const right = resolveValue(trimmed.slice(idx + op.length).trim(), data);
            return compare(left, right, op);
        }
    }

    // If nothing matched, try to resolve as a boolean value
    const val = resolveValue(trimmed, data);
    return Boolean(val);
}

// Split expression by operator, respecting parentheses and quotes
function splitByOperator(expr, operator) {
    const parts = [];
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let current = '';

    for (let i = 0; i < expr.length; i++) {
        const char = expr[i];

        if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
        if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
        if (char === '(' && !inSingleQuote && !inDoubleQuote) depth++;
        if (char === ')' && !inSingleQuote && !inDoubleQuote) depth--;

        if (depth === 0 && !inSingleQuote && !inDoubleQuote &&
            expr.slice(i, i + operator.length) === operator) {
            parts.push(current);
            current = '';
            i += operator.length - 1;
        } else {
            current += char;
        }
    }
    parts.push(current);
    return parts;
}

// Find matching closing parenthesis
function findMatchingParen(str, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
        if (str[i] === '(') depth++;
        if (str[i] === ')') {
            depth--;
            if (depth === 0) return i;
        }
    }
    return -1;
}

// Find operator index, respecting quotes and parentheses
function findOperatorIndex(expr, operator) {
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < expr.length - operator.length + 1; i++) {
        const char = expr[i];

        if (char === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
        if (char === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
        if (char === '(' && !inSingleQuote && !inDoubleQuote) depth++;
        if (char === ')' && !inSingleQuote && !inDoubleQuote) depth--;

        if (depth === 0 && !inSingleQuote && !inDoubleQuote) {
            // Avoid matching != when looking for ==, or <= when looking for <
            if (operator === '==' && expr.slice(i, i + 2) === '==' && expr[i - 1] !== '!' && expr[i - 1] !== '<' && expr[i - 1] !== '>') {
                return i;
            }
            if (operator === '<' && expr[i] === '<' && expr[i + 1] !== '=') {
                return i;
            }
            if (operator === '>' && expr[i] === '>' && expr[i + 1] !== '=') {
                return i;
            }
            if (operator !== '==' && operator !== '<' && operator !== '>' && expr.slice(i, i + operator.length) === operator) {
                return i;
            }
        }
    }
    return -1;
}

// Resolve a value - could be a literal, string, number, or data field reference
function resolveValue(expr, data) {
    const trimmed = expr.trim();

    // String literal (single or double quotes)
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
    }

    // Number
    if (!isNaN(trimmed) && trimmed !== '') {
        return Number(trimmed);
    }

    // Boolean literals
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;

    // Field reference from data (supports dot notation)
    const parts = trimmed.split('.');
    let value = data;
    for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        value = value[part];
    }
    return value;
}

// Compare two values with an operator
function compare(left, right, operator) {
    switch (operator) {
        case '==': return left == right;
        case '!=': return left != right;
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        default: throw new Error(`Unknown operator: ${operator}`);
    }
}

module.exports = { evaluateCondition };
