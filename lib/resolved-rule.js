'use strict';

import ResolvedNode from './resolved-node';

export default class ResolvedRule extends ResolvedNode {
	constructor(ref, scope, selectors) {
		super(ref, scope, 'rule');
		this.selectors = selectors;
	}

	set selectors(value) {
		this.name = value ? value.join(', ') : null;
		this._selectors = value;
	}

	get selectors() {
		return this._selectors;
	}

	/**
	 * Returns CSS representation of current node and its
	 * children.
	 * @param  {Boolean} skipEmpty Skip empty sections (sections
	 * without children)
	 */
	toCSS(skipEmpty, indent) {
		if (skipEmpty && !this.children.length) {
			return;
		}

		indent = indent || '';
		let before = '', after = '';

		if (this.name) {
			before = indent + this.name + ' {\n' ;
			after = indent + '}';
			indent += '\t';
		}

		return before
		+ this.children
			.map(item => item.toCSS(skipEmpty, indent))
			.filter(Boolean)
			.map(item => item + '\n')
			.join('')
		+ after;
	}
}
