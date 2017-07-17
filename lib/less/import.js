/**
 * @import rule resolver: detect if it’s a LESS dependency and injects dependecy
 * data into resolved tree
 */
'use strict';

import getDependencies from './dependencies';
import resolveProperty from './property';

export default function resolveImport(node, scope) {
	if (node.type !== 'property' || node.name !== '@import') {
		return false;
	}

	const deps = getDependencies(node);
	if (!deps.length) {
		// Not a dependecy, output property as-is
		resolveProperty(node, scope);
		return;
	}

	// Inject dependencies into current scope
	const innerScope = {
		variables: {},
		variableRefs: {},
		mixins: {},
		mixinRefs: {}
	};
	const scopeKeys = Object.keys(innerScope);

	if (scope.dependencies) {
		deps.forEach(url => {
			if (url in scope.dependencies) {
				const dep = scope.dependencies[url];
				for (let j = 0, jl = scopeKeys.length, k; j < jl; j++) {
					k = scopeKeys[j];
					Object.assign(innerScope[k], dep.scope[k]);
				}
			}
		});

		for (let j = 0, jl = scopeKeys.length, k; j < jl; j++) {
			k = scopeKeys[j];
			Object.assign(scope[k], innerScope[k]);
		}
	}
}
