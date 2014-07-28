/**
 * Module dependencies
 */

var path = require('path');
var fsx = require('fs-extra');
var async = require('async');
var M = require('node-machine');
var buildJsmenu = require('./build-jsmenu');


/**
 * @submodule  compile-markdown-tree-from-remote-git-repo
 * @description  Clone a directory of markdown files from a git repository to a temporary path on disk, compile each .md file to HTML, then save the directory tree of compiled HTML to a path on disk.
 * @nosideeffects
 */

module.exports = function ($i, cb) {

  // • if >=1 required input was NOT specified, we send back an error.
  if (!$i.remote) return cb('Input "remote" is required.');

  // • default assumptions for optional inputs:
  if (!$i.remoteSubPath || $i.remoteSubPath === '.') $i.remoteSubPath = './';
  if (!$i.branch) $i.branch = 'master';

  // If cachePath or htmlDirPAth are unspecified, generate unique paths for remote/branch/subdir
  var tmpPath;
  tmpPath = $i.remote.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  tmpPath = path.join(tmpPath, $i.branch.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  // tmpPath = path.join(tmpPath, ($i.remoteSubPath==='./') ? '' : $i.remoteSubPath);
  // console.log('tmpPath: %s', tmpPath);
  // return cb();
  // var slug = remoteSlug + '__' + branchSlug + '__' + remoteSubPathSlug;

  // var remoteSlug =  $i.remote.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  // var branchSlug = $i.branch.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  // var remoteSubPathSlug = ($i.remoteSubPath==='./') ? '' : ($i.remoteSubPath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  // var slug = remoteSlug + '__' + branchSlug + '__' + remoteSubPathSlug;

  if (!$i.cachePath) {
    $i.cachePath = path.resolve('.tmp', path.join('doc-templater', tmpPath));
  }
  if (!$i.htmlDirPath) {
    $i.htmlDirPath = path.resolve('.tmp', path.join('doc-templater', tmpPath.replace(/\/*$/,'') + '-html-output/'));
  }
  if (!$i.jsMenuPath) {
    $i.jsMenuPath = path.join(path.dirname($i.htmlDirPath), path.basename($i.htmlDirPath)+'.jsmenu');
  }

  // *** if `dontPullOrClone` is enabled, skip the pull/clone step ****
  var _pullOrClone = $i.dontPullOrClone ? function (_onwards){ return _onwards(); }
  : function (_onwards) {
    M.load('machinepack-git/pull-or-clone')
    .configure({
      remote: $i.remote,
      branch: $i.branch,
      remoteSubPath: $i.remoteSubPath,
      dir: $i.cachePath
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
    M.load('machinepack-fs/ls')
    .configure({
      dir: path.resolve($i.cachePath, $i.remoteSubPath)
    })
    .exec(function(err, tree) {
      if (err) return cb(err);

      var _templates = [];
      var _failures = [];
      var htmlTree = [];
      
      // • Now compile each markdown file
      async.eachLimit(tree, 15, function(pathToMdFile, cb) {

        // Build output path for compiled HTML by
        // (1) first determining the relpath of `pathToMdFile` from `$i.cachePath`
        var relPathFromCacheDir = path.relative(path.resolve($i.cachePath, $i.remoteSubPath||'./'), path.resolve(pathToMdFile));
        // (2) then building a path starting in $i.htmlDirPath
        var relPathFromHtmlDir = path.join(path.resolve($i.htmlDirPath), relPathFromCacheDir);

        // Skip hidden directories and files within the relative path
        // (e.g. ".git", ".git/hooks", "foo/.git", "foo/.git/hooks", "foo/bar/.baz.js", etc.)
        if (!!relPathFromCacheDir.match(/(^|\/)\.[^\/\.]+(\/|$)/)) {
          return cb();
        }

        // Rename the path to have a ".html" file extension
        var outputHTMLFilePath = path.join(path.dirname(relPathFromHtmlDir), path.basename(relPathFromHtmlDir, '.md')) + '.html';


        // Don't push folders onto the HTML tree, or convert them to HTML.
        // (they're taken care of when the overview page that represents the is detected below)
        if (pathToMdFile.match(/\/$/)) return cb();

        // (used below to handle various exits of the compile-from-file-to-file machine)
        function _handleFailure(err){
          _failures.push({
            src: pathToMdFile,
            dest: outputHTMLFilePath,
            error: err
          });
          cb();
        }

        M.load('machinepack-markdown/compile-from-file-to-file')
        .configure({
          src: pathToMdFile,
          dest: outputHTMLFilePath,
          beforeConvert: $i.beforeConvert,
          afterConvert: $i.afterConvert
        })
        .exec({
          error: _handleFailure,
          couldNotRead: _handleFailure,
          couldNotWrite: _handleFailure,
          couldNotCompile: _handleFailure,
          success: function(templateMetadata) {

            // Skip files that don't end in `.md`
            if (path.extname(pathToMdFile) !== '.md') return cb();

            // If an overview page was discovered, push the appropriate folder onto the html tree
            // for use in processing the jsmenu.
            var representedFolderName = path.basename(pathToMdFile, '.md');
            if (pathToMdFile.indexOf(path.join(representedFolderName,representedFolderName+'.md')) !== -1) {

              // Make path relative from htmlDirPath
              var relOutputHTMLFileOverviewPath = path.relative(path.resolve($i.htmlDirPath), outputHTMLFilePath);

              // For compatibility w/ existing doc-templater integrations, prefix these paths
              // w/ the folder name (this is not strictly necessary for the jsmenu to work.)
              relOutputHTMLFileOverviewPath = path.join(path.basename($i.htmlDirPath), relOutputHTMLFileOverviewPath);
              
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
            var relOutputHTMLFilePath = path.relative(path.resolve($i.htmlDirPath), outputHTMLFilePath);

            // For compatibility w/ existing doc-templater integrations, prefix these paths
            // w/ the folder name (this is not strictly necessary for the jsmenu to work.)
            relOutputHTMLFilePath = path.join(path.basename($i.htmlDirPath), relOutputHTMLFilePath);

            // Push modified dest path for HTML files onto the html tree for use in building the jsMenuPath
            htmlTree.push({
              templateTitle: path.basename(outputHTMLFilePath),
              fullPathAndFileName: relOutputHTMLFilePath,
              data: templateMetadata
            });

            return cb();
          }
        });

      }, function(err) {
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
        fsx.outputFile($i.jsMenuPath, jsmenuString, function(err) {
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
    
