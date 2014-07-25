k = require('node-machine').require('./lib/compile-markdown-tree-from-remote-git-repo');
k.configure({

})
.exec(function (e,r) {
  if (e) {console.log('ERROR:\n',e);}
  else console.log('RESULT:\n',r);
});
