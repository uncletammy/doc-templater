/**
 * Compiler
 *
 * @constructor
 */

function Compiler(options) {
  options = options||{};

  if (options.logger) {
    this.log = console.log;
  }
  else {
    this.log = function _dont_log() {};
  }
}


Compiler.prototype.build = require('./Compiler.prototype.build');

module.exports = Compiler;
