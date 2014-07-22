/**
 * Module dependencies
 */

var spawn = require('child_process').spawn;
var util = require('util');
var _ = require('lodash');
var fsx = require('fs-extra');
var MARKED_OPTS = require('./Compiler.constants').MARKED_OPTS;


/**
 * The `build()` function pulls markdown file(s) from the specified
 * git repo(s), then compiles them into HTML file(s) using the `marked`
 * module.
 *
 * @param  {Object} options
 *           • templates[ {
 *             • src {
 *               • remote
 *               • path
 *             • dest {
 *               • cwd
 *               • html
 *               • jsmenu
 *           • beforeConvert()
 *           • afterConvert()
 *         
 * @param  {Function} cb
 * @api public
 */

module.exports = function build (options, cb) {
  
  // ## Ensure our tmp directory exists

  // ## For each template object (/i.e. build instruction)...
  
  // ### resolve the `src`
  // 
  // • if a "remote" was specified, use `git` to clone or pull from the remote
  //   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
  //   option is set for this particular src. In that case we should prompt the user
  //   about whether she actually wants to wipe the repo.
  //   
  // • if "remote" was NOT specified, we send back an error.
  

  // ### compile markdown
  // 
  // • now that we have the `src` markdown files locally and ready to go,
  //   we parse the directory tree, starting from the configured `path`
  //   (or defaulting to the root of the repository)
  //
  // • we build a POJO containing the file hierarchy- but containing ONLY the
  //   markdown files.  This will eventually become the ".jsmenu" file for this
  //   build step.
  
  // #### For each markdown file... (in parallel)
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
  // 
  // ### write the jsmenu
  // 
  // • send the bytes of the jsmenu we built earlier to the path on disk
  //   specified by `dest.jsmenu` as a write stream
  // 
  // ### clean up
  //   
  // • when all HTML output write streams finish, and the jsmenu write stream
  //   has finished, call the async callback to signal that this particular build
  //   step is complete.
  //   
  // • if any error occurs in this template object (i.e. build step), bail out of
  //   trying to read/compile/write stuff for this particular step and push the error
  //   onto a error stack (shared by this entire build) which is available in closure
  //   scope.  It will be handled later, but shouldn't prevent the other build steps
  //   from completing.

};


// Example input:
// -----------------------------------------------------------------
// 
// templates: [
//   {
//     src: {
//       remote: 'git://github.com/balderdashy/sails-docs.git',
//       path: 'reference/'
//     },
//     dest: {
//       cwd: process.cwd(),
//       html: '.tmp/public/templates/documentation/reference',
//       jsmenu: '.tmp/public/templates/jsmenus/reference.jsmenu'
//     }
//   },
//   {
//     src: {
//       remote: 'git://github.com/balderdashy/sails-docs.git',
//       path: 'anatomy/'
//     },
//     dest: {
//       cwd: process.cwd(),
//       html: '.tmp/public/templates/documentation/anatomy',
//       jsmenu: '.tmp/public/templates/jsmenus/anatomy.jsmenu'
//     }
//   }
// ],

// beforeConvert: function (markdown, done) {
//   done();
// },

// afterConvert: function (html, done) {
//   done();
// }
