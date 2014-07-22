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
 * @param  {options}
 *           • docsObjects [array of build instruction objects]
 *         
 * @param  {Function} cb
 * @api public
 */

module.exports = function build (options, cb) {
  


};
