'use strict';

import parse from '@emmetio/css-parser';
import getDependencies from './dependencies';
import Scope from '../scope';
import ResolvedStylesheet from '../resolved-stylesheet';
import { walkNode, uniqueFilter } from '../utils';

import rule from './rule';
import property from './property';
import extend from './extend';
import importRule from './import';
import atRule from '../scss/at-rule';
import mediaRule from '../scss/media';

const resolvers = [mediaRule, atRule, rule, importRule, property];

/**
 * Creates a SCSS stylesheet from given parsed stylesheet tree
 */
export default class LESSStylesheet {
	constructor(source, options) {
		this.syntax = 'less';
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

		this.jsInterpreter = options && options.jsInterpreter || jsInterpreter;

		// Collect stylesheet dependencies
		let deps = [];
		walkNode(this.model, node => {
			if (node.type === 'property' && node.name === '@import') {
				deps = deps.concat(getDependencies(node));
			}
		});

		this.dependencies = deps.filter(uniqueFilter);
	}

	/**
	 * Transforms current stylesheet into plain CSS
	 * @param  {Object} dependencies Resolved dependencies: key is a dependency
	 *                               url as defined in `.dependencies` property
	 *                               and value is a resolved SCSSStylesheet object
	 * @return {ResolvedNode}
	 */
	transform(dependencies) {
		const initialScope = collectVariables(this.model);
		Object.assign(initialScope.variables, {
			'true': true,
			'false': false
		});

		this.scope = new Scope(Object.assign(initialScope, {
			dependencies,
			jsInterpreter: this.jsInterpreter,
			important: false,

			mixins: {},
			mixinRefs: {}
		}));

		this.scope.root = new ResolvedStylesheet(this.tree, this.scope);
		this.scope.parent = this.scope.root;

		// Run transform
		next(this.model.children, this.scope);

		return this.css = extend(this.scope.root);
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

/**
 * A continuation function that resolves given node or node set
 * @param  {Node|Node[]} node
 * @param  {Scope}       scope
 */
function next(node, scope) {
	if (Array.isArray(node)) {
		for (let i = 0; i < node.length; i++) {
			next(node[i], scope);
		}
	} else {
		resolve(node, scope.clone(collectVariables(node)), next);
	}
}

/**
 * Default JS interpreter, used to evaluate expressions in stylesheet
 * @param {String} code 
 * @param {Object} ctx 
 */
function jsInterpreter(code) {
	const fn = new Function('return ' + code);
	return fn.call(null);
}

/**
 * Collects all variables from given node. In LESS, all variables are lazy-evaluated
 * so they should be collected before entering and evaluating any node
 * @param {Node} node 
 */
function collectVariables(node) {
	const variables = {}, variableRefs = {};
	node.children.forEach(child => {
		if (isVariable(child)) {
			variables[child.name] = child.value;
			variableRefs[child.name] = child;
		}
	});

	return { variables, variableRefs };
}

function isVariable(node) {
	return node.type === 'property' && node.name !== '@import' && node.parsedName.type === 'at-keyword';
}
