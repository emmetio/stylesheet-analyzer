'use strict';

import { isQuote, eatPair } from '@emmetio/stream-reader-utils';
import expression, { Context, eval as _eval } from 'livestyle-css-expression';

const HASH   = 35;  // #
const LBRACE = 123; // {
const RBRACE = 125; // {

/**
 * Interpolates #{...} fragments in given token.
 * @param  {Token} token   Parsed CSS token to interpolate
 * @param  {Object} scope  Variable scope
 * @return {String}
 */
export function interpolate(token, scope) {
	const ctx = createContext(scope);

	return findInterpolationTokens(token).reduceRight((str, t) => {
		let expr = t.valueOf();
		const result = safeToken(expr, ctx);

		if (result != null) {
			// Check for edge case: result is a string and token
			// is inside quoted string: unquote result
			expr = t.property('quoted') && result.quote
				? result.value
				: result.valueOf();
		}

		return str.slice(0, t.start) + expr + str.slice(t.end);
	});
}

/**
 * Evaluates given expression with passed variables context
 * @param  {Token}  expr  Token with expression to evaluate
 * @param  {Object} scope Variables scope
 * @return {String}       Result of expression evaluation
 */
export function evaluate(expr, scope) {
	const ctx = createContext(scope);
	const result = safeExpression(interpolate(expr, ctx), ctx);

	return result === null ? expr : result;
}

/**
 * Finds all interpolation tokens in given token
 * @param  {Token} token
 * @return {Token[]} List of interpolation tokens
 */
export function findInterpolationTokens(token) {
	const stream = token.limit();
	const tokens = [], quotes = [];
	let start, t, ch;

	while (!stream.eof()) {
		start = stream.pos;
		// We should check if interpolation token is inside quoted string:
		// it affects how result is outputted
		if (isQuote(stream.peek())) {
			ch = stream.next();
			if (quotes[quotes.length - 1] === ch) {
				quotes.pop();
			} else {
				quotes.push(ch);
			}
		} else if (stream.eat(HASH)) {
			if (eatPair(stream, LBRACE, RBRACE)) {
				t = token.clone(start, stream.pos);
				t.property('quoted', !!quotes.length);
				tokens.push(t);
			}
		} else {
			stream.next();
		}
	}

	return tokens;
};

function createContext(scope) {
	return Context.create(scope);
}

function safeToken(expr, ctx) {
	try {
		return _eval(expr, createContext(ctx));
	} catch (err) {}
}

function safeExpression(expr, ctx) {
	try {
		return expression(expr, createContext(ctx));
	} catch (err) {}
}
