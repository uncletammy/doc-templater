/**
 * Module dependencies
 */

var path = require('path');
var _ = require('lodash');
var async = require('async');
var fsx = require('fs-extra');
var Git = require('machinepack-git');
var Markdown = require('machinepack-markdown');
var Filesystem = require('machinepack-fs');
var Process = require('machinepack-process');
var buildJsmenu = require('./build-jsmenu');


/**
 * @submodule  compile-markdown-tree-from-remote-git-repo
 * @description  Clone a directory of markdown files from a git repository to a temporary path on disk, compile each .md file to HTML, then save the directory tree of compiled HTML to a path on disk.
 * @nosideeffects
 */

module.exports = function (inputs, cb) {

  // Ensure lifecycle callbacks exist.
  inputs.beforeConvert = inputs.beforeConvert || function (mdString, cb){ cb(null, mdString); };
  inputs.afterConvert  = inputs.afterConvert  || function (htmlString, cb){ cb(null, htmlString); };

  // • if >=1 required input was NOT specified, we send back an error.
  if (!inputs.remote) return cb('Input "remote" is required.');

  // • default assumptions for optional inputs:
  if (!inputs.remoteSubPath || inputs.remoteSubPath === '.') inputs.remoteSubPath = './';
  if (!inputs.branch) inputs.branch = 'master';

  // If cachePath or htmlDirPAth are unspecified, generate unique paths for remote/branch/subdir
  var tmpPath;
  tmpPath = inputs.remote.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  tmpPath = path.join(tmpPath, inputs.branch.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  // tmpPath = path.join(tmpPath, (inputs.remoteSubPath==='./') ? '' : inputs.remoteSubPath);
  
  // console.log('tmpPath: %s', tmpPath);
  // return cb();
  // var slug = remoteSlug + '__' + branchSlug + '__' + remoteSubPathSlug;

  // var remoteSlug =  inputs.remote.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  // var branchSlug = inputs.branch.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  // var remoteSubPathSlug = (inputs.remoteSubPath==='./') ? '' : (inputs.remoteSubPath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  // var slug = remoteSlug + '__' + branchSlug + '__' + remoteSubPathSlug;

  if (!inputs.cachePath) {
    inputs.cachePath = path.resolve('.tmp', path.join('doc-templater', tmpPath));
  }
  if (!inputs.htmlDirPath) {
    inputs.htmlDirPath = path.resolve('.tmp', path.join('doc-templater', tmpPath.replace(/\/*$/,'') + '-html-output/'));
  }
  if (!inputs.jsMenuPath) {
    inputs.jsMenuPath = path.join(path.dirname(inputs.htmlDirPath), path.basename(inputs.htmlDirPath)+'.jsmenu');
  }

  // *** if `dontPullOrClone` is enabled, skip the pull/clone step ****
  var _pullOrClone = inputs.dontPullOrClone ? function (_onwards){ return _onwards(); }
  : function (_onwards) {
    Git.pullOrClone({
      remote: inputs.remote,
      branch: inputs.branch,
      destination: require('path').resolve(inputs.cachePath)
    })
    .exec(_onwards);
  };

  // • if a "remote" was specified, use `git` to clone or pull from the remote
  //   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
  //   option is set for this particular src. In that case we should prompt the user
  //   about whether she actually wants to wipe the repo.
  _pullOrClone(function (err) {
    if (err) return cb(err);

    // • now that we have the `src` markdown files locally and ready to go,
    //   we parse the directory tree, starting from the configured `path`
    //   (or defaulting to the root of the repository)
    //   This builds a POJA (`tree`) containing the file hierarchy- but containing
    //   ONLY the markdown files.  This will eventually become the ".jsmenu" file
    //   for this build step.
    Filesystem.ls({
      dir: path.resolve(inputs.cachePath, inputs.remoteSubPath)
    })
    .exec(function(err, tree) {
      if (err) return cb(err);

      var _templates = [];
      var _failures = [];
      var htmlTree = [];
      









      // • Now compile each markdown file
      ////////////////////////////////////////////////////////////////////////////////
      async.eachLimit(tree, 15, function(pathToMdFile, cb) {

        // Build output path for compiled HTML by
        // (1) first determining the relpath of `pathToMdFile` from `inputs.cachePath`
        var relPathFromCacheDir = path.relative(path.resolve(inputs.cachePath, inputs.remoteSubPath||'./'), path.resolve(pathToMdFile));
        // (2) then building a path starting in inputs.htmlDirPath
        var relPathFromHtmlDir = path.join(path.resolve(inputs.htmlDirPath), relPathFromCacheDir);

        if (!!relPathFromCacheDir.match(/(^|\/)\.[^\/\.]+(\/|$)/)) {
          return cb();
        }

        // Skip explicitly-called-out directories from the relative path
        var blacklist = [
          // Skip hidden directories and files within the relative path
          // (e.g. ".git", ".git/hooks", "foo/.git", "foo/.git/hooks", "foo/bar/.baz.js", etc.)
          /(^|\/)\.[^\/\.]+(\/|$)/,
          // Skip the node_modules folder
          /(^|\/)node_modules(\/|$)/
        ];
        if (_.any(blacklist, function (blacklistedFileOrDirRegexp){
          return relPathFromCacheDir.match(blacklistedFileOrDirRegexp);
        })){
          return cb();
        }

        // Rename the path to have the appropriate file extension (usually ".html")
        var outputHTMLFilePath = path.join(path.dirname(relPathFromHtmlDir), path.basename(relPathFromHtmlDir, '.md')) + '.' + (inputs.outputExtension||'html');


        // Don't push folders onto the HTML tree, or convert them to HTML.
        // (they're taken care of when the overview page that represents the is detected below)
        if (pathToMdFile.match(/\/$/)) return cb();


        // Read file located at source path on disk into a string.
        Filesystem.read({
          source: pathToMdFile,
        }).exec({
        
          error: function (err){
            _failures.push({
              src: pathToMdFile,
              dest: outputHTMLFilePath,
              type: 'Could not read markdown file at '+pathToMdFile,
              error: err
            });
            return cb();
          },
        
          // No file exists at the provided `source` path
          doesNotExist: function (err){
            _failures.push({
              src: pathToMdFile,
              dest: outputHTMLFilePath,
              type: 'No markdown file exists at '+pathToMdFile,
              error: err
            });
            return cb();
          },
        
          // Returns the contents of the file at `source` path
          success: function (markdownStr){

            inputs.beforeConvert(markdownStr, function (err, markdownStr) {
              if (err) {
                _failures.push({
                  src: pathToMdFile,
                  dest: outputHTMLFilePath,
                  type: 'error running `beforeConvert`',
                  error: err
                });
                return cb();
              }

              // Parse metadata from the markdown
              Markdown.parseDocmetaTags({
                mdString: markdownStr
              }).exec({

                error: function (err){
                  _failures.push({
                    src: pathToMdFile,
                    dest: outputHTMLFilePath,
                    type: 'Could not parse docmeta tags from md file at '+pathToMdFile,
                    error: (function(){ try{return err.stack;}catch(e){}})() || err
                  });
                  return cb();
                },

                // Metadata parsed successfully
                success: function (templateMetadata){

                  // Compile some markdown to HTML.
                  Markdown.compileToHtml({
                    mdString: markdownStr,
                    ignoreHtml: false,
                  }).exec({
                  
                    error: function (err){
                      _failures.push({
                        src: pathToMdFile,
                        dest: outputHTMLFilePath,
                        type: 'Could not convert markdown file at '+pathToMdFile,
                        error: err
                      });
                      return cb();
                    },
                  
                    // Converted successfully
                    success: function (resultHtml){

                      inputs.afterConvert(resultHtml, function (err, resultHtml) {
                        if (err) {
                          _failures.push({
                            src: pathToMdFile,
                            dest: outputHTMLFilePath,
                            type: 'error running `afterConvert`',
                            error: err
                          });
                          return cb();
                        }


                        // Generate a file on the local filesystem using the specified utf8 string as its contents.
                        Filesystem.write({
                          string: resultHtml,
                          destination: outputHTMLFilePath,
                          force: false,
                        }).exec({
                        
                          error: function (err){
                            _failures.push({
                              src: pathToMdFile,
                              dest: outputHTMLFilePath,
                              type: 'Could not save new HTML template at '+outputHTMLFilePath,
                              error: err
                            });
                            return cb();
                          },
                        
                          // Something already exists at the specified path (overwrite by enabling the `force` input)
                          alreadyExists: function (err){
                            _failures.push({
                              src: pathToMdFile,
                              dest: outputHTMLFilePath,
                              type: 'Something already exists at '+outputHTMLFilePath,
                              error: err
                            });
                            return cb();
                          },

                          success: function (){

                            // Put templateMetadata into object format
                            templateMetadata = _.reduce(templateMetadata, function (memo, item) {
                              memo[item.name] = item.value;
                              return memo;
                            }, {});

                            // ---------------------------------------------------------------------------
                            // TODO: look up last modified date using `git log -1 --format="%ad" rel/path/to/file`
                            // and attach it to the template metadata
                            // ---------------------------------------------------------------------------

                            // Skip files that don't end in `.md`
                            if (path.extname(pathToMdFile) !== '.md') return cb();

                            // If an overview page was discovered, push the appropriate folder onto the html tree
                            // for use in processing the jsmenu.
                            var representedFolderName = path.basename(pathToMdFile, '.md');
                            if (pathToMdFile.indexOf(path.join(representedFolderName,representedFolderName+'.md')) !== -1) {

                              // Make path relative from htmlDirPath
                              var relOutputHTMLFileOverviewPath = path.relative(path.resolve(inputs.htmlDirPath), outputHTMLFilePath);

                              // For compatibility w/ existing doc-templater integrations, prefix these paths
                              // w/ the folder name (this is not strictly necessary for the jsmenu to work.)
                              relOutputHTMLFileOverviewPath = path.join(path.basename(inputs.htmlDirPath), relOutputHTMLFileOverviewPath);
                              
                              // Build the "realPath" (the path to the directory represented by this overview template)
                              // And make sure there is a trailing slash, since this is a directory
                              // (jsmenu will not be built correctly if this is not the case)
                              var relOutputHTMLSubdirectoryPath = path.dirname(relOutputHTMLFileOverviewPath).replace(/\/*$/, '/');

                              // Build overview tpl path (may or may not actually exist-- that's ok)
                              // var pathToOverviewTpl = path.join(relHtmlSubfolderPath, path.basename(relHtmlSubfolderPath)+'.html');
                              htmlTree.push({
                                templateTitle: path.basename(relOutputHTMLFileOverviewPath),
                                fullPathAndFileName: relOutputHTMLFileOverviewPath,
                                realPath: relOutputHTMLSubdirectoryPath,
                                data: templateMetadata
                              });
                              return cb();
                            }

                            // Make path relative from htmlDirPath
                            var relOutputHTMLFilePath = path.relative(path.resolve(inputs.htmlDirPath), outputHTMLFilePath);

                            // For compatibility w/ existing doc-templater integrations, prefix these paths
                            // w/ the folder name (this is not strictly necessary for the jsmenu to work.)
                            relOutputHTMLFilePath = path.join(path.basename(inputs.htmlDirPath), relOutputHTMLFilePath);

                            // Push modified dest path for HTML files onto the html tree for use in building the jsMenuPath
                            htmlTree.push({
                              templateTitle: path.basename(outputHTMLFilePath),
                              fullPathAndFileName: relOutputHTMLFilePath,
                              data: templateMetadata
                            });

                            return cb();

                          }//</Filesystem.write().exec() :: success >
                        
                        });//</Filesystem.write().exec()>
                      });
                    },
                  });
                }
              });
            });
          },
        });

      }, // </async.eachLimit>
      ////////////////////////////////////////////////////////////////////////////////






      function afterAsyncEachLimit(err) {
        if (err) return cb(err);

        // Build and stringify the js menu
        var jsmenuString;
        try {
          jsmenuString = JSON.stringify(buildJsmenu(htmlTree), false, 2);
        }
        catch (e) {
          return cb(e);
        }

        // • send the bytes of the jsmenu we built earlier to the path on disk
        //   specified by `dest.jsmenu`
        fsx.outputFile(inputs.jsMenuPath, jsmenuString, function(err) {
          if (err) return cb(err);

          // • when all HTML output write streams finish, and the jsmenu write stream
          //   has finished, call the callback to signal that this particular build step
          //   is complete.
          return cb(null,{
            failures: _failures,
            templates: _templates
          });
        });

      });

    });
  });

};
    
