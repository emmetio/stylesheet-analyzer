'use strict';

/**
 * Walks on each child of given node and runs `fn` function on it. Immediately
 * stops walking if `fn` returns `false`
 * @param  {Function} fn
 */
export function walkNode(node, fn) {
	const stack = node.children.slice(0);
	let ctx, i;

	while (ctx = stack.shift()) {
		if (fn(ctx) === false) {
			return;
		}

		i = ctx.children.length;
		while (i--) {
			stack.unshift(ctx.children[i]);
		}
	}
}

/**
 * Walks on each nested token of given one and invokes `fn` function on it
 * @param  {Token}   token Parsed CSS token
 * @param  {Function} fn
 */
export function walkTokens(token, fn) {
	const stack = [];

	let i = token.size;
	while (i--) {
		stack.unshift(token.item(i));
	}

	let ctx;
	while (ctx = stack.shift()) {
		if (fn(ctx) === false) {
			return;
		}

		i = ctx.size;
		while (i--) {
			stack.unshift(ctx.item(i));
		}
	}
}

/**
 * Check if given node is allowed to contain nested rules
 * @param  {Node|ResolvedNode}  node
 * @return {Boolean}
 */
export function isValidRuleForNesting(node) {
	return !node.parent || node.type === 'at-rule';
}

/**
 * Returns valid parent rule where nested rules can be added
 * @param  {Node|ResolvedNode}  node
 * @return {Node|ResolvedNode}
 */
export function getNestingParent(node) {
	while (!isValidRuleForNesting(node)) {
		node = node.parent;
	}

	return node;
}

/**
 * Returns first index of non-space inner token from given one
 * @param  {Token} token
 * @param  {Number} [from]
 * @return {Number}
 */
export function skipSpace(token, from) {
	from = from || 0;
	while (from < token.size) {
		if (token.item(from).type !== 'whitespace') {
			break;
		}

		from++;
	}

	return from;
}

export function uniqueFilter(value, i, arr) {
	return arr.indexOf(value) === i;
}

export function getValue(token) {
	return token && token.valueOf();
}

export function getType(token) {
	return token && token.type;
}
