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

  // Generate unique slug for remote+branch+subdir
  var remoteSlug =  $i.remote.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  var branchSlug = $i.branch.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  var remoteSubPathSlug = ($i.remoteSubPath==='./') ? '' : ($i.remoteSubPath.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  var slug = remoteSlug + '__' + branchSlug + '__' + remoteSubPathSlug;

  if (!$i.cachePath) {
    $i.cachePath = path.resolve('.tmp', path.join('doc-templater', slug));
  }
  if (!$i.htmlDirPath) {
    $i.htmlDirPath = path.resolve('.tmp', path.join('doc-templater', slug + '-html-output/'));
  }
  if (!$i.jsMenuPath) {
    $i.jsMenuPath = path.join(path.dirname($i.htmlDirPath), path.basename($i.htmlDirPath)+'.jsmenu');
  }


  // • if a "remote" was specified, use `git` to clone or pull from the remote
  //   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
  //   option is set for this particular src. In that case we should prompt the user
  //   about whether she actually wants to wipe the repo.
  M.load('machinepack-git/pull-or-clone')
  .configure({
    remote: $i.remote,
    branch: $i.branch,
    remoteSubPath: $i.remoteSubPath,
    dir: $i.cachePath
  })
  .exec({
    error: cb,
    success: function() {


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
          var outputHTMLFilePath = path.join(path.resolve($i.htmlDirPath), relPathFromCacheDir);

          // Skip hidden directories and files within the relative path
          // (e.g. ".git", ".git/hooks", "foo/.git", "foo/.git/hooks", "foo/bar/.baz.js", etc.)
          if (!!relPathFromCacheDir.match(/(^|\/)\.[^\/\.]+(\/|$)/)) {
            return cb();
          }

          // Push folders onto the html tree for use in processing the jsmenu
          if (pathToMdFile.match(/\/$/)){
            var htmlSubfolderPath = path.join(path.dirname(outputHTMLFilePath), path.basename(outputHTMLFilePath))+'/';
            
            // Make htmlSubfolderPath relative from outputHTMLFile path
            var relHtmlSubfolderPath = path.relative(path.resolve($i.htmlDirPath), htmlSubfolderPath);
            // Ensure trailing slash
            relHtmlSubfolderPath = relHtmlSubfolderPath.replace(/\/*$/, '/');
            // console.log('relative from %s to %s is "%s": ',path.resolve($i.htmlDirPath), htmlSubfolderPath, relHtmlSubfolderPath);
            
            // Build overview tpl path (may or may not actually exist-- that's ok)
            var pathToOverviewTpl = path.join(relHtmlSubfolderPath, path.basename(relHtmlSubfolderPath)+'.html');
            htmlTree.push({
              templateTitle: path.basename(relHtmlSubfolderPath),
              fullPathAndFileName: pathToOverviewTpl,
              realPath: relHtmlSubfolderPath,
              data: {
                displayName: path.basename(relHtmlSubfolderPath) // TODO: read metas
              }
            });
            return cb();
          }

          // Skip files that don't end in `.md`
          if (path.extname(pathToMdFile) !== '.md') return cb();

          // (3) finally rename the file to have a ".html" file extension
          outputHTMLFilePath = path.join(path.dirname(outputHTMLFilePath), path.basename(outputHTMLFilePath, '.md')) + '.html';

          // Make path relative from htmlDirPath
          var relOutputHTMLFilePath = path.relative(path.resolve($i.htmlDirPath), outputHTMLFilePath);


          // Don't push overview files onto the HTML tree
          // (they're taken care of when the directory they represent is detected above)
          var theFilename = path.basename(pathToMdFile, '.md');
          // console.log('looking for %s in "%s"',path.join(theFilename,theFilename+'.md'), pathToMdFile);
          if (pathToMdFile.indexOf(path.join(theFilename,theFilename+'.md')) !== -1) {
            // Push modified dest path for HTML files onto the html tree for use in building the jsMenuPath
            htmlTree.push({
              templateTitle: path.basename(outputHTMLFilePath),
              fullPathAndFileName: relOutputHTMLFilePath,
              data: {
                displayName: path.basename(outputHTMLFilePath) // TODO: read metas
              }
            });
          }

          // (used below to handle various exits of the compile-from-file-to-file machine)
          function _handleFailure(err){
            _failures.push({
              src: pathToMdFile,
              dest: outputHTMLFilePath,
              error: err
            });
            cb();
          }

          // console.log('COMPILING tpl from %s to %s...',pathToMdFile, outputHTMLFilePath);
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
            success: function() { cb(); }
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

    }
  });
};

    
