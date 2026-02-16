/**
 * Calculation Engine — Safe arithmetic evaluator for calculated/velocity fields
 *
 * Parses expressions like "Running Distance / (Running Time / 60)"
 * Uses a recursive-descent parser — NO eval().
 *
 * Supported: +, -, *, /, parentheses, field references, numeric literals
 */

/**
 * Evaluate a calculation expression given a map of field values
 *
 * @param {string} expression - The calculation formula (e.g., "Running Distance / Running Time")
 * @param {Object} fieldValues - Map of field name -> numeric value
 * @returns {number|null} The computed result, or null if any dependency is missing
 */
export function evaluate(expression, fieldValues) {
    if (!expression || typeof expression !== 'string') return null;

    try {
        const tokens = tokenize(expression, fieldValues);
        const parser = new Parser(tokens);
        const result = parser.parseExpression();

        if (!parser.isAtEnd()) {
            console.warn('Calc engine: unexpected tokens after expression');
            return null;
        }

        if (!isFinite(result)) return null;
        return result;
    } catch (err) {
        console.warn('Calc engine error:', err.message);
        return null;
    }
}

/**
 * Get the field names referenced in a calculation expression
 */
export function getDependencies(expression, allFieldNames) {
    if (!expression) return [];
    return allFieldNames.filter(name => expression.includes(name));
}

// ============ TOKENIZER ============

const TOKEN_TYPES = {
    NUMBER: 'NUMBER',
    OPERATOR: 'OPERATOR',
    PAREN_OPEN: 'PAREN_OPEN',
    PAREN_CLOSE: 'PAREN_CLOSE',
    FIELD_REF: 'FIELD_REF',
};

/**
 * Tokenize an expression string
 * Field references are matched against known field names (longest match first)
 */
function tokenize(expression, fieldValues) {
    const tokens = [];
    let pos = 0;
    const str = expression.trim();

    // Sort field names by length (longest first) for greedy matching
    const fieldNames = Object.keys(fieldValues).sort((a, b) => b.length - a.length);

    while (pos < str.length) {
        // Skip whitespace
        if (/\s/.test(str[pos])) {
            pos++;
            continue;
        }

        // Parentheses
        if (str[pos] === '(') {
            tokens.push({ type: TOKEN_TYPES.PAREN_OPEN });
            pos++;
            continue;
        }

        if (str[pos] === ')') {
            tokens.push({ type: TOKEN_TYPES.PAREN_CLOSE });
            pos++;
            continue;
        }

        // Operators
        if ('+-*/'.includes(str[pos])) {
            tokens.push({ type: TOKEN_TYPES.OPERATOR, value: str[pos] });
            pos++;
            continue;
        }

        // Number literal
        const numMatch = str.slice(pos).match(/^(\d+\.?\d*)/);
        if (numMatch) {
            tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(numMatch[1]) });
            pos += numMatch[1].length;
            continue;
        }

        // Field reference (match longest field name first)
        let matched = false;
        for (const fieldName of fieldNames) {
            if (str.slice(pos).startsWith(fieldName)) {
                const val = fieldValues[fieldName];
                if (val === null || val === undefined) {
                    // Missing dependency — the whole expression is invalid
                    return null;
                }
                tokens.push({ type: TOKEN_TYPES.NUMBER, value: parseFloat(val) });
                pos += fieldName.length;
                matched = true;
                break;
            }
        }

        if (!matched) {
            throw new Error(`Unexpected character at position ${pos}: "${str[pos]}"`);
        }
    }

    return tokens;
}

// ============ PARSER ============

class Parser {
    constructor(tokens) {
        if (tokens === null) {
            // Missing dependency in tokenizer
            this.tokens = [];
            this.pos = 0;
            this.missingDep = true;
        } else {
            this.tokens = tokens;
            this.pos = 0;
            this.missingDep = false;
        }
    }

    peek() {
        return this.tokens[this.pos] || null;
    }

    consume() {
        return this.tokens[this.pos++];
    }

    isAtEnd() {
        return this.pos >= this.tokens.length;
    }

    /**
     * Expression: Term (('+' | '-') Term)*
     */
    parseExpression() {
        if (this.missingDep) return null;

        let left = this.parseTerm();

        while (!this.isAtEnd()) {
            const token = this.peek();
            if (token.type === TOKEN_TYPES.OPERATOR && (token.value === '+' || token.value === '-')) {
                this.consume();
                const right = this.parseTerm();
                if (left === null || right === null) return null;
                left = token.value === '+' ? left + right : left - right;
            } else {
                break;
            }
        }

        return left;
    }

    /**
     * Term: Factor (('*' | '/') Factor)*
     */
    parseTerm() {
        let left = this.parseFactor();

        while (!this.isAtEnd()) {
            const token = this.peek();
            if (token.type === TOKEN_TYPES.OPERATOR && (token.value === '*' || token.value === '/')) {
                this.consume();
                const right = this.parseFactor();
                if (left === null || right === null) return null;
                if (token.value === '/') {
                    if (right === 0) return null; // Division by zero
                    left = left / right;
                } else {
                    left = left * right;
                }
            } else {
                break;
            }
        }

        return left;
    }

    /**
     * Factor: NUMBER | '(' Expression ')'
     */
    parseFactor() {
        const token = this.peek();

        if (!token) {
            throw new Error('Unexpected end of expression');
        }

        if (token.type === TOKEN_TYPES.NUMBER) {
            this.consume();
            return token.value;
        }

        if (token.type === TOKEN_TYPES.PAREN_OPEN) {
            this.consume(); // '('
            const result = this.parseExpression();
            const closing = this.consume();
            if (!closing || closing.type !== TOKEN_TYPES.PAREN_CLOSE) {
                throw new Error('Missing closing parenthesis');
            }
            return result;
        }

        // Handle unary minus
        if (token.type === TOKEN_TYPES.OPERATOR && token.value === '-') {
            this.consume();
            const factor = this.parseFactor();
            return factor === null ? null : -factor;
        }

        throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
    }
}
