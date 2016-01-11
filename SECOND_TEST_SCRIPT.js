// dumb dumb test script
k = require('./lib/Compiler.prototype.build');
k([
// {
//   remote: 'git@github.com:mikermcneil/machinepack-fs.git',
//   remoteSubPath: '',
//   cachePath: '/code/sandbox/doctemplatertest/foo/bar/cache/',
//   htmlDirPath: '/code/sandbox/doctemplatertest/foo/bar/html',
//   jsMenuPath: '/code/sandbox/doctemplatertest/foo/bar.jsmenu'
// },
{
  remote: 'git@github.com:mikermcneil/machinepack-fs.git',
  remoteSubPath: '',
  branch: 'experimental',
  htmlDirPath: '/code/sandbox/doctemplatertest/foo/bar2/html',
  cachePath: '/code/sandbox/doctemplatertest/foo/bar/cache2',
}], function (e,r) {
  if (e) {console.log('ERROR:\n',require('util').inspect(e, false, null));}
  else console.log('RESULT:\n',require('util').inspect(r, false, null));
});
