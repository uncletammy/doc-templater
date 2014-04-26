var assert = require('assert');
var fsx = require('fs-extra');
var Compiler = require('../lib/Compiler');



describe('Compiler.prototype.build', function () {
  
  var compiler = new Compiler();

  // Make sure a temporary directory exists
  // and empty it out if it does already
  // (this library will create one anyway, but since we also need
  // .tmp for our test output, we want to make sure it exists
  // to eliminate variables from test failures)
  afterEach(wipeTmpFiles);
  beforeEach(wipeTmpFiles);
  function wipeTmpFiles () {
    var tmpDirPath = require('path').resolve(__dirname,'../.tmp');
    try {
      fsx.removeSync(tmpDirPath);
    }
    catch(e){}
    try {
      fsx.mkdirSync(tmpDirPath);
    }
    catch (e){}
  }


  it('should not throw or error out when passed a valid array of build instructions', function (done) {
    
    // This test isn't "slow" unless it takes longer than 5 seconds
    this.slow(5000);

    compiler.build([{
      docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
      parsedTemplatesDirectory: '.tmp/foo'
    }], function whenFinished (err, metadata){
      if (err) return done(err);
      assert(fsx.existsSync('.tmp/foo'));
      done();
    });
  });
  // it('should create HTML markup files in the expected destination directory', function (done) {
  //   compiler.build([{

  //   }], function whenFinished (err, metadata){
  //     if (err) return done(err);
  //     done();
  //   });
  // });
});
