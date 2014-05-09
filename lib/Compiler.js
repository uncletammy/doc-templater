/**
 * Module dependencies
 */

var spawn = require('child_process').spawn;
var _ = require('lodash');
var fs = require('fs-extra');
var util = require('util');


// Expose Compiler constructor
module.exports = Compiler;


//
// Constants
//

var MARKED_OPTS = {
  gfm: true,
  tables: true,
  langPrefix: 'lang-'
};


/**
 * Compiler
 * 
 * @constructor
 */

function Compiler (options) {
    if (options.logger) {
        this.log = console.log
    } else {
        this.log = function(){return}
    }
}


/**
 * The `build()` function pulls markdown file(s) from the specified
 * git repo(s), then compiles them into HTML file(s) using the `marked`
 * module.
 * 
 * @param  {Object[]} docsObjects [array of build instruction objects]
 * @param  {Function} finalCB
 * @api public
 */
Compiler.prototype.build = function(docsObjects, finalCB) {

  // Used to keep track of templates on disk for each build.
  this.recentDRODs = [];

  var self = this;

  // Callback is optional
  finalCB = finalCB || function defaultCallback (err) { if (err) throw err; };

  // Validate input
  if (!_.isArray(docsObjects)) {
    return finalCB(new Error('Invalid usage: `buildInstructions` argument should be an array of objects.  Instead got:'+util.inspect(docsObjects)));
  }
  var usageErrors = _.reduce(docsObjects, function (memo, instruction, i) {
    if (typeof instruction !== 'object') {
      memo.push(new Error('Instruction #'+i+' is invalid - should be an object, but instead got: '+util.inspect(instruction)));
    }
    if (!instruction.docsGitRepo && !instruction.useDiskRepoPath) {
      memo.push(new Error('Missing `docsGitRepo` (repo src URL) in instruction #'+i+': '+util.inspect(instruction)));
    }
    if (!instruction.parsedTemplatesDirectory) {
      memo.push(new Error('Missing `parsedTemplatesDirectory` (destination dir) in instruction #'+i+': '+util.inspect(instruction)));
    }
    return memo;
  }, []);
  if (usageErrors.length) {
    return finalCB(new Error('Invalid usage:\n' + util.inspect(usageErrors)));
  }



  var baseDir = process.cwd()+'/.tmp/doc-templater/';
  self.log('set base dir as ',baseDir);
  var template = function(writeFileObject, afterFileWrite) {
    var returnWriteStatus = afterFileWrite;
    var convertToHTML = require('marked');
    // self.log('writing ',writeFileObject)
    var afterWriteCB = function(err) {
        if (err) {
            return returnWriteStatus({
              type: 'markup',
              err: err
            });
          
        } else {
            if (writeFileObject.templateConfig)
                delete writeFileObject.templateConfig;
            delete writeFileObject.templateHTML;

            return returnWriteStatus(null, writeFileObject);
        }
    };

    var saveToDisk = function(modifiedWriteFileObject) {
        fs.outputFile(modifiedWriteFileObject.fullPathAndFileName, modifiedWriteFileObject.templateHTML, afterWriteCB);

    };

    // Here, we apply any 'applyToTemplates' functions specified by the user

    var callBeforeConvert = function(currentWfObject, cb) {
      try {
        currentWfObject.templateConfig.beforeConvert(currentWfObject, function(modifiedWriteFileObject) {
          return cb(modifiedWriteFileObject); //will return modified ting
        });
      } catch (beforeConvertError) {
        return returnWriteStatus({
          type: 'beforeConvert',
          err: beforeConvertError
        });
      }
    };

    var callConvert = function(currentWfObject, cb) {
      convertToHTML(currentWfObject.templateHTML, MARKED_OPTS, function(err, convertedMarkup) {
        if (err) {
          self.log('Conversion Error:', err);
          return returnWriteStatus({
            type: 'conversion',
            err: err
          });
        } else {
          //self.log('Converted ',currentWfObject.fullPathAndFileName)
          currentWfObject.templateHTML = convertedMarkup;
          if (currentWfObject.templateConfig.afterConvert) {
            callAfterConvert(currentWfObject, function(modifiedWriteFileObject) {
              return cb(modifiedWriteFileObject);
            });
          } else {
            return cb(currentWfObject);
          }
        }
      });
    };

    var callAfterConvert = function(currentWfObject, cb) {
      try {
        currentWfObject.templateConfig.afterConvert(currentWfObject, function(modifiedWriteFileObject) {
          return cb(modifiedWriteFileObject); //will return modified ting
        });
      } catch (afterConvertError) {
        return returnWriteStatus({
          type: 'afterConvert',
          err: afterConvertError
        });
      }
    };

    // Here, we apply any 'applyToTemplates' functions specified by the user

    if (writeFileObject.templateConfig.beforeConvert) {
      callBeforeConvert(writeFileObject, function(modifiedWriteFileObject) {

        callConvert(modifiedWriteFileObject, saveToDisk);
      });
    } else {
      callConvert(writeFileObject, saveToDisk);
    }

  };

  var grabFolders = function(currentDocsObject) {

      var ignoreKeys = ['.git'];
      var allMarkdownFiles = [];
      var objectsToSearch = [currentDocsObject.jsonTreeOfRepo];


      var writeOne = function(writeFileObject,cb){
        //var templatePathAndFilename = writeFileObject.savePath+writeFileObject.mdFileName;
        //self.log('writing template:',writeFileObject)
        template(writeFileObject, cb);
      }

      var allDone = function(err){
        if (err){
          self.log('There was an error writing a template:',err)
        }

          if (allMarkdownFiles.length){
            var writeThisTemplate = allMarkdownFiles.shift();
            if (!currentDocsObject.config.__useBaseDir){
                if (writeThisTemplate.fullPathAndFileName.indexOf(currentDocsObject.config.dirNameInRepo) >-1){
                    writeOne(writeThisTemplate,allDone)
                } else {
                  return allDone()
                }
            } else {
                writeOne(writeThisTemplate,allDone)
            }

          } else {
            self.log('\n\nAll Templates Written!\n\n')
           return afterEachStep(null, currentDocsObject);
          }

      };

      var moreDirectoriesPlease = function(){
        if (objectsToSearch.length <= 0){
          return allDone()
        } else {
            processDirectory(objectsToSearch.shift());
        }
      };

      var processDirectory = function(currentDirectoryObject){
          for (var key in currentDirectoryObject) {
              if (ignoreKeys.indexOf(key) < 0){            
                  if (key.toLowerCase().indexOf('.') >= 0) {

                      var getPath = currentDirectoryObject[key]['-path'];
                      //self.log('splitting',getPath,'by',currentDocsObject.config.__derivenRepoName)
                      var splitPathByRepoName = getPath.split(currentDocsObject.config.__derivenRepoName);
                      splitPathByRepoName.shift();
                      getPath = currentDocsObject.config.parsedTemplatesDirectory+splitPathByRepoName.join('');
                      splitPathByRepoName = getPath.split('/');
                      var mdFileName = splitPathByRepoName.pop();
//                      mdFileName = mdFileName.substring(0,mdFileName.indexOf('.md'));
                      getPath = splitPathByRepoName.join('/');

                      var newFile = {
                        templateConfig: {},
                        templateTitle: mdFileName,
                        fullPathAndFileName: getPath + '/' + mdFileName + '.md',
                        templateHTML: currentDirectoryObject[key]['-content']
                      };

                      if (currentDocsObject.config.applyToTemplates){
                        //self.log(currentDocsObject.config.applyToTemplates)
                        newFile.templateConfig = currentDocsObject.config.applyToTemplates;
                      }

                      allMarkdownFiles.push(newFile);
                  } else if (currentDirectoryObject[key]['-type'] && currentDirectoryObject[key]['-type'] === 'd'){
                      objectsToSearch.push(currentDirectoryObject[key])
                  }
              } else {
                self.log('Ignoring key ',key,'while compiling ',currentDocsObject.config.__derivenRepoName);
              }
          }
         return moreDirectoriesPlease();
      };

      moreDirectoriesPlease();

  };

  var getPathTree = function(currentDocsObject) {
    // Go back to where we started

    var jsonDir = require('jsondir');

    var gotTree = function(err, results) {
      if (err) {
        self.log('There was an error getting the docs structure of', process.cwd()+currentDocsObject.config.__docsRepoOnDisk);
        return afterEachStep(err, currentDocsObject);
      } else {
        //self.log('Created JSON representation of git directory');
        currentDocsObject.jsonTreeOfRepo = results;
        return afterEachStep(null, currentDocsObject);
      }
    };
    self.log('opening ',currentDocsObject.config.__fullGitPathOnDisk)
    jsonDir.dir2json(currentDocsObject.config.__fullGitPathOnDisk, {
      attributes: ['content', 'mode']
    }, gotTree);
  };


  var cloneRepo = function(currentDocsObject) {

    var doGitOp = function(operationAndAruments,options,cb) {
      self.log('Performing git operation:',operationAndAruments[0],'on repo/branch',operationAndAruments[1])
      var gitOperation = spawn('git', operationAndAruments,options);
      gitOperation.stdout.on('data', function(d) {
        self.log('\nInfo:' + d);
      });
      gitOperation.stderr.on('data', function(d) {
        self.log('\nstde:' + d);
      });
      gitOperation.on('exit', function(code) {
        //self.log('finished ',operationAndAruments[0],' and in ',process.cwd());
        if (code === 0) {
            return cb()
        } else {
          self.log(operationAndAruments[0],' returned exit code ',code);
          return afterEachStep(new Error('git '+operationAndAruments[0]+' on '+operationAndAruments[1]+' exited with code' + code), currentDocsObject);
        }
      });
    };

    // Make sure the .tmp directory exists so we can clone the repo in it

    var tmpDir = baseDir;
    if (!fs.existsSync(tmpDir))
      fs.mkdirsSync(tmpDir);

    var gitRepoBranch = currentDocsObject.config.__gitRepoBranch;
    var fullGitPathOnDisk = tmpDir + currentDocsObject.config.__derivenRepoName;
    currentDocsObject.config.__fullGitPathOnDisk = fullGitPathOnDisk;
    if (fs.existsSync(fullGitPathOnDisk)) {
        self.log(fullGitPathOnDisk, ' exists!  Lets pull!\n');
        doGitOp(['pull'],{cwd:fullGitPathOnDisk},function(){
            doGitOp(['checkout', gitRepoBranch],{cwd:fullGitPathOnDisk},function(){
                return afterEachStep(null, currentDocsObject)
            })
        });
    } else {
        self.log(fullGitPathOnDisk, 'hasnt been cloned yet.  I\'ll do that now!');
        //process.chdir(tmpDir);
        doGitOp(['clone', currentDocsObject.config.docsGitRepo],{cwd:tmpDir},function(){
            doGitOp(['checkout', gitRepoBranch],{cwd:fullGitPathOnDisk},function(){
                return afterEachStep(null, currentDocsObject)
            })
        })
    }

  };

  // called directly after each function in function array.

  var prepareThem = function(singleDocsObject) {


    var possibleOptions = [
      'addToSiteMap',
      'prependPathAndName',
      'docsGitRepo',
      'dirNameInRepo',
      'parsedTemplatesDirectory',
      'dontSplitFiles'
    ];

    possibleOptions.forEach(function(option) {
      if (_.isUndefined(singleDocsObject[option])) {
        //self.log(option,'is undefined.  Next time i\'ll throw an error');
        singleDocsObject[option] = null;
      }
    });

    var returnThis = {
      config: {
        errors: [],
        results: []
      }
    };

    // If the user supplied hooks, add them to the docsObject to be applied later
    if (singleDocsObject.applyToTemplates) {
      returnThis.config.applyToTemplates = singleDocsObject.applyToTemplates;
    }

    //
    // TODO: simplify this section
    // 

    if (singleDocsObject.dontSplitFiles) {
      returnThis.config.dontSplitFiles = singleDocsObject.dontSplitFiles;
    }

    if (singleDocsObject.prependPathAndName === true)
      returnThis.config.prependPathAndName = true;
    else
      returnThis.config.prependPathAndName = false;

    if (singleDocsObject.addToSiteMap === true)
      returnThis.config.addToSiteMap = true;
    else
      returnThis.config.addToSiteMap = false;

    var repoURL = singleDocsObject.docsGitRepo || singleDocsObject.useDiskRepoPath;
self.log('using repoPath:',singleDocsObject.useDiskRepoPath);
    // If there is a branch attached to the URL, save it to do a 'checkout' after the 'clone'

    if (repoURL.indexOf('#') > -1){
        var gitInfo = repoURL.split('#');
        returnThis.config.__gitRepoBranch = gitInfo[1];
        repoURL = gitInfo[0];
    } else {
        returnThis.config.__gitRepoBranch = 'master';
    }
    
    returnThis.config.docsGitRepo = repoURL;

    var getRepoName = repoURL.split('/');

    var deriveRepoName = getRepoName[getRepoName.length - 1].replace('.git', '');

    returnThis.config.__derivenRepoName = deriveRepoName;

    if (!singleDocsObject.dirNameInRepo) {
      returnThis.config.__useBaseDir = true;
      returnThis.config.dirNameInRepo = deriveRepoName;
      returnThis.config.__docsRepoOnDisk = baseDir + deriveRepoName;

    } else {
      returnThis.config.__useBaseDir = false;
      returnThis.config.dirNameInRepo = singleDocsObject.dirNameInRepo;
      returnThis.config.__baseDocsRepoOnDisk = deriveRepoName;
      returnThis.config.__docsRepoOnDisk = baseDir + deriveRepoName + '/' + singleDocsObject.dirNameInRepo;

    }

    var lastCharOfSaveDir = singleDocsObject.parsedTemplatesDirectory.substr(singleDocsObject.parsedTemplatesDirectory.length - 1);
    if (lastCharOfSaveDir === '/')
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory.substr(0, singleDocsObject.parsedTemplatesDirectory.length - 1);
    else
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory;

    // returnThis.config.toComplete = [cloneRepo, getPathTree, grabFolders, splitMDsIntoTemplates, writeTemplates];
    returnThis.config.toComplete = [cloneRepo, getPathTree, grabFolders];

    // Check to see if this docsRepoOnDisk has been used by another docsObject.
    // We dont want to delete what we just created.

    if (self.recentDRODs.indexOf(returnThis.config.parsedTemplatesDirectory) < 0){
        //self.log('Deleting',baseDir+'../../'+returnThis.config.parsedTemplatesDirectory);
        fs.removeSync(baseDir+'../../'+returnThis.config.parsedTemplatesDirectory);
    } else {
        self.log(returnThis.config.parsedTemplatesDirectory,'has been previously used so we wont delete it.');      
    }
        self.recentDRODs.push(returnThis.config.parsedTemplatesDirectory)


    if (singleDocsObject.useDiskRepoPath){
        self.log('youre using a disk path to docs.  yaya',singleDocsObject.useDiskRepoPath)
        //returnThis.config.useDiskRepoPath = singleDocsObject.useDiskRepoPath;
        returnThis.config.toComplete = [getPathTree, grabFolders];
        returnThis.config.__docsRepoOnDisk = singleDocsObject.useDiskRepoPath;
        returnThis.config.__fullGitPathOnDisk = singleDocsObject.useDiskRepoPath;
    }

    self.log(returnThis.config)
    return returnThis;

  };

  // Cast `docsObjects` to an array.
  if (_.isArray(docsObjects)) {
    docsObjects = docsObjects;
  } else if (_.isPlainObject(docsObjects)) {
    docsObjects = [docsObjects];
  } else if (_.isFunction(docsObjects)) {
    // self.log('docsDir is a function.  Something isnt right.');
  }


  var allErrors = [];
  var allResults = [];

  var afterEachStep = function(newErrors, currentDocsObject) {

    var functionArray = currentDocsObject.config.toComplete;

    if (newErrors)
      allErrors = allErrors.concat(newErrors);

    if (functionArray.length) {
      var theNextStep = functionArray.shift();
      return theNextStep(currentDocsObject, functionArray);
    } else {
      //currentDocsObject.config['jsonMenu'] = currentDocsObject.populatedSections;

      delete currentDocsObject.populatedSections;
      delete currentDocsObject.createTheseSections;
      delete currentDocsObject.config.toComplete;
      delete currentDocsObject.jsonTreeOfRepo;

      allResults.push(currentDocsObject);
      return perDocsObjectCallback(currentDocsObject.config.docsGitRepo);
    }
  };

  var perDocsObjectCallback = function(finishedRepoName) {
    process.chdir(baseDir+'../..');
    self.log('Done with ', finishedRepoName, '.\n\n');
    return processThisDocsObject(docsObjects.shift());
  };


  // TODO: Account for "docsObjects arrays" that share a repo.  Keep the script from cloning it multiple times.

  var processThisDocsObject = function(thisDocsObject) {
    if (!_.isUndefined(thisDocsObject)) {

      afterEachStep(null, prepareThem(thisDocsObject));

    } else {
      self.log('All Done with all docsObjects!');
      if (allErrors.length > 0)
        finalCB(allErrors, allResults);
      else
        finalCB(null, allResults);
    }

  };

  processThisDocsObject(docsObjects.shift());


};
