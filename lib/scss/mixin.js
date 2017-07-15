'use strict';

import parseArguments from './arguments';
import { getType, getValue } from '../utils';

const MIXIN_CONTENT = '%mixin-content';

/**
 * Resolves SASS mixin definition and invocation
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 * @return {Boolean}
 */
export default function resolveMixin(node, scope, next) {
	if (node.type === 'at-rule' && node.name === 'mixin') {
		handleMixin(node, scope, next);
	} else if ( (node.type === 'property' && node.name === '@include')
		|| (node.type === 'at-rule' && node.name === 'include')
	) {
		handleInclude(node, scope, next);
	} else if (node.type === 'property' && node.name === '@content') {
		handleContent(node, scope, next);
	} else {
		return false;
	}
}

/**
 * Handle @mixin rule (mixin definition)
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 */
function handleMixin(node, scope) {
	if (node.parsedExpression.length) {
		let mixin;
		const name = node.parsedExpression[0].item(0);

		if (getType(name) === 'ident') {
			// Mixin without arguments
			mixin = new Mixin(node, scope, getValue(name));
		} else if (getType(name) === 'function') {
			// Mixin with arguments
			mixin = new Mixin(node, scope, getValue(name.item(0)), parseArguments(name));
		}

		if (mixin) {
			scope.mixins[mixin.name] = mixin;
			scope.mixinRefs[mixin.name] = node;
		}
	}
}

/**
 * Handle @include rule (mixin invocation)
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 */
function handleInclude(node, scope, next) {
	const value = node.type === 'property' ? node.parsedValue[0] : node.parsedExpression[0];
	if (value) {
		const mixinCall = value.item(0);
		let mixin;

		if (getType(mixinCall) === 'ident') {
			mixin = new Mixin(node, scope, getValue(mixinCall));
		} else if (getType(mixinCall) === 'function') {
			mixin = new Mixin(node, scope, getValue(mixinCall.item(0)), parseArguments(mixinCall));
		}

		if (!mixin) {
			return console.warn('No valid mixin call');
		}

		const mixinDef = scope.mixins[mixin.name];

		if (!mixinDef) {
			return console.warn('No mixin with name "%s"', mixin.name);
		}

		// if (mixin.name === 'clearfix') {
		// 	console.log('output mixin', mixin.name, scope.mixinRefs[mixin.name].children);
		// }

		next(scope.mixinRefs[mixin.name].children, createScope(scope, mixinDef, mixin));
	}
}

/**
 * Handle @content rule (mixin content bypass)
 * @param  {Node}     node
 * @param  {Scope}    scope
 * @param  {Function} next
 */
function handleContent(node, scope, next) {
	const content = scope.variables[MIXIN_CONTENT];
	if (content) {
		next(content.node.children, content.scope.clone({
			parent: scope.parent
		}));
	}
}

class Mixin {
	constructor(node, scope, name, args) {
		this.node = node;
		this.scope = scope;
		this.name = name;
		this.args = args;
	}
}

/**
 * Creates mixin invocation scope for given mixin definition and invocation
 * @param  {Scope} scope
 * @param  {Mixin} mx1 Mixin definition
 * @param  {Mixin} mx2 Mixin invocation
 * @return {Argument}
 */
function createScope(scope, mx1, mx2) {
	const variables = {}, variableRefs = {};
	const invokeArgs = mx2.args || [];
	const lookup = invokeArgs.reduce((out, arg) => {
		if (arg.name) {
			out[arg.name] = arg;
		}
		return out;
	}, {});

	if (mx1.args) {
		mx1.args.forEach((arg, i) => {
			if (arg.rest) {
				variables[arg.name] = invokeArgs.slice(i).map(a => stringify(a.value)).join(', ');
				variableRefs[arg.name] = mx2.node;
			} else {
				const valueArg = lookup[arg.name] || invokeArgs[i] || arg;
				variables[arg.name] = getValue(valueArg.value);
				variableRefs[arg.name] = valueArg.node;
			}
		});
	}

	// Pass @content context into mixin invocation
	variables[MIXIN_CONTENT] = {
		node: mx2.node,
		scope: scope.clone({ variables: {}, variableRefs: {} })
	};

	return scope.clone({ variables, variableRefs });
}

function stringify(item) {
	if (Array.isArray(item)) {
		return item.map(stringify).join(' ');
	}

	if (item instanceof Map) {
		return stringify(Array.from(item.values()));
	}

	return getValue(item);
}
