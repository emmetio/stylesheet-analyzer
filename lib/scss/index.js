'use strict';

import parse from '@emmetio/css-parser';
import Scope from '../scope';
import ResolvedStylesheet from '../resolved-stylesheet';
import { walkNode, uniqueFilter } from '../utils';

// Resolvers
import each from './each';
import atRoot from './at-root';
import media from './media';
import property from './property';
import rule from './rule';
import variable from './variable';

const resolvers = [each, atRoot, media, variable, property, rule];

/**
 * Creates a SCSS stylesheet from given parsed stylesheet tree
 */
export default class SCSSStylesheet {
	constructor(source) {
		this.source = source;

		/** @type {Stylesheet} */
		this.model = parse(source);
		this.model.stylesheet = this;

		// Collect stylesheet dependencies
		let deps = [];
		walkNode(this.model, node => {
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
			mixins: {},

			// References to stylesheet nodes that generated variables and mixins
			variableRefs: {},
			mixinRefs: {},

			toExtend: []
		});

		scope.root = new ResolvedStylesheet(this.tree, scope);
		scope.parent = scope.root;

		// Run transform
		next(this.model.children, scope);

		return scope.root;
	}
}

/**
 * A continuation function that resolves given node or node set
 * @param  {Node|Node[]} node
 * @param  {Scope}       scope
 * @return {Function}
 */
function next(node, scope) {
	if (Array.isArray(node)) {
		for (var i = 0; i < node.length; i++) {
			resolve(node[i], scope, next);
		}
	} else {
		resolve(node[i], scope, next);
	}
}

/**
 * Applies matched resolvers for given node
 * @param  {Node} node
 * @param  {Scope} scope
 */
function resolve(node, scope, next) {
	for (let i = 0, il = resolvers.length; i < il; i++) {
		if (resolvers[i](node, scope, next) !== false) {
			break;
		}
	}
}
