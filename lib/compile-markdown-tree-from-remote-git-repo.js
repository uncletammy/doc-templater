/**
 *
 * ----------------------------------------
 * Usage:
 *
 * require('node-machine')
 * .load('compile-markdown-tree-from-remote-git-repo')
 * .configure(...)
 * .exec(...)
 */

module.exports = {

  id: 'compile-markdown-tree-from-remote-git-repo',
  moduleName: 'machinepack-markdown',
  description: 'Clone a directory of markdown files from a git repository to a temporary path on disk, compile each .md file to HTML, then save the directory tree of compiled HTML to a path on disk.',
  dependencies: {
    'fs-extra': '*',
    'node-machine': '*'
  },
  transparent: true,
  inputs: {
    src: {
      example: {
        remote: 'git://github.com/balderdashy/sails-docs.git',
        path: 'reference/',
      }
    },
    cachePath: {
      example: '.tmp/compile-markdown-tree/balderdashy/sails-docs/reference'
    },
    dest: {
      example: {
        html: '.tmp/public/templates/documentation/reference',
        jsmenu: '.tmp/public/templates/jsmenus/reference.jsmenu'
      }
    },
    beforeConvert: function(mdString, cb) {
      cb(null, mdString);
    },
    afterConvert: function(htmlString, cb) {
      cb(null, htmlString);
    }
  },
  exits: {
    error: {},
    couldNotWriteJsMenu: {},
    success: {}
  },

  fn: function($i, $x, $d) {

    var fsx = $d['fs-extra'];
    var Machine = $d['node-machine'];


    // • if "remote" was NOT specified, we send back an error.
    if (!$i.remote) return $x.error(err);

    // • if a "remote" was specified, use `git` to clone or pull from the remote
    //   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
    //   option is set for this particular src. In that case we should prompt the user
    //   about whether she actually wants to wipe the repo.
    Machine.load('machinepack-git/pull-or-clone')
    .configure({
      remote: $i.src.remote,
      path: $i.src.path,
      dest: $i.cachePath
    })
    .exec({
      error: $x.error,
      success: function() {

        // • now that we have the `src` markdown files locally and ready to go,
        //   we parse the directory tree, starting from the configured `path`
        //   (or defaulting to the root of the repository)
        Machine.load('machinepack-fs/ls')
        .configure({
          dir: require('path').resolve($i.cachePath, $i.src.path)
        })
        .exec(function(err, tree) {
          if (err) return $x.error(err);

          //   
          // • we build a POJO containing the file hierarchy- but containing ONLY the
          //   markdown files.  This will eventually become the ".jsmenu" file for this
          //   build step.

          // • Now compile each markdown file
          var _templates = [];
          var _failures = [];
          $d.async.each(tree, function(pathToMdFile, cb) {
            // TODO:
            var _treeRelativePath = 'RELATIVE_DEST_PATH_FOR_THIS_ITEM_GOES_HERE';
            var _pathToDest = $i.dest.html += _treeRelativePath;

            Machine.load('./compile-markdown-file')
            .configure({
              src: pathToMdFile,
              dest: _pathToDest,
              beforeConvert: $i.beforeConvert,
              afterConvert: $i.afterConvert
            })
            .exec({
              error: function(err) {
                _failures.push({
                  src: pathToMdFile,
                  dest: _pathToDest,
                  error: err
                });
                cb();
              },
              couldNotRead: function(err) {
                _failures.push({
                  src: pathToMdFile,
                  dest: _pathToDest,
                  error: err
                });
                cb();
              },
              couldNotWrite: function(err) {
                _failures.push({
                  src: pathToMdFile,
                  dest: _pathToDest,
                  error: err
                });
                cb();
              },
              couldNotCompile: function(err) {
                _failures.push({
                  src: pathToMdFile,
                  dest: _pathToDest,
                  error: err
                });
                cb();
              },
              success: function() {
                cb();
              }
            });
          }, function(err) {
            if (err) return $x.error(err);

            // • send the bytes of the jsmenu we built earlier to the path on disk
            //   specified by `dest.jsmenu`
            $d.fsx.writeFile($d.dest.jsmenu, function(err) {
              if (err) return $x.couldNotWriteJsMenu(err);

              // • when all HTML output write streams finish, and the jsmenu write stream
              //   has finished, call the callback to signal that this particular build step
              //   is complete.
              return $x.success({
                failures: _failures,
                templates: _templates
              });
            });

          });

        });

      }
    });
  }
};
