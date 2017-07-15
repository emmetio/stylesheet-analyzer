'use strict';

import ResolvedNode from './resolved-node';

export default class ResolvedAtRule extends ResolvedNode {
	constructor(ref, scope, name, expression) {
		super(ref, scope, 'at-rule');
		this.name = name;
		this.expression = expression || '';
	}

	/**
	 * Returns CSS representation of current node and its
	 * children.
	 * @param  {Boolean} skipEmpty Skip empty sections (sections
	 * without children)
	 */
	toCSS(skipEmpty, indent) {
		indent = indent || '';
		let before = `${indent}@${this.name} ${this.expression} {\n`;
		let after = `${indent}}`;
		indent += '\t';

		const children = this.children
			.map(item => item.toCSS(skipEmpty, indent))
			.filter(Boolean);

		if (skipEmpty && !children.length) {
			return;
		}

		return before
			+ children.map(item => item + '\n').join('')
			+ after;
	}
}
