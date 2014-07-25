k = require('./lib/compile-markdown-tree-from-remote-git-repo');
k({
  remote: 'git://github.com/mikermcneil/machinepack-fs.git',
  remoteSubPath: 'lib/',
  cachePath: '/code/sandbox/doctemplatertest/foo/bar/cache/',
  htmlDirPath: '/code/sandbox/doctemplatertest/foo/bar/html',
  jsMenuPath: '/code/sandbox/doctemplatertest/foo/bar.jsmenu'
}, function (e,r) {
  if (e) {console.log('ERROR:\n',e);}
  else console.log('RESULT:\n',r);
});
