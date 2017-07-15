'use strict';

import { interpolation } from '@emmetio/css-parser';
import StreamReader from '@emmetio/stream-reader';
import { isQuote } from '@emmetio/stream-reader-utils';
import expression, { Context, eval as _eval } from 'livestyle-css-expression';

/**
 * Interpolates #{...} fragments in given string.
 * @param  {String|Token} source String to interpolate
 * @param  {Object} scope  Variable scope
 * @return {String}
 */
export function interpolate(source, scope) {
	const ctx = createContext(scope);
	const stream = new StreamReader(source.valueOf());
	let output = '', offset = stream.start, precedingQuote = false;
	let token;

	while (!stream.eof()) {
		if (token = interpolation(stream)) {
			output += stream.substring(offset, token.start) 
				+ _interpolate(token, ctx, precedingQuote);

			offset = token.end;
			precedingQuote = false;
		} else {
			precedingQuote = isQuote(stream.next());
		}
	}

	return output + stream.substring(offset);
}

function _interpolate(token, ctx, hasPrecedingQuote) {
	let expr = token.slice().valueOf();
	const result = safeToken(expr, ctx);


	if (result != null) {
		// Check for edge case: result is a string and token
		// is inside quoted string: unquote result
		expr = hasPrecedingQuote && result.quote
			? result.value
			: result.valueOf();
	}

	return expr;
}

/**
 * Evaluates given expression with passed variables context
 * @param  {String} expr  Expression to evaluate
 * @param  {Object} scope Variables scope
 * @return {String} Result of expression evaluation
 */
export function evaluate(expr, scope) {
	const ctx = createContext(scope);
	const result = safeExpression(interpolate(expr.valueOf(), ctx), ctx);

	return result == null ? expr : result;
}

/**
 * Check if given expression returns truthy value
 * @param  {String|Token} expr  Expression to evaluate
 * @param  {Object} scope Variables scope
 * @return {Boolean}
 */
export function isTruthy(expr, scope) {
	if (!expr) {
		return false;
	}

	const ctx = createContext(scope);
	return isTruthyValue(safeExpression(interpolate(expr, ctx), ctx));
}

/**
 * Check if given (evaluated) value is truthy for SCSS
 * @param  {*}  value
 * @return {Boolean}
 */
export function isTruthyValue(value) {
	if (typeof value === 'boolean') {
		return value;
	}

	return value && value !== 'false' && value !== 'null';
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
