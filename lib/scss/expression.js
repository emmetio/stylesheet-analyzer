'use strict';

import parse from '@emmetio/css-parser';
import expression, { Context, eval as _eval } from 'livestyle-css-expression';

/**
 * Interpolates #{...} fragments in given token.
 * @param  {String|Token} token   String to interpolate
 * @param  {Object} scope Variable scope
 * @return {String}
 */
export function interpolate(token, scope) {
	const ctx = createContext(scope);
	const offset = typeof token === 'string' ? 0 : token.start;

	return findInterpolationTokens(token).reduceRight((s, t) => {
		let expr = t.slice().valueOf();

		const result = safeToken(expr, ctx);

		if (result != null) {
			// Check for edge case: result is a string and token
			// is inside quoted string: unquote result
			const ch = s[t.start - offset - 1];
			expr = (ch === "'" || ch === '"') && result.quote
				? result.value
				: result.valueOf();
		}

		return s.slice(0, t.start - offset) + expr + s.slice(t.end - offset);
	}, token.valueOf());
}

/**
 * Evaluates given expression with passed variables context
 * @param  {String} expr  Expression to evaluate
 * @param  {Object} scope Variables scope
 * @return {String}       Result of expression evaluation
 */
export function evaluate(expr, scope) {
	const ctx = createContext(scope);
	const result = safeExpression(interpolate(expr, ctx), ctx);

	return result === null ? expr : result;
}

/**
 * Finds all interpolation tokens inside given parsed token or string
 * @param  {String|Token} token
 * @return {Token[]} List of interpolation tokens
 */
export function findInterpolationTokens(token) {
	if (typeof token === 'string') {
		const node = parse(token).firstChild;
		token = node && node.parsedName;
	}

	const result = [];
	let stack = [ token ], t;
	while (t = stack.shift()) {
		if (t.type === 'interpolation') {
			result.push(t);
		} else if (t.size) {
			stack = t.items.concat(stack);
		}
	}

	return result;
}

function createContext(scope) {
	return Context.create(scope);
}

function safeToken(expr, ctx) {
	try {
		return _eval(expr.valueOf(), createContext(ctx));
	} catch (err) {}
}

function safeExpression(expr, ctx) {
	try {
		return expression(expr.valueOf(), createContext(ctx));
	} catch (err) {}
}
