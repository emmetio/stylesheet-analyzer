'use strict';

import parse from '@emmetio/css-parser';
import getDependencies from './dependencies';
import Scope from '../scope';
import ResolvedStylesheet from '../resolved-stylesheet';
import { walkNode, uniqueFilter } from '../utils';

// Resolvers
import atRootRule from './at-root';
import atRule from './at-rule';
import eachRule from './each';
import extendRule from './extend';
import forRule from './for';
import ifRule from './if';
import whileRule from './while';
import functionRule from './function';
import mediaRule from './media';
import mixin from './mixin';
import importRule from './import';
import propertySet from './property-set';
import property from './property';
import rule from './rule';
import variable from './variable';

const resolvers = [
	atRootRule, eachRule, forRule, whileRule, ifRule, functionRule,
	mediaRule, importRule, mixin, atRule, propertySet, variable, property, rule
];

/**
 * Creates a SCSS stylesheet from given parsed stylesheet tree
 */
export default class SCSSStylesheet {
	constructor(source) {
		this.syntax = 'scss';
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

		// A set of `@extend` found during transform
		const extend = new Map();

		/**
		 * A continuation function that resolves given node or node set
		 * @param  {Node|Node[]} node
		 * @param  {Scope}       scope
		 */
		const next = (node, scope) => {
			if (Array.isArray(node)) {
				for (let i = 0; i < node.length; i++) {
					next(node[i], scope);
				}
			} else if (node.type === 'property' && node.name === '@extend') {
				// Postpone @extend rule processing until final stylesheet is generated
				extend.set(node, scope.parent);
			} else {
				resolve(node, scope, next);
			}
		};

		this.scope.root = new ResolvedStylesheet(this.tree, this.scope);
		this.scope.parent = this.scope.root;

		// Run transform
		next(this.model.children, this.scope);

		// Apply @extend’s
		extend.forEach((rule, node) => extendRule(node, this.scope, rule));

		return this.css = this.scope.root;
	}
}

/**
 * Applies matched resolvers for given node
 * @param  {Node} node
 * @param  {Scope} scope
 * @param  {Function} next
 */
function resolve(node, scope, next) {
	for (let i = 0, il = resolvers.length; i < il; i++) {
		if (resolvers[i](node, scope, next) !== false) {
			break;
		}
	}
}
