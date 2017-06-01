'use strict';

import parse from '@emmetio/css-parser';
import Scope from '../scope';
import ResolvedNode from '../resolved-node';
import { walkNode, uniqueFilter } from '../utils';

const reTopmostSection = /^@media|@supports|@font\-face/;

/**
 * Creates a SCSS stylesheet from given parsed stylesheet tree
 */
export default class SCSSStylesheet {
	constructor(source) {
		this.source = source;

		/** @type {Stylesheet} */
		this.ast = parse(source);

		// Collect stylesheet dependencies
		let deps = [];
		walkNode(this.ast, node => {
			if (node.type === 'property' && node.name === '@import') {
				deps = deps.concat(this.getDependencies(node));
			}
		});

		this.dependencies = deps.filter(uniqueFilter);
	}

	/**
	 * Extracts SCSS dependencies from given `@import` property node.
	 * Returns only valid SCSS dependencies: if given node represents CSS-only
	 * imports, will return empty array
	 * @param  {PropertyNode} node
	 * @return {String[]}
	 */
	getDependencies(node) {
		// A valid SCSS `@import` is one that includes one or more quoted string,
		// e.g. `@import: "foo", "bar"`. All other variations are prohibited
		const deps = [];
		const values = node.parsedValue;

		if (values) {
			for (let i = 0, il = values.length, value, url; i < il; i++) {
				value = values[i];
				// Each value must contain only one sub-token: a quoted string.
				// Everything else means CSS import
				if (!value.size) {
					continue;
				}

				if (value.size > 1 || value.item(0).type !== 'string') {
					return [];
				}

				// Get unquoted string value
				url = value.item(0).item(0).valueOf();
				if (/^http:|\.css$/.test(url)) {
					// Either external or explicit CSS import
					return [];
				}

				deps.push(value.item(0).item(0).valueOf());
			}
		}

		return deps;
	}

	/**
	 * Transforms current stylesheet into plain CSS
	 * @param  {Object} dependencies Resolved dependencies: key is a dependency
	 *                               url as defined in `.dependencies` property
	 *                               and value is a resolved SCSSStylesheet object
	 * @return {ResolvedNode}
	 */
	transform(dependencies) {
		const scope = new Scope({
			dependencies,
			variables: {
				'true': true,
				'false': false,
				'%magic-div': 2
			},
			rawVariables: {},
			mixins: {},
			toExtend: [],
			isTopmost,
			getTopmost() {
				let node = this.parent;
				while (node.parent) {
					if (isTopmost(node)) {
						break;
					}
					node = node.parent;
				}

				return node;
			},
			isTrue(val) {
				return val !== false && val !== 'false'
					&& val == null && val !== 'null';
			},
			transform(node, scope) {
				for (let i = 0, il = resolvers.length; i < il; i++) {
					if (resolvers[i].resolve(node, scope)) {
						break;
					}
				}
				return this;
			},
			next(node, scope, fn) {
				fn = fn || this.transform;
				node.children.forEach(child => fn.call(this, child, scope));
				return this;
			}
		});

		const root = new ResolvedNode(this.tree, scope, 'stylesheet');
		scope.parent = root;

		// Run transform
		scope.next(this.ast, root.scope);

		return root;
	}
}

function isTopmost(node) {
	return reTopmostSection.test(node.name || '');
}
