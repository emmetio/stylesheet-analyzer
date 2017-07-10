'use strict';

import parse from '@emmetio/css-parser';
import Scope from '../scope';
import ResolvedStylesheet from '../resolved-stylesheet';
import { walkNode, uniqueFilter, getDependencies } from '../utils';

// Resolvers
import atRootRule from './at-root';
import eachRule from './each';
import forRule from './for';
import ifRule from './if';
import whileRule from './while';
import functionRule from './function';
import mediaRule from './media';
import importRule from './import';
import propertySet from './property-set';
import property from './property';
import rule from './rule';
import variable from './variable';

const resolvers = [
	atRootRule, eachRule, forRule, whileRule, ifRule, functionRule,
	mediaRule, importRule, propertySet, variable, property, rule
];

/**
 * Creates a SCSS stylesheet from given parsed stylesheet tree
 */
export default class SCSSStylesheet {
	constructor(source) {
		this.source = source;

		/**
		 * Stylesheet top-level scope collected during transform
		 * @type {Scope}
		 */
		this.scope = null;

		/**
		 * Resolved stylesheet
		 * @type {ResolvedStylesheet}
		 */
		this.css = null;

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
		return getDependencies(node);
	}

	/**
	 * Transforms current stylesheet into plain CSS
	 * @param  {Object} dependencies Resolved dependencies: key is a dependency
	 *                               url as defined in `.dependencies` property
	 *                               and value is a resolved SCSSStylesheet object
	 * @return {ResolvedNode}
	 */
	transform(dependencies) {
		this.scope = new Scope({
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

		this.scope.root = new ResolvedStylesheet(this.tree, this.scope);
		this.scope.parent = this.scope.root;

		// Run transform
		next(this.model.children, this.scope);

		return this.css = this.scope.root;
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
		resolve(node, scope, next);
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
