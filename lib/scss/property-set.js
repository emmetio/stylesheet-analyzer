'use strict';

import resolveProperty from './property';

/**
 * A property set resolver for SCSS.
 * @example
 * font: {
 *   family: Arial;
 *   size: 10px;
 * }
 *
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 * @return {Boolean}
 */
export default function(node, scope, next) {
	if (node.type === 'rule' && getBetween(node) === ':') {
		next(node.children, scope.clone({
			variables: { '%property-prefix': node.selector + '-' }
		}));
	} else {
		return false;
	}
}

function getBetween(node) {
	const start = node.selectorToken;
	const end = node.contentStartToken;

	if (start && end) {
		return node.stream.substring(start.end, end.start).trim();
	}
}
