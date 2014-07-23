module.exports = {
  id: 'pull-or-clone',
  moduleName: 'machinepack-git',
  description: 'Clone a git repo to a folder on disk (or if the folder already exists, just pull)',
  dependencies: {
    'git': '*'
  },
  inputs: {
    remote: 'git://github.com/balderdashy/sails-docs.git',
    dest: '.tmp/compile-markdown-tree/balderdashy/sails-docs/reference'
  },
  exits: {
    error: {},
    success: {}
  },
  fn: function ($i,$x,$d) {
    return $x.success();
  }
};
