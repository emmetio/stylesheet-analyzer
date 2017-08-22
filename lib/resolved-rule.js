'use strict';

import { lexer } from '@emmetio/css-parser';
import ResolvedNode from './resolved-node';
import { valueOf } from './utils';

export default class ResolvedRule extends ResolvedNode {
	constructor(ref, scope, selectors) {
		super(ref, scope, 'rule');
		this._parsedSelectors = null;
		this.selectors = selectors;
	}

	set selectors(value) {
		this.name = value ? value.map(valueOf).join(', ') : null;
		this._selectors = value;
		this._parsedSelectors = null;
	}

	get selectors() {
		return this._selectors;
	}

	get parsedSelectors() {
		if (!this._parsedSelectors) {
			this._parsedSelectors = this.selectors.map(lexer);
		}

		return this._parsedSelectors;
	}

	/**
	 * Returns CSS representation of current node and its
	 * children.
	 * @param  {Boolean} skipEmpty Skip empty sections (sections
	 * without children)
	 */
	toCSS(skipEmpty, indent) {
		indent = indent || '';
		let before = '', after = '';

		if (this.name) {
			before = indent + this.name + ' {\n' ;
			after = indent + '}';
			indent += '\t';
		}

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
