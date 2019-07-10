// tooling
import getClosestVariable from "./get-closest-variable";
import manageUnresolved from "./manage-unresolved";

const postcss = require("postcss");

// return content with its variables replaced by the corresponding values of a node
export default function getReplacedString(string, node, opts) {
	const replacedString = string.replace(
		matchVariables,
		(match, before, name1, name2, name3) => {
			// conditionally return an (unescaped) match
			if (before === "\\") {
				return match.slice(1);
			}

			// the first matching variable name
			const name = name1 || name2 || name3;

			// the closest variable value
			const value = getClosestVariable(name, node.parent, opts, node);

			// if a variable has not been resolved
			if (undefined === value) {
				manageUnresolved(
					node,
					opts,
					name,
					`Could not resolve the variable "$${name}" within "${string}"`
				);

				return match;
			}

			// the stringified value
			const stringifiedValue = `${before}${stringify(value)}`;

			return stringifiedValue;
		}
	);
	if (
		node.type === "decl" &&
		opts.otherVariables &&
		!node.theme &&
		replacedString !== string &&
		string.includes("$")
	) {
		Object.keys(opts.otherVariables).forEach(theme => {
			const replaced = string.replace(
				matchVariables,
				(match, before, name1, name2, name3) => {
					// conditionally return an (unescaped) match
					if (before === "\\") {
						return match.slice(1);
					}

					// the first matching variable name
					const name = name1 || name2 || name3;

					// the closest variable value
					const value = opts.otherVariables[theme][name];

					// if a variable has not been resolved
					if (undefined === value) {
						manageUnresolved(
							node,
							opts,
							name,
							`Could not resolve the variable "$${name}" within "${string}"`
						);

						return match;
					}

					// the stringified value
					const stringifiedValue = `${before}${stringify(value)}`;

					return stringifiedValue;
				}
			);
			const a = postcss.parse(`&.${theme}{ ${node.prop}:${replaced}${node.important?' !important':''};}`);
			a.theme = theme;
			node.parent.append(a);
		});
	}
	return replacedString;
}

// match all $name, $(name), and #{$name} variables (and catch the character before it)
const matchVariables = /(.?)(?:\$([A-z][\w-]*)|\$\(([A-z][\w-]*)\)|#\{\$([A-z][\w-]*)\})/g;

// return a sass stringified variable
const stringify = object =>
	Array.isArray(object)
		? `(${object.map(stringify).join(",")})`
		: Object(object) === object
			? `(${Object.keys(object)
					.map(key => `${key}:${stringify(object[key])}`)
					.join(",")})`
			: String(object);
