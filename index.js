/**
 * Module dependencies
 */

var Compiler = require('./lib/Compiler');



/**
 * Export factory function which reurns a new compiler instance.
 * @type {Function}
 */

module.exports = function CompilerFactory (options) {
	return new Compiler(options||{});
};

// Backwards-compatibility:
// Creates a Compiler instance and calls the `build` method on it.
module.exports.createTemplate = function (options) {
	var compiler = new Compiler(options);
	return compiler.build.apply(compiler, Array.prototype.slice.call(arguments));
};
