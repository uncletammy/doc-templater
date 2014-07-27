/**
 * Module dependencies
 */

var _ = require('lodash');
var path = require('path');


/**
 * [exports description]
 * @param  {[type]} tree [description]
 * @return {[type]}      [description]
 */
module.exports = function buildJsMenu (tree){

  // console.log('\n\n\n\nHTML TREE:',require('util').inspect(tree, false, null));
  
  // Locate children
  tree = _.reduce(tree, function (m, templateInfo, i) {
    var myPath = templateInfo.realPath || templateInfo.fullPathAndFileName;

    // console.log('locating children for %s', myPath);

    // Locate each tpl's parent
    templateInfo.parent = _.find(tree, function (potentialParentTemplate) {

      // Use `realPath` when relevant
      // (so we match against the true dirpath, not the overview tpl)
      var potentialParentPath = potentialParentTemplate.realPath || potentialParentTemplate.fullPathAndFileName;

      // Cannot have a parent w/o a path
      if (!potentialParentPath) return false;
      // Cannot be one's own parent
      if (potentialParentPath === myPath) return false;
      
      var relpath = path.relative(myPath, potentialParentPath);
      // console.log('locating parent: relpath from %s to %s is "%s"', myPath, potentialParentPath, relpath);

      // We know this is a direct parent if:
      return relpath==='..' || relpath === '../';
      // (
      //   // this relpath starts with '..'
      //   relpath.match(/^\.\.\/?/) &&
      //   // but NOT '../*'
      //   !(relpath.match(/^\.\.\/?.+/))
      // );
    });
    // Pluck the path
    if (templateInfo.parent) {
      templateInfo.parent = templateInfo.parent.fullPathAndFileName;
      templateInfo.isChild = true;
      // console.log('found parent  for (%s):', myPath, templateInfo.parent);
    }
    
    // Only folders have children
    if (!myPath.match(/\/$/)) {
      return m;
    }
    
    templateInfo.children = _(tree).where(function (potentialChildTemplate){

      var potentialChildPath = potentialChildTemplate.realPath || potentialChildTemplate.fullPathAndFileName;
      // Cannot have a child w/o a path
      if (!potentialChildPath) return false;
      // Cannot be one's own child
      if (potentialChildPath === myPath) return false;

      var relpath = path.relative(myPath, potentialChildPath);
      
      // if (
      //   !relpath.match(/^\.\.\/?/) &&
      //   !relpath.match(/^[^\/]+\//) &&
      //   relpath !== ''
      // ) {
      //   console.log('\n*** identified "%s" as a child of "%s"\n', potentialChildPath, myPath, '(relpath: '+relpath+')');
      // }

      // We know this is a child if:
      return (
        // this relpath does not start w/ '..' or '../'
        !relpath.match(/^\.\.\/?/) &&
        // AND has exactly ZERO `/`s
        !relpath.match(/^[^\/]+\//) &&
        // AND is not "" (that means it's just the same file)
        relpath!==''
      );
    })
    .pluck('fullPathAndFileName')
    .valueOf();

    // `isParent` flag
    if (templateInfo.children.length) {
      templateInfo.isParent = true;
    }

    // console.log('found %d children for (%s):', templateInfo.children.length, myPath, templateInfo.children);

    return m;
  }, tree);

  return tree;
};
