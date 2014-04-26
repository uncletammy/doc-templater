var assert = require('assert');
var fsx = require('fs-extra');
var Compiler = require('../lib/Compiler');



describe('Compiler.prototype.build', function () {
  
  var compiler = new Compiler();

  // Make sure a temporary directory exists
  // and empty it out if it does already
  var tmpDirPath = require('path').resolve(__dirname,'../.tmp');
  try {
    fsx.removeSync(tmpDirPath);
  }
  catch(e){}
  try {
    fsx.mkdirSync(tmpDirPath);
  }
  catch (e){}

  it('should not throw or error out when passed a valid array of build instructions', function (done) {
    compiler.build([{
      docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
      parsedTemplatesDirectory: '.tmp/foo'
    }], function whenFinished (err, metadata){
      if (err) return done(err);
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
