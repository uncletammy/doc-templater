/**
 * --------------------------------------------------
 * Usage:
 *
 * require('node-machine')
 * .load('machinepack-fs/ls')
 * .configure({dir:'./'})
 * .exec(console.log)
 */

module.exports = {
  id: 'ls',
  moduleName: 'machinepack-fs',
  description: 'List directory contents',
  transparent: true,
  dependencies: {
    'list-directory-contents': '*'
  },
  inputs: {
    dir: {
      example: '/Users/mikermcneil/.tmp/foo'
    }
  },
  exits: {
    error: {},
    success: {
      example: [
        '/Users/mikermcneil/.tmp/foo/.gitignore',
        '/Users/mikermcneil/.tmp/foo/README.md',
        '/Users/mikermcneil/.tmp/foo/bar/index.html',
        '/Users/mikermcneil/.tmp/foo/bar/favicon.ico',
        '/Users/mikermcneil/.tmp/foo/bar/images/logo.png'
      ]
    }
  },
  fn: function ($i,$x,$d) {
    var ls = $d['list-directory-contents'];
    ls($i.dir, $x);
  }
};


