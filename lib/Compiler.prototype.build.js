/**
 * Module dependencies
 */

var spawn = require('child_process').spawn;
var util = require('util');
var _ = require('lodash');
var fsx = require('fs-extra');


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
  // -----------------------------------------------------------------
  //
  // • Ensure our tmp directory exists
  //
  // • compile template object (/i.e. build instruction)
  //   -- see (A) below --
  //   
  // • if any error occurs in any one template object (i.e. build step), bail out of
  //   trying to read/compile/write stuff for this particular step and push the error
  //   onto a error stack (shared by this entire build) which is available in closure
  //   scope.  It will be handled later, but shouldn't prevent the other build steps
  //   from completing.


};

