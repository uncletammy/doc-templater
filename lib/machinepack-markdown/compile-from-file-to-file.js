/**
 *
 * ----------------------------------------
 * Usage:
 * 
 * require('node-machine')
 * .load('./lib/compile-from-file-to-file')
 * .configure(...)
 * .exec(...)
 */

module.exports = {

  id: 'compile-from-file-to-file',
  moduleName: 'machinepack-markdown',
  description: 'Load a markdown file from disk, compile to HTML, then save it back to disk.',
  //
  // Steps:
  // ======
  // 
  // • stream bytes from disk
  // 
  // • when all bytes are in RAM, call the `beforeConvert()` lifecycle
  //   hook (if one exists) to perform an optional transformation of the
  //   markdown string.
  // 
  // • convert the (possibly now-transformed) markdown to HTML
  // 
  // • call the `afterConvert()` lifecycle hook (if one exists) to perform
  //   an optional transformation of the HTML string.
  //   
  // • send the bytes of the (possibly now-transformed) HTML to the path on
  //   disk specified by `dest.html` as a write stream.  When the stream
  //   finishes, call the async callback to signal that this markdown file
  //   has been compiled to HTML and written to disk successfully.
  // 
  // • if any error occurs, bail out of trying to compile/write this particular
  //   template file and push it to an error stack for this build step which is
  //   available in closure scope.  It will be handled later, but shouldn't prevent
  //   the other template files from being compiled/written.
  // 
  dependencies: {
    'node-machine': '*',
    'fs-extra': '*'
  },
  inputs: {
    src: {
      example: '.tmp/compile-markdown-tree/some/markdown/file.md'
    },
    dest: {
      example: '.tmp/public/templates/documentation/reference'
    },
    beforeConvert: {
      example: function(mdString, cb) {
        cb(null, mdString);
      }
    },
    afterConvert: {
      example: function(htmlString, cb) {
        cb(null, htmlString);
      }
    }
  },
  exits: {
    error: {},
    couldNotRead: {},
    couldNotWrite: {},
    couldNotCompile: {},
    success: {}
  },

  fn: function($i, $x, $d) {

    var fsx = $d['fs-extra'];
    var M = $d['node-machine'];

    $i.beforeConvert = $i.beforeConvert || function (mdString, cb){ cb(null, mdString); };
    $i.afterConvert  = $i.afterConvert  || function (htmlString, cb){ cb(null, htmlString); };

    fsx.readFile($i.src, 'utf8', function(err, mdString) {
      if (err) return $x.couldNotRead(err);

      $i.beforeConvert(mdString, function(err, mdString) {
        if (err) return $x.couldNotCompile(err);

        M.require('./compile').configure({mdString:mdString}).exec(function(err, htmlString) {
          if (err) return $x.couldNotCompile(err);

          $i.afterConvert(htmlString, function(err, htmlString) {
            if (err) return $x.couldNotCompile(err);

            fsx.writeFile($i.dest, htmlString, function(err) {
              if (err) return $x.couldNotWrite(err);
              return $x.success();
            });
          });
        });
      });
    });
  }
};
