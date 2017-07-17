'use strict';

import { getType, getValue } from '../utils';

/**
 * Returns list of LESS dependencies from given `@import` node
 * @param  {PropertyNode} node
 * @return {String[]}
 */
export default function getDependencies(node) {
	// A valid SCSS `@import` is one that includes one or more quoted string,
	// e.g. `@import: "foo", "bar"`. All other variations are prohibited
	return node.parsedValue.reduce((deps, value) => {
		// Each value must contain only one sub-token: a quoted string.
		// Everything else means CSS import
		if (value.size === 1 && getType(value.item(0)) === 'string') {
			// Get unquoted string value
			const url = getValue(value.item(0).item(0));
			if (!/^http:|\.css$/.test(url)) {
				// Shouldn’t be either external or explicit CSS import
				deps.push(url);
			}
		}
		return deps;
	}, []);
}
