/**
 * Module dependencies
 */

var MARKED_OPTS = require('./Compiler.constants').MARKED_OPTS;


/**
 *
 * ----------------------------------------
 * Usage:
 * 
 * require('node-machine')
 * .load('./lib/compile-markdown-file')
 * .configure(...)
 * .exec(...)
 */

module.exports = {

  id: 'compile-markdown-file',
  moduleName: 'machinepack-markdown',
  description: 'Load a markdown file from disk, compile to HTML, then save it back to disk.',
  dependencies: {
    marked: '*',
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

  fn: function(inputs, exits, deps) {

    var fsx = deps['fs-extra'];
    var Marked = deps['marked'];

    inputs.beforeConvert = inputs.beforeConvert || function (mdString, cb){ cb(null, mdString); };
    inputs.afterConvert  = inputs.afterConvert  || function (htmlString, cb){ cb(null, htmlString); };

    fsx.readFile(inputs.src, 'utf8', function(err, mdString) {
      if (err) return exits.couldNotRead(err);

      inputs.beforeConvert(mdString, function(err, mdString) {
        if (err) return exits.couldNotCompile(err);

        Marked(mdString, MARKED_OPTS, function(err, htmlString) {
          if (err) return exits.couldNotCompile(err);

          inputs.afterConvert(htmlString, function(err, htmlString) {
            if (err) return exits.couldNotCompile(err);

            fsx.writeFile(inputs.dest, htmlString, function(err) {
              if (err) return exits.couldNotWrite(err);
              return exits.success();
            });
          });
        });
      });
    });
  }
};


// ### For each markdown file... (in parallel)
// 
// -----------------------------------------------------------------
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


