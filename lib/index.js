/**
 * Export .
 * @type {Docs}
 */
module.exports = Singleton;

module.exports = function () {
  return new Docs();
};

// Backwards-compatibility:
// Creates a Docs instance and calls the `build` method on it.
module.exports.createTemplate = function () {
  var compiler = new Docs();
  return compiler.createTemplate.apply(compiler, Array.prototype.slice.call(arguments));
};
