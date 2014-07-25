/**
 * Module dependencies
 */

var fsx = require('fs-extra');
var async = require('async');
var M = require('node-machine');


/**
 * @submodule  compile-markdown-tree-from-remote-git-repo
 * @description  Clone a directory of markdown files from a git repository to a temporary path on disk, compile each .md file to HTML, then save the directory tree of compiled HTML to a path on disk.
 * @nosideeffects
 */

module.exports = function ($i, $x) {

  // • if "remote" was NOT specified, we send back an error.
  if (!$i.remote) return $x('Input "remote" is required.');

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
        dir: require('path').resolve($i.cachePath, $i.remoteSubPath||'./')
      })
      .exec(function(err, tree) {
        if (err) return $x(err);

        var _templates = [];
        var _failures = [];
        
        // • Now compile each markdown file
        async.each(tree, function(pathToMdFile, cb) {

          // TODO: strip off `$i.cachePath` from `pathToMdFile` to make it relative
          var _treeRelativePath = 'RELATIVE_DEST_PATH_FOR_THIS_ITEM_GOES_HERE';
          var _pathToDest = require('path').join($i.htmlDirPath, _treeRelativePath);

          function _handleFailure(err){
            _failures.push({
              src: pathToMdFile,
              dest: _pathToDest,
              error: err
            });
            cb();
          }

          M.load('machinepack-markdown/compile-markdown-file')
          .configure({
            src: pathToMdFile,
            dest: _pathToDest,
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

          // • send the bytes of the jsmenu we built earlier to the path on disk
          //   specified by `dest.jsmenu`
          fsx.writeFile($i.jsMenuPath, function(err) {
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


    
