/**
 * Module dependencies
 */

var async = require('async');


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

module.exports = function build (instructions, cb) {
  async.map(instructions, require('./compile-markdown-tree-from-remote-git-repo'), cb);
};

