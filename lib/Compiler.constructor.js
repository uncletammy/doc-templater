// Expose Compiler constructor
module.exports = Compiler;


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








// Traditional input API:
// (`docsObjects`)
// ------------------------------------------------------
// 
// [
//   {
//     docsGitRepo: 'git://github.com/balderdashy/sails-docs.git',
//     dirNameInRepo: 'reference',
//     parsedTemplatesDirectory: 'assets/templates/reference/',
//     applyToTemplates: {
//       beforeConvert: function(writeFileObj, done) { ... },
//       afterConvert: function(writeFileObj, done) { ... }
//     },
//     saveJsonMenu: 'assets/templates/jsmenus/reference.jsmenu'
//   },
//   {...},
//   ...
// ]

function _build (docsObjects, finalCB) {

  // Used to keep track of templates on disk for each build.
  this.recentDRODs = [];

  var self = this;
  this.jsonMenu = {};


  // Callback is optional
  finalCB = finalCB || function defaultCallback(err) {
    if (err) throw err;
  };

  // Validate input
  if (!_.isArray(docsObjects)) {
    return finalCB(new Error('Invalid usage: `buildInstructions` argument should be an array of objects.  Instead got:' + util.inspect(docsObjects)));
  }
  var usageErrors = _.reduce(docsObjects, function(memo, instruction, i) {
    if (typeof instruction !== 'object') {
      memo.push(new Error('Instruction #' + i + ' is invalid - should be an object, but instead got: ' + util.inspect(instruction)));
    }
    if (!instruction.docsGitRepo) {
      memo.push(new Error('Missing `docsGitRepo` (repo src URL) in instruction #' + i + ': ' + util.inspect(instruction)));
    }
    if (!instruction.parsedTemplatesDirectory) {
      memo.push(new Error('Missing `parsedTemplatesDirectory` (destination dir) in instruction #' + i + ': ' + util.inspect(instruction)));
    }
    return memo;
  }, []);
  if (usageErrors.length) {
    return finalCB(new Error('Invalid usage:\n' + util.inspect(usageErrors)));
  }



  var baseDir = process.cwd() + '/.tmp/doc-templater/';

  // todo: JSON menu fails to be created for templates in base level
  // docs directory that are not inside of subfolders. 

  var makeJsonMenu = function(currentDocsObject) {
    if (currentDocsObject.config.saveJsonMenu) {

      var results = currentDocsObject.config.results;
      if (_.isUndefined(results[0]))
        results.shift();

      // Full path of every menu or submenu
      var allTemplates = _.map(results, function(oneResult) {
        var oldName = oneResult.fullPathAndFileName;
        // console.log('Splitting by',currentDocsObject.config.dirNameInRepo)
        var loseAbsolutePath = oneResult.fullPathAndFileName.split(currentDocsObject.config.dirNameInRepo);
        loseAbsolutePath.shift();
        oneResult.fullPathAndFileName = currentDocsObject.config.dirNameInRepo + (loseAbsolutePath.join(currentDocsObject.config.dirNameInRepo));
        // console.log('Changed path from:',oldName,'to',oneResult.fullPathAndFileName)
        return oneResult

      })

      var allParents = _.where(allTemplates, {
        isParent: true
      });
      var allKiddos = _.where(allTemplates, {
        isParent: false
      });
      // var parentPaths = _.pluck(allParents,'fullPathAndFileName');


      var finishedTemplates = [];

      var giveChildren = _.each(allParents, function(o) {
        var thisParent = o;
        var splitName = thisParent.fullPathAndFileName.replace(/.html/ig, '').split('/');
        var parentFolderName = splitName.pop() + '.html';
        var searchBy = splitName.join('/');
        var parentSubDirectoryLength = thisParent.fullPathAndFileName.split('/').length;


        // If childs `fullPathAndTemplateName` is inside of this parent's
        // AND has the same array length when you split it (same number of subdirectories),
        // then it must be a child of the current parent.

        // If the child array is larger by 1 or more than the parent,
        // then it must be a child of a child (grandchild or nino/a)  
        var getChildren = _.where(allKiddos, function(templateObject) {
          var searchIndex = templateObject.fullPathAndFileName.indexOf(searchBy);
          var childSubDirectoryLength = templateObject.fullPathAndFileName.split('/').length;
          if (searchIndex > -1 && childSubDirectoryLength === parentSubDirectoryLength) {
            var kidnap = templateObject;
            kidnap.isChild = true;
            return kidnap
          }
        })

        // Get submenus of this parent and add `isChild` attribute.
        // Add them to the list of children who will soon receive parents.
        var parentsAlsoChildren = _.where(allParents, function(kidChild) {
          var searchIndex = kidChild.fullPathAndFileName.indexOf(searchBy);
          var kidChildSubDirectoryLength = kidChild.fullPathAndFileName.split('/').length;
          if (searchIndex > -1 && kidChildSubDirectoryLength === parentSubDirectoryLength + 1) {
            var kidnap = kidChild;
            allParents = _.without(allParents, [kidChild])
            kidnap.isChild = true;
            return kidnap
          }
          // if (kidChildSubDirectoryLength === parentSubDirectoryLength+2)
          //   console.log(kidChild.fullPathAndFileName,'must be a grandchild')
          // if (kidChildSubDirectoryLength === parentSubDirectoryLength+3)
          //   console.log(kidChild.fullPathAndFileName,'must be a GREAT grandchild')

        })

        var giveKiddosParents = _.each(parentsAlsoChildren.concat(getChildren), function(p) {
          p.parent = thisParent.fullPathAndFileName;
          return p
        });

        finishedTemplates = finishedTemplates.concat(giveKiddosParents);

        thisParent.children = _.pluck(giveKiddosParents, 'fullPathAndFileName');

        return thisParent;
      })

      finishedTemplates = _.unique(finishedTemplates.concat(giveChildren));

      fsx.outputJson(currentDocsObject.config.saveJsonMenu, finishedTemplates, function(err) {
        if (err)
          self.log('Couldnt write jsonMenu to file:', currentDocsObject.config.saveJsonMenu);

        self.log('Saved jsonMenu to', currentDocsObject.config.saveJsonMenu, '\n\n');

        return afterEachStep(null, currentDocsObject);
      })


    } else {
      return afterEachStep(null, currentDocsObject);
    }
  };


  var template = function(writeFileObject, afterFileWrite) {
    var returnWriteStatus = afterFileWrite;
    var convertToHTML = require('marked');

    // var addToSitemap = function(object){
    // }

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

      // try{
      //   addToSitemap(_.cloneDeep(modifiedWriteFileObject));
      // } catch(soErr) {
      //   self.log('ERRRROR:',soErr);
      // }

      fsx.outputFile(modifiedWriteFileObject.fullPathAndFileName, modifiedWriteFileObject.templateHTML, afterWriteCB);
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

    // Add metaData to your docs with <docmeta name="keyName" value="thevalue omg, laugh out loud"> anywhere in the .md file
    var extractMetaData = function(currentWfObject, cb) {
        var getHTML = currentWfObject.templateHTML;
        var metaData = getHTML.match(/<docmeta [^]+?>/ig) || [];
        try {
          var firstLine = getHTML.match(/\n{0,1}([^]+?)\n/)[0];
          // currentWfObject.displayName = firstLine;
        } catch (flErr) {
          self.log('Could not parse first line from', currentWfObject.fullPathAndFileName)
        }
        var templateMeta = {};
        if (metaData.length) {
          metaData.forEach(function(v, i) {
            try {
              var string = v;
              var getKey = string.replace(/[^]+?name=['"](.+?)['"][^]+/i, '$1');
              var getVal = string.replace(/[^]+?value=['"](.+?)['"][^]+/i, '$1');
              templateMeta[getKey] = getVal;
            } catch (err) {
              self.log('Couldnt get template metadata from ', v, ':', err)
            }
            if (i === metaData.length - 1) {
              // self.log('Added data',templateMeta,'to',currentWfObject.fullPathAndFileName);
              currentWfObject.data = templateMeta;
              currentWfObject.templateHTML.replace(/<docmeta ([^]+)>/i, '');
              return cb(currentWfObject)
            }
          })
        } else {
          return cb(currentWfObject)

        }
      }
      // Here, we apply any 'applyToTemplates' functions specified by the user

    if (writeFileObject.templateConfig.beforeConvert) {
      callBeforeConvert(writeFileObject, function(modifiedWriteFileObject) {

        extractMetaData(modifiedWriteFileObject, function(modifiedWriteFileObject) {
          callConvert(modifiedWriteFileObject, saveToDisk);
        })
      });
    } else {
      extractMetaData(writeFileObject, function(modifiedWriteFileObject) {
        callConvert(modifiedWriteFileObject, saveToDisk);
      })

    }

  };

  var grabFolders = function(currentDocsObject) {

    var ignoreKeys = ['.git'];
    var allMarkdownFiles = [];
    var objectsToSearch = [currentDocsObject.jsonTreeOfRepo];


    var writeOne = function(writeFileObject, cb) {
      //var templatePathAndFilename = writeFileObject.savePath+writeFileObject.mdFileName;
      // self.log('writing template:',writeFileObject.fullPathAndFileName)
      template(writeFileObject, cb);
    }

    var allDone = function(err, result) {
      if (err) {
        currentDocsObject.config.errors.push(err)
        self.log('There was an error writing a template:', err);
      }

      currentDocsObject.config.results.push(result);

      if (allMarkdownFiles.length) {
        var writeThisTemplate = allMarkdownFiles.shift();
        if (!currentDocsObject.config.__useBaseDir) {

          // Im not sure why the lines below existed.  They cause undefined objects to be pushed
          // into the results array.  I have commented them out.

          // if (writeThisTemplate.fullPathAndFileName.indexOf(currentDocsObject.config.dirNameInRepo) >-1){
          writeOne(writeThisTemplate, allDone);
          // } else {
          // return allDone()
          // }
        } else {
          writeOne(writeThisTemplate, allDone);
        }

      } else {
        self.log('\n\nAll Templates Written!\n\n');
        return afterEachStep(null, currentDocsObject);
      }

    };

    var moreDirectoriesPlease = function() {
      if (objectsToSearch.length <= 0) {
        return allDone()
      } else {
        processDirectory(objectsToSearch.shift());
      }
    };

    var processDirectory = function(currentDirectoryObject) {
      for (var key in currentDirectoryObject) {
        // self.log('Processing',key)
        if (ignoreKeys.indexOf(key) < 0) {
          if (key.toLowerCase().indexOf('.md') >= 0) {



            // var getPath = currentDirectoryObject[key]['-path'];
            // if (currentDocsObject.config.dirNameInRepo)
            //   var splitPathByRepoName = getPath.split(currentDocsObject.config.__derivenRepoName+'/'+currentDocsObject.config.dirNameInRepo);
            // else
            //   var splitPathByRepoName = getPath.split(currentDocsObject.config.__derivenRepoName);
            // // self.log('splitting',getPath,'by',splitPathByRepoName)
            // splitPathByRepoName.shift();
            // getPath = currentDocsObject.config.parsedTemplatesDirectory+splitPathByRepoName.join('');
            // splitPathByRepoName = getPath.split('/');
            // var mdFileName = splitPathByRepoName.pop();
            // mdFileName = mdFileName.substring(0,mdFileName.indexOf('.md'));
            // getPath = splitPathByRepoName.join('/');


            var getPath = currentDirectoryObject[key]['-path'];
            if (currentDocsObject.config.dirNameInRepo)
              var splitPathByRepoName = getPath.split(currentDocsObject.config.__derivenRepoName + '/' + currentDocsObject.config.dirNameInRepo);
            else
              var splitPathByRepoName = getPath.split(currentDocsObject.config.__derivenRepoName);

            // filename and extension
            splitPathByRepoName.shift();
            getPath = baseDir + '../../' + currentDocsObject.config.parsedTemplatesDirectory + splitPathByRepoName.join('');

            splitPathByRepoName = getPath.split('/');
            var mdFileName = splitPathByRepoName.pop();
            mdFileName = mdFileName.substring(0, mdFileName.indexOf('.md'));
            getPath = splitPathByRepoName.join('/');

            var newFile = {
              templateConfig: {},
              templateTitle: mdFileName,
              fullPathAndFileName: getPath + '/' + mdFileName + '.html',
              templateHTML: currentDirectoryObject[key]['-content']
            };

            if (currentDirectoryObject[key].isParent) {
              newFile.isParent = true;
            } else {
              // deleting decoy 'newFile'
              if (_.isUndefined(currentDirectoryObject[key])) {
                delete currentDirectoryObject[key]
              }
              newFile.isParent = false;
            }
            if (currentDocsObject.config.applyToTemplates) {
              //self.log(currentDocsObject.config.applyToTemplates)
              newFile.templateConfig = currentDocsObject.config.applyToTemplates;
            }


            allMarkdownFiles.push(newFile);
          } else if (currentDirectoryObject[key]['-type'] && currentDirectoryObject[key]['-type'] === 'd') {
            var mdKey = key + '.md';
            try {

              currentDirectoryObject[key][mdKey].isParent = true;
            } catch (anError) {
              // currentDirectoryObject.config.err.push(anError);
              self.log('Error processing directory at key', key, ':', anError)
            }
            objectsToSearch.push(currentDirectoryObject[key])
          }
        } else {
          self.log('Ignoring key ', key, 'while compiling ', currentDocsObject.config.__derivenRepoName);
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
        self.log('There was an error getting the docs structure of', currentDocsObject.config.__docsRepoOnDisk);
        return afterEachStep(err, currentDocsObject);
      } else {
        self.log('Created JSON representation of git directory:');
        currentDocsObject.jsonTreeOfRepo = results;
        return afterEachStep(null, currentDocsObject);
      }
    };
    jsonDir.dir2json(currentDocsObject.config.__fullGitPathOnDisk, {
      attributes: ['content', 'mode']
    }, gotTree);
  };


  var cloneRepo = function(currentDocsObject) {

    var doGitOp = function(operationAndAruments, options, cb) {
      self.log('Performing git operation:', operationAndAruments[0], 'on repo/branch', operationAndAruments[1])
      var gitOperation = spawn('git', operationAndAruments, options);
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
          self.log(operationAndAruments[0], ' returned exit code ', code);
          return afterEachStep(new Error('git ' + operationAndAruments[0] + ' on ' + operationAndAruments[1] + ' exited with code' + code), currentDocsObject);
        }
      });
    };

    // Make sure the .tmp directory exists so we can clone the repo in it

    var tmpDir = baseDir;
    if (!fsx.existsSync(tmpDir))
      fsx.mkdirsSync(tmpDir);

    var gitRepoBranch = currentDocsObject.config.__gitRepoBranch;
    var fullGitPathOnDisk = tmpDir + currentDocsObject.config.__derivenRepoName;
    currentDocsObject.config.__fullGitPathOnDisk = fullGitPathOnDisk;
    if (currentDocsObject.config.dirNameInRepo)
      currentDocsObject.config.__fullGitPathOnDisk = currentDocsObject.config.__fullGitPathOnDisk + '/' + currentDocsObject.config.dirNameInRepo;

    if (fsx.existsSync(fullGitPathOnDisk)) {
      self.log('\n', fullGitPathOnDisk, ' exists!  Lets pull!\n');
      doGitOp(['pull'], {
        cwd: fullGitPathOnDisk
      }, function() {
        doGitOp(['checkout', gitRepoBranch], {
          cwd: fullGitPathOnDisk
        }, function() {
          return afterEachStep(null, currentDocsObject)
        })
      });
    } else {
      self.log(fullGitPathOnDisk, 'hasnt been cloned yet.  I\'ll do that now!');
      //process.chdir(tmpDir);
      doGitOp(['clone', currentDocsObject.config.docsGitRepo], {
        cwd: tmpDir
      }, function() {
        doGitOp(['checkout', gitRepoBranch], {
          cwd: fullGitPathOnDisk
        }, function() {
          return afterEachStep(null, currentDocsObject)
        })
      })
    }

  };

  // called directly after each function in function array.

  var prepareThem = function(singleDocsObject) {


    var possibleOptions = [
      'addToSiteMap',
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

    if (singleDocsObject.addToSiteMap === true)
      returnThis.config.addToSiteMap = true;
    else
      returnThis.config.addToSiteMap = false;

    var repoURL = singleDocsObject.docsGitRepo;

    // If there is a branch attached to the URL, save it to do a 'checkout' after the 'clone'

    if (repoURL.indexOf('#') > -1) {
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

    // Strip off the last '/' in the file path.
    var lastCharOfSaveDir = singleDocsObject.parsedTemplatesDirectory.substr(singleDocsObject.parsedTemplatesDirectory.length - 1);
    if (lastCharOfSaveDir === '/')
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory.substr(0, singleDocsObject.parsedTemplatesDirectory.length - 1);
    else
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory;

    // returnThis.config.parsedTemplatesDirectory = baseDir+'/../../'+returnThis.config.parsedTemplatesDirectory;

    // Run each Docs object through these functions in this order.  All changes are saved
    // to the Docs object which is passed through to the next function.
    returnThis.config.toComplete = [cloneRepo, getPathTree, grabFolders, makeJsonMenu];

    // Check to see if this docsRepoOnDisk has been used by another docsObject.
    // We dont want to delete what we just created.

    if (singleDocsObject.saveJsonMenu) {
      returnThis.config.saveJsonMenu = singleDocsObject.saveJsonMenu;
    }

    // If the directory where saved templates are to be saved has been used by another 
    // Docs object in the array of Docs object to be compiled, dont delete it before writing
    // more templates to it.

    if (self.recentDRODs.indexOf(returnThis.config.parsedTemplatesDirectory) < 0) {
      self.log('Deleting', baseDir + '../../' + returnThis.config.parsedTemplatesDirectory);
      fsx.removeSync(baseDir + '../../' + returnThis.config.parsedTemplatesDirectory);
    } else {
      self.log(returnThis.config.parsedTemplatesDirectory, 'has been previously used so we wont delete it.');
    }
    self.recentDRODs.push(returnThis.config.parsedTemplatesDirectory)


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


  // This is called after every function that modifies the currentDocsObject. 
  // Its purpose is to collect errors and move the Docs object through to
  // the next function. 
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
    process.chdir(baseDir + '../..');
    self.log('Done with ', finishedRepoName, '.\n\n');
    return processThisDocsObject(docsObjects.shift());
  };

  var processThisDocsObject = function(thisDocsObject) {
    if (!_.isUndefined(thisDocsObject)) {

      afterEachStep(null, prepareThem(thisDocsObject));

    } else {
      self.log('All Done with all docsObjects!', '\n\n');
      if (allErrors.length > 0) {
        return finalCB(allErrors, allResults);
      } else {
        return finalCB(null, allResults);
      }
    }

  };

  processThisDocsObject(docsObjects.shift());


};
