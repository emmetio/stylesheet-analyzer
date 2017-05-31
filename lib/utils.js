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

export function uniqueFilter(value, i, arr) {
	return arr.indexOf(value) === i;
}
