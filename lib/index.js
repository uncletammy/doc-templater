/**
 * Module dependencies
 */

var Compiler = require('./Compiler');



/**
 * Export factory function which reurns a new compiler instance.
 * @type {Function}
 */

module.exports = function CompilerFactory () {
  return new Docs();
};

// Backwards-compatibility:
// Creates a Compiler instance and calls the `build` method on it.
module.exports.createTemplate = function () {
  var compiler = new Comipiler();
  return compiler.createTemplate.apply(compiler, Array.prototype.slice.call(arguments));
};
