var assert = require('assert');
var fsx = require('fs-extra');
var Compiler = require('../lib/Compiler');
var path = require('path');


describe('Compiler.prototype.build', function () {
  
  var compiler = new Compiler();

  var TEST_OUTPUT_DIR = '.tmp/testoutput';
  var TEST_REPO_URL = 'git@github.com:mikermcneil/doc-templater.git';
  var TEST_REPO_PATH = 'test/fixtures/dummySrcFiles';

  // TODO: When this is merged, switch to:
  // var TEST_REPO_URL = 'git@github.com:uncletammy/doc-templater.git';

  // Make sure a temporary directory exists
  // and empty it out if it does already
  // (this library will create one anyway, but since we also need
  // .tmp for our test output, we want to make sure it exists
  // to eliminate variables from test failures)
  // afterEach(wipeTmpFiles);
  beforeEach(wipeTmpFiles);
  function wipeTmpFiles () {
    var tmpDirPath = path.resolve(__dirname,'../.tmp');
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
      docsGitRepo: TEST_REPO_URL,
      dirNameInRepo: 'test/fixtures/dummySrcFiles',
      parsedTemplatesDirectory: TEST_OUTPUT_DIR
    }], done);
  });

  it('should create expected HTML markup files in the expected destination directory', function (done) {
    // This test isn't "slow" unless it takes longer than 5 seconds
    this.slow(5000);

    compiler.build([{
      docsGitRepo: TEST_REPO_URL,
      dirNameInRepo: 'test/fixtures/dummySrcFiles',
      parsedTemplatesDirectory: TEST_OUTPUT_DIR
    }], function whenFinished (err, metadata){
      if (err) return done(err);
      assert(fsx.existsSync(TEST_OUTPUT_DIR));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Foo/Foo.html')));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Bar/Bar.html')));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Bar/Testthing.html')));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Bar/Testagain.html')));
      done();
    });
  });


  it('should support the "dontSplitFiles" option', function (done) {
    // This test isn't "slow" unless it takes longer than 5 seconds
    this.slow(5000);

    compiler.build([{
      docsGitRepo: TEST_REPO_URL,
      dirNameInRepo: 'test/fixtures/dummySrcFiles',
      parsedTemplatesDirectory: TEST_OUTPUT_DIR,
      dontSplitFiles: true
    }], function whenFinished (err, metadata){
      if (err) return done(err);
      assert(fsx.existsSync(TEST_OUTPUT_DIR));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Foo/Foo.html')));
      assert(fsx.existsSync(path.resolve(TEST_OUTPUT_DIR, 'Bar/Bar.html')));
      done();
    });
  });

  // TODO
  it('should return metadata in a determinstic format');
});
