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

module.exports = function ($i, $x) {

  // • if "remote" was NOT specified, we send back an error.
  if (!$i.remote) return $x('Input "remote" is required.');

  console.log('pulling or cloning...');

  // • if a "remote" was specified, use `git` to clone or pull from the remote
  //   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
  //   option is set for this particular src. In that case we should prompt the user
  //   about whether she actually wants to wipe the repo.
  M.load('machinepack-git/pull-or-clone')
  .configure({
    remote: $i.remote,
    remoteSubPath: $i.remoteSubPath,
    dir: $i.cachePath
  })
  .exec({
    error: $x,
    success: function() {


      // • now that we have the `src` markdown files locally and ready to go,
      //   we parse the directory tree, starting from the configured `path`
      //   (or defaulting to the root of the repository)
      //   This builds a POJA (`tree`) containing the file hierarchy- but containing
      //   ONLY the markdown files.  This will eventually become the ".jsmenu" file
      //   for this build step.
      M.load('machinepack-fs/ls')
      .configure({
        dir: path.resolve($i.cachePath, $i.remoteSubPath||'./')
      })
      .exec(function(err, tree) {
        if (err) return $x(err);

        var _templates = [];
        var _failures = [];

        console.log('TREE (%s):',path.resolve($i.cachePath, $i.remoteSubPath||'./'),tree);


        var htmlTree = [];
        
        // • Now compile each markdown file
        async.each(tree, function(pathToMdFile, cb) {

          // Skip hidden directories and files
          if (!!pathToMdFile.match(/\/\.[^\/]/g)) return cb();

          // Build output path for compiled HTML by
          // (1) first determining the relpath of `pathToMdFile` from `$i.cachePath`
          var relPathFromCacheDir = path.relative(path.resolve($i.cachePath, $i.remoteSubPath||'./'), path.resolve(pathToMdFile));
          // (2) then building a path starting in $i.htmlDirPath
          var outputHTMLFilePath = path.join(path.resolve($i.htmlDirPath), relPathFromCacheDir);

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

          // (3) finally rename the file to have a ".html" file extension
          outputHTMLFilePath = path.join(path.dirname(outputHTMLFilePath), path.basename(outputHTMLFilePath, '.md')) + '.html';

          // Skip files that don't end in `.md`
          if (path.extname(pathToMdFile) !== '.md') return cb();

          // Skip overview files (they're covered automatically by the directory parsing above)
          var theFilename = path.basename(pathToMdFile, '.md');
          // console.log('looking for %s in "%s"',path.join(theFilename,theFilename+'.md'), pathToMdFile);
          if (pathToMdFile.indexOf(path.join(theFilename,theFilename+'.md')) !== -1) {
            return cb();
          }

          // Skip hidden directories and files
          // if (!!pathToMdFile.match(/\/\.[^\/]/g)) return cb();
          
          // Make path relative from htmlDirPath
          var relOutputHTMLFilePath = path.relative(path.resolve($i.htmlDirPath), outputHTMLFilePath);

          // Push modified dest path for HTML files onto the html tree for use in building the jsMenuPath
          htmlTree.push({
            templateTitle: path.basename(outputHTMLFilePath),
            fullPathAndFileName: relOutputHTMLFilePath,
            data: {
              displayName: path.basename(outputHTMLFilePath) // TODO: read metas
            }
          });

          // console.log('pathToMdFile:',pathToMdFile);
          // console.log('RELATIVE TO:',path.resolve($i.cachePath, $i.remoteSubPath||'./'));
          // console.log('relative path from md/repo cache dir:',relPathFromCacheDir);
          // console.log('htmlDirPath:',path.resolve($i.htmlDirPath));
          // console.log('outputHTMLFilePath:',outputHTMLFilePath);

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
            success: function() { cb(); }
          });
        }, function(err) {
          if (err) return $x(err);

          // Build and stringify the js menu
          var jsmenuString;
          try {
            jsmenuString = JSON.stringify(buildJsmenu(htmlTree), false, 2);
          }
          catch (e) {
            return $x(e);
          }

          // • send the bytes of the jsmenu we built earlier to the path on disk
          //   specified by `dest.jsmenu`
          fsx.outputFile($i.jsMenuPath||'tmp.jsmenu', jsmenuString, function(err) {
            if (err) return ($x.couldNotWriteJsMenu&&$x.couldNotWriteJsMenu(err))||$x(err);

            // • when all HTML output write streams finish, and the jsmenu write stream
            //   has finished, call the callback to signal that this particular build step
            //   is complete.
            return $x(null,{
              failures: _failures,
              templates: _templates
            });
          });

        });

      });

    }
  });
};






// };



// module.exports = {

//   id: 'compile-markdown-tree-from-remote-git-repo',
//   moduleName: 'machinepack-markdown',
//   description: 'Clone a directory of markdown files from a git repository to a temporary path on disk, compile each .md file to HTML, then save the directory tree of compiled HTML to a path on disk.',
//   dependencies: {
//     'fs-extra': '*',
//     'node-machine': '*'
//   },
//   transparent: true,
//   inputs: {
//     src: {
//       example: {
//         remote: 'git://github.com/balderdashy/sails-docs.git',
//         remoteSubPath: 'reference/',
//       }
//     },
//     cachePath: {
//       example: '.tmp/compile-markdown-tree/balderdashy/sails-docs/reference'
//     },
//     dest: {
//       example: {
//         html: '.tmp/public/templates/documentation/reference',
//         jsmenu: '.tmp/public/templates/jsmenus/reference.jsmenu'
//       }
//     },
//     beforeConvert: function(mdString, cb) {
//       cb(null, mdString);
//     },
//     afterConvert: function(htmlString, cb) {
//       cb(null, htmlString);
//     }
//   },
//   exits: {
//     error: {},
//     couldNotWriteJsMenu: {},
//     success: {}
//   },

  // fn: function($i, $x, $d) {


    
