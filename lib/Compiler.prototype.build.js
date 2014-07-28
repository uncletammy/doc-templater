/**
 * Module dependencies
 */

var async = require('async');
var _ = require('lodash');



/**
 * The `build()` function pulls markdown file(s) from the specified
 * git repo(s), then compiles them into HTML file(s) using the `marked`
 * module.
 *
 * @param  {Object} instructions [ {
 *           • remote
 *           • branch
 *           • remoteSubPath
 *           • cachePath
 *           • htmlDirPath
 *           • jsMenuPath
 *           • beforeConvert()
 *           • afterConvert()
 *         
 * @param  {Function} cb
 * @api public
 */

module.exports = function build (instructions, cb) {

  // If >=1 instructions share the same `remote` and `branch`,
  // add the `dontPullOrClone` flag to all but the first.
  // 
  // This keeps us from cloning/pulling more times than absolutely necessary.
  for (var i=0; i<instructions.length; i++) {
    _(instructions.slice(i+1))
    .where({
      remote: instructions[i].remote,
      branch: instructions[i].branch
    })
    .map(function (instr) {
      instr.dontPullOrClone = true;
    });
  }

  // Now perform the operations
  async.mapSeries(instructions, require('./compile-markdown-tree-from-remote-git-repo'), cb);
};
