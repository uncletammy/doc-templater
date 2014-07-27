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

  console.log('\n\n\n\nHTML TREE:',require('util').inspect(tree, false, null));
  
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

      // We know this is a parent if:
      return (
        // this relpath starts with '..'
        relpath.match(/^\.\.\/?/) &&
        // but NOT '../*'
        !(relpath.match(/^\.\.\/?.+/))
      );
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

      var relpath = path.relative(path.dirname(myPath), potentialChildPath);
      // console.log('locating children: relpath from %s to %s is "%s"', path.dirname(myPath), potentialChildPath, relpath);

      // We know this is a child if:
      return (
        // this relpath does not start w/ '../'
        !relpath.match(/^\.\.\//) &&
        // AND has exactly ZERO `/`s
        !(relpath.match(/^[^\.]\//)) &&
        // AND doesn't start with `./`
        relpath.match(/\//)
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



  // [
  // {
  //   "templateTitle": "api",
  //   "fullPathAndFileName": "anatomy/myApp/api/api.html",
  //   "isParent": true,
  //   "data": {
  //     "uniqueID": "apimd840000",
  //     "displayName": "api"
  //   },
  //   "isChild": true,
  //   "parent": "anatomy/myApp/myApp.html",
  //   "children": [
  //     "anatomy/myApp/api/controllers/controllers.html",
  //     "anatomy/myApp/api/models/models.html",
  //     "anatomy/myApp/api/policies/policies.html",
  //     "anatomy/myApp/api/responses/responses.html",
  //     "anatomy/myApp/api/services/services.html"
  //   ]
  // },
  // ...
  // ]
