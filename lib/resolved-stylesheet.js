'use strict';

import ResolvedNode from './resolved-node';

export default class ResolvedStylesheet extends ResolvedNode {
	constructor(ref, scope) {
		super(ref, scope, 'stylesheet');
	}

	/**
	 * Returns CSS representation of current node and its
	 * children.
	 * @param  {Boolean} skipEmpty Skip empty sections (sections
	 * without children)
	 */
	toCSS(skipEmpty, indent) {
		return this.children
			.map(item => item.toCSS(skipEmpty, indent))
			.filter(Boolean)
			.map(item => item + '\n')
			.join('');
	}
}
