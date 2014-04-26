/**
 * Module dependencies
 */

var spawn = require('child_process').spawn;
var _ = require('lodash');
var fs = require('fs-extra');


// Expose Docs constructor
module.exports = Docs;



//
// Constants
//

// Versions 1.0
var MARKED_OPTS = {
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  langPrefix: 'lang-'
};


/**
 * Docs
 * 
 * @constructor
 */

function Docs() {
  
}


/**
 * The `build()` function pulls markdown file(s) from the specified
 * git repo(s), then compiles them into HTML file(s) using the `marked`
 * module.
 * 
 * @param  {Object[]} docsObjects [array of build instruction objects]
 * @param  {Function} callback
 * @api public
 */
Docs.prototype.build = function(docsObjects, callback) {
  var finalCB = callback;

  var baseDir = '.tmp/doc-templater/';

  var template = function(writeFileObject, afterFileWrite) {
    var returnWriteStatus = afterFileWrite;
    var convertToHTML = require('marked');

    var afterWriteCB = function(err) {
      if (err)
        return returnWriteStatus({
          type: 'markup',
          err: err
        });
      else {
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
          console.log('Conversion Error:', err);
          return returnWriteStatus({
            type: 'conversion',
            err: err
          });
        } else {
          //console.log('Converted ',currentWfObject.fullPathAndFileName)
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


  var writeTemplates = function(currentDocsObject) {

    var errors = [];
    var results = [];

    var sendTheseToBeWritten = currentDocsObject.populatedSections;

    var docSectionsToWrite = [];
    for (var section in sendTheseToBeWritten) {
      docSectionsToWrite.push(sendTheseToBeWritten[section]);
    }

    var afterSectionWrite = function(sectionResults) {
      if (docSectionsToWrite.length === 0) {
        currentDocsObject.config.errors.concat(errors);
        currentDocsObject.config.results.concat(results);

        if (errors.length)
          return afterEachStep(errors, currentDocsObject);
        else
          return afterEachStep(errors, currentDocsObject);
      } else {

        writeThisSection(docSectionsToWrite.shift(), afterSectionWrite);
      }

    };

    var writeThisSection = function(arrayOfTemplateObjects, afterSectionWrite) {
      var docSectionArray = arrayOfTemplateObjects;
      var results = [];

      var afterFileWrite = function(err, writeResult) {
        if (err)
          currentDocsObject.config.errors.push(err);
        else {
          currentDocsObject.config.results.push(writeResult);
          currentDocsObject.config.jsonMenu[writeResult.templateSectionName].push(writeResult);
        }

        if (arrayOfTemplateObjects.length === 0) {
          //console.log('next section');
          return afterSectionWrite(results);
        } else {
          //console.log('next template');
          template(docSectionArray.shift(), afterFileWrite);
        }
      };

      template(docSectionArray.shift(), afterFileWrite);

    };

    writeThisSection(docSectionsToWrite.shift(), afterSectionWrite);

  };


  // TODO: have option for each subsection to contain a section-config.ejs which can be interpreted client side.

  var splitMDsIntoTemplates = function(currentDocsObject) {

    var errors = [];
    var thisDocsObject = currentDocsObject;
    thisDocsObject['populatedSections'] = {};
    thisDocsObject.config.jsonMenu = {};

    var sectionsToSplit = thisDocsObject.createTheseSections;
    //console.log('\n\nCreateTheseSections:',thisDocsObject,'\n\n');
    var doSectionSplit = function(docSectionObject, cb) {
      //console.log('\n\ndocSectionObject:',docSectionObject,'\n\n')
      var sectionPathOnDisk = docSectionObject['-path'];
      var splitFiles = docSectionObject['-content'].split(/\n{0,1}[^#]#\s/ig);
      var sectionPath = currentDocsObject.config.parsedTemplatesDirectory;
      var sectionName = null;
      var sectionNameNoSpace = null;
      var isParentTemplate = false;

      //thisDocsObject.populatedSections = {};
      splitFiles.forEach(function(v, i) {

        var firstLine;
        try {
          firstLine = v.match(/\n{0,1}([^]+?)\n/)[0];
        } catch (mdSplitError) {
          errors.push(mdSplitError);
          console.log('MD Split Error in section:', docSectionObject, ':', mdSplitError);
          firstLine = 'Title Parsing Error';
        }

        if (i === 0) {
          var copyFirstLine = firstLine;
          sectionName = copyFirstLine.replace(/[\r\n`#]/ig, '');
          if (sectionName.substring(0, 1) === ' ');
          sectionName = sectionName.substring(1);

          sectionNameNoSpace = sectionName.substring(0).replace(/\s/ig, '');

          fs.mkdirsSync(sectionPath + '/' + sectionNameNoSpace);

          thisDocsObject.populatedSections[sectionName] = [];
          thisDocsObject.config.jsonMenu[sectionName] = [];
          isParentTemplate = true;
        }

        var getFileName = firstLine.replace(/[\r\t\n\s`#]/ig, '');

        // Allows Function notation in titles
        if (getFileName.match(/[\(]/)) {
          try {

            getFileName = getFileName.split('(')[0];
          } catch (grabFileNameError) {
            errors.push(grabFileNameError);
            console.log('Problem grabbing fileName in ', b, ':', grabFileNameError);
          }
        }

        // Allows Function notation in titles
        if (getFileName.match(/[\(]/))
          getFileName = getFileName.split('(')[0];

        // For Dynamic Finders
        if (getFileName.match(/[<]/))
          getFileName = getFileName.replace(/<[^]+?>/ig, '');

        var newFile = {
          templateConfig: {},
          templateTitle: getFileName,
          templateSectionName: sectionName,
          fullPathAndFileName: sectionPath + '/' + sectionNameNoSpace + '/' + getFileName + '.html',
          firstLineOfTemplate: firstLine,
          templateHTML: v
        };

        if (isParentTemplate === true) {
          newFile.isParentTemplate = true;
          isParentTemplate = false;
        }

        if (currentDocsObject.config.beforeConvert)
          newFile.templateConfig.beforeConvert = currentDocsObject.config.beforeConvert;

        if (currentDocsObject.config.afterConvert)
          newFile.templateConfig.afterConvert = currentDocsObject.config.afterConvert;

        thisDocsObject.populatedSections[sectionName].push(newFile);

        if (i === splitFiles.length - 1) {
          //console.log('on',splitFiles.length-1,'of',i,'of section',sectionName)

          return cb(newFile);
        }

      });

    };

    var afterEachSplit = function(newFileObject) {
      if (sectionsToSplit.length === 0) {
        //console.log('Done splitting all section.  Thank the lord');
        //console.log('\n\n',thisDocsObject.populatedSections,'\n\n')

        if (errors)
          return afterEachStep(errors, currentDocsObject);
        else
          return afterEachStep(null, currentDocsObject);

      } else {
        //console.log('\ndone splitting section\n');
        //console.log(thisDocsObject.populatedSections[newFileObject.templateSectionName]);
        doSectionSplit(sectionsToSplit.shift(), afterEachSplit);
      }
    };


    doSectionSplit(sectionsToSplit.shift(), afterEachSplit);

  };

  var returnResults = function(err, stuffCreated) {
    var sendErrors = null;
    if (err.length) {
      sendErrors = err;
      console.log('There was one or more errors processing docs...', err);
      //return finalCB(err)
    }
    //console.log('Done parsing',repoURL);
    return finalCB(sendErrors, stuffCreated);
  };

  var grabFolders = function(currentDocsObject) {

    var stripTree = function(cb) {
      var results = [];
      //console.log('\nChecking JSON tree for object with name:\n',currentDocsObject.config);

      //TODO: use a recursive search through the jsonTree to assign a value for currentTree.  This will allow the docs folder to be more than 1 level deep.

      var currentTree = currentDocsObject.jsonTreeOfRepo;


      for (var key in currentTree) {
        if (key.indexOf('.md') > 0 && key.substring(0, 1) !== '.') {
          currentTree[key]['savePath'] = currentDocsObject.config.parsedTemplatesDirectory;
          results.push(currentTree[key]);
        }
      }
      return cb(results);
    };

    stripTree(function addDocsFoldersToJsonTree(pluckedObjectsArray) {
      currentDocsObject.createTheseSections = pluckedObjectsArray;
      //console.log('\n\nPlucked These:',currentDocsObject.createTheseSections,'\n\n');
      return afterEachStep(null, currentDocsObject);
    });

  };

  var getPathTree = function(currentDocsObject) {

    //console.log('getting json tree for ',currentDocsObject.config.__docsRepoOnDisk,'\n\nconfig:',currentDocsObject.config);
    var jsonDir = require('jsondir');
    //jsonDir.dir2json(repoPathOnDisk,{ attributes: ['content', 'mode'] }, function(err, results) {
    var gotTree = function(err, results) {
      if (err) {
        console.log('There was an error getting the docs structure of', currentDocsObject.config.__docsRepoOnDisk);
        return afterEachStep(err, currentDocsObject);
      } else {
        //console.log('Created JSON representation of git directory');
        currentDocsObject.jsonTreeOfRepo = results;
        return afterEachStep(null, currentDocsObject);
      }
    };

    jsonDir.dir2json(currentDocsObject.config.__docsRepoOnDisk, {
      attributes: ['content', 'mode']
    }, gotTree);
  };

  var cloneRepo = function(currentDocsObject) {

    // TODO: if directory exists, do git pull instead
    // TODO: add support for branches

    // Make sure the .tmp directory exists so we can clone the repo in it
    var tmpDir = process.cwd() + '/.tmp/doc-templater/';
    if (!fs.existsSync(tmpDir))
      fs.mkdirsSync(tmpDir);

    process.chdir(tmpDir);

    var doClone = function(operationAndAruments) {

      var gitOperation = spawn('git', operationAndAruments);
      process.chdir(tmpDir);
      gitOperation.stdout.on('data', function(d) {
        console.log('\nInfo:' + d);
      });
      gitOperation.stderr.on('data', function(d) {
        console.log('\nStderr:' + d);
      });
      gitOperation.on('close', function(code) {
        process.chdir('../..');
        if (code === 0) {
          return afterEachStep(null, currentDocsObject);
        } else {
          console.log('Sorry Homie.  The building collapsed and i\'m left holding exit code ' + code);
          return afterEachStep(new Error('git clone exited with code' + code), currentDocsObject);
        }
      });
    };


    // Find the base git repo on disk then delete it and reclone.
    var __docsRepoOnDisk;
    if (currentDocsObject.config.__baseDocsRepoOnDisk) {
      __docsRepoOnDisk = currentDocsObject.config.__baseDocsRepoOnDisk;
    }
    else {
      __docsRepoOnDisk = currentDocsObject.config.__docsRepoOnDisk;
    }

    var fullGitPathOnDisk = tmpDir + currentDocsObject.config.__derivenRepoName;
    if (fs.existsSync(fullGitPathOnDisk)) {
      console.log(fullGitPathOnDisk, ' exists!  Lets pull down any new changes.');
      process.chdir(currentDocsObject.config.__derivenRepoName);
      doClone(['pull']);
    }
    else {
      console.log(fullGitPathOnDisk, 'hasnt been cloned yet.  I\'ll do that now!');
      doClone(['clone', currentDocsObject.config.docsGitRepo]);
    }

  };

  // called directly after each function in function array.


  var prepareThem = function(singleDocsObject) {

    var possibleOptions = ['addToSiteMap', 'prependPathAndName', 'docsGitRepo', 'dirNameInRepo', 'parsedTemplatesDirectory'];

    possibleOptions.forEach(function(option) {
      if (_.isUndefined(singleDocsObject[option])) {
        //console.log(option,'is undefined.  Next time i\'ll throw an error');
        singleDocsObject[option] = null;
      }
    });

    var returnThis = {
      config: {
        errors: [],
        results: []
      }
    };

    if (singleDocsObject.applyToTemplates) {
      returnThis.config.beforeConvert = singleDocsObject.applyToTemplates.beforeConvert;
      returnThis.config.afterConvert = singleDocsObject.applyToTemplates.afterConvert;
    }

    if (singleDocsObject.prependPathAndName === true)
      returnThis.config.prependPathAndName = true;
    else
      returnThis.config.prependPathAndName = false;

    if (singleDocsObject.addToSiteMap === true)
      returnThis.config.addToSiteMap = true;
    else
      returnThis.config.addToSiteMap = false;

    var repoURL = singleDocsObject.docsGitRepo;
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



    // TODO: chop off any characters indicating a particular branch and return warning that branches arent supported.
    returnThis.config.docsGitRepo = repoURL;

    var lastCharOfSaveDir = singleDocsObject.parsedTemplatesDirectory.substr(singleDocsObject.parsedTemplatesDirectory.length - 1);
    if (lastCharOfSaveDir === '/')
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory.substr(0, singleDocsObject.parsedTemplatesDirectory.length - 1);
    else
      returnThis.config.parsedTemplatesDirectory = singleDocsObject.parsedTemplatesDirectory;

    returnThis.config.toComplete = [cloneRepo, getPathTree, grabFolders, splitMDsIntoTemplates, writeTemplates];



    return returnThis;

  };

  // Cast `docsObjects` to an array.
  if (_.isArray(docsObjects)) {
    docsObjects = docsObjects;
  } else if (_.isPlainObject(docsObjects)) {
    docsObjects = [docsObjects];
  } else if (_.isFunction(docsObjects)) {
    console.log('docsDir is a function.  Something isnt right.');
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
    console.log('Done with ', finishedRepoName, '.\n\n');
    return processThisDocsObject(docsObjects.shift());
  };


  // TODO: Account for "docsObjects arrays" that share a repo.  Keep the script from cloning it multiple times.

  var processThisDocsObject = function(thisDocsObject) {
    if (!_.isUndefined(thisDocsObject)) {

      afterEachStep(null, prepareThem(thisDocsObject));

      //utils.cloneRepo(oneDocsObject,afterClone);

    } else {
      console.log('All Done with all docsObjects!');
      if (allErrors.length > 0)
        finalCB(allErrors, allResults);
      else
        finalCB(null, allResults);
    }

  };

  processThisDocsObject(docsObjects.shift());
  //  return finalCB(arrayOfFileSaveStates);

  //prepareThem

  /*
    1. prepareThem - Normalize all elements in docsObjects array
    2. cloneRepo - clone repo specified in docsObject
    3. getPathTree - create nested JSON representation of the newly cloned repo
    4. grabFolders - Iterate through the JSON representation of the git repo and return new object containing all files which should be parsed into templates
    5. writeToDisk - Pass each key/val in new JSON object to populateObject which Syncronously attaches the contents of the .md file from the docs repo that has been written to disk.
        Afterwards, writeToDisk merges all of the newly populated objects into one then passes them to writeTemplates
    6. writeTemplates - Iterates through JSON tree and passes each subsection (page) of each key (docs Section) to 'template'.  When every section/subsection has been returned, an array of 'file write statuses' is passed to returnResults 
    7. template - Receives the markdown for a particular subsection in the JSON tree, runs it through 'marked' which turns it into html, then writes that to disk.  It returns the write status to writeTemplates where its stored in an array.  
    8. returnResults - Passes two arrays to the use supplied callback.  The first array contains errors.  the second contains successes.


  Should be 

    1. prepareThem - prepare all elements in docsObjects array
    2. processThisDocsObject - start series
    3. cloneRepo
    4. getPathTree
    5. grabFolders
    6. writeToDisk - 
    7. populate -  
    8. writeTemplates
    9. returnResults
  */
};
