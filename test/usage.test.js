var assert = require('assert');
var Compiler = require('../lib/Compiler');



describe('Compiler.prototype', function () {
  
  var compiler;

  it('should not throw when initialized', function () {
    compiler = new Compiler();
  });
  it('should return a valid Compiler instance', function () {
    assert(compiler instanceof Compiler);
  });



  describe('.build()', function () {
    describe('usage', function () {
      it('should not throw when an empty set of build instructions is supplied', function () {
        compiler.build([], function NOOP (){});
      });
      it('callback should be optional', function () {
        compiler.build([]);
      });
    });

  });
});
