/**
 * Module dependencies
 */

var MARKED_OPTS = require('./Compiler.constants').MARKED_OPTS;


// ### (B) For each markdown file... (in parallel)
// 
// Example input:
// -----------------------------------------------------------------
// {
//   src: require('path').resolve('.tmp/compile-markdown-tree/some/markdown/file.md')
//   dest: require('path').resolve('.tmp/public/templates/documentation/reference')
// }
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


