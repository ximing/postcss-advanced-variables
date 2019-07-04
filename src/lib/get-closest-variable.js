const postcss = require("postcss");
// return the closest variable from a node
export default function getClosestVariable(name, node, opts, self) {
	const variables = getVariables(node);

	let variable = variables[name];

	if (requiresAncestorVariable(variable, node)) {
		variable = getClosestVariable(name, node.parent, opts);
	}

	if (requiresFnVariable(variable, opts)) {
		variable = getFnVariable(name, node, opts.variables);
	}
	if (self && variable && opts.otherVariables) {
		if (self.type === "decl") {
			Object.keys(opts.otherVariables).forEach(theme => {
				let saasVariable = getFnVariable(
					name,
					node,
					opts.otherVariables[theme]
				);
				if (saasVariable) {
					const a = postcss.parse(`&.${theme}{ ${self.prop}:${saasVariable};}`);
					node.append(a);
				} else {
					console.error(`在${theme}中找不到变量$${name}`);
				}
			});
		}
	}
	return variable;
}

// return the variables object of a node
const getVariables = node => Object(Object(node).variables);

// return whether the variable should be replaced using an ancestor variable
const requiresAncestorVariable = (variable, node) =>
	undefined === variable && node && node.parent;

// return whether variable should be replaced using a variables function
const requiresFnVariable = (value, opts) =>
	value === undefined &&
	Object(opts).variables === Object(Object(opts).variables);

// return whether variable should be replaced using a variables function
const getFnVariable = (name, node, variables) =>
	"function" === typeof variables ? variables(name, node) : variables[name];
