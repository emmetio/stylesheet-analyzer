'use strict';

import parseArguments from './arguments';
import { getType, getValue } from '../utils';

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
	} else if (node.type === 'property' && node.name === 'include') {
		handleInclude(node, scope, next);
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
function handleMixin(node, scope, next) {
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
			console.log('got mixin', mixin.name, mixin.args);
		}
	}
}

function handleInclude(node, scope, next) {
	
}

class Mixin {
	constructor(node, scope, name, args) {
		this.node = node;
		this.scope = scope;
		this.name = name;
		this.args = args;
	}
}
