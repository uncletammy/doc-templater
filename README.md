# [![Doc-Templater](http://dashkards.com/img/markdown-icon.png) Doc-Templater](https://github.com/balderdashy/doc-templater)

[![NPM version](https://badge.fury.io/js/doc-templater.png)](http://badge.fury.io/js/doc-templater) &nbsp; &nbsp;
[![Build Status](https://travis-ci.org/balderdashy/doc-templater.svg?branch=master)](https://travis-ci.org/balderdashy/doc-templater)

Creates organized HTML documentation templates from sections of Github flavored markdown.
 

### Use it like this

```javascript


		var templater = require('doc-templater');

		var parseThese = [{
				docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
				prependPathAndName: true,
				addToSitemap: false,
				parsedTemplatesDirectory: 'assets/templates/guides/'
			},{
				docsGitRepo: 'git://github.com/balderdashy/sails-docs.git',
				dirNameInRepo: 'reference',
				prependPathAndName: true,
				addToSitemap: true,
				parsedTemplatesDirectory: 'assets/templates/reference/',
        applyToTemplates:{
          //beforeConvert: function(writeFileObject,cb){},
          afterConvert: function(writeFileObject,cb){
            writeFileObject.templateHTML = writeFileObject.templateHTML.replace(/\d{1,2}-\d{1,2}-\d{4}/ig,'TIME AINT REAL');
            return cb(writeFileObject)
          }
        }
			},{
				docsGitRepo: 'git://github.com/balderdashy/sails-docs.git',
				dirNameInRepo: 'anatomy',
				prependPathAndName: false,
				addToSitemap: true,
				parsedTemplatesDirectory: 'assets/templates/anatomy/'
			}];
		
		var afterTemplateCB = function(err,stuff){
					if (err){
						console.log('There was at least one error bro',err)
					} else {
						console.log('No errors.  WOOOO!');
						console.log('All the Stuff:',stuff)
					}
		};
		
		templater.createTemplate(parseThese,afterTemplateCB);

/*
dude@littleDude:~/node/templaterTest$ node testItBro.js 
addToSiteMap is undefined.  Next time i'll throw an error
dirNameInRepo is undefined.  Next time i'll throw an error
cloning Repo: git://github.com/balderdashy/sails-docs-guides.git

Info:Cloning into 'sails-docs-guides'...

You have completed a docs object. wtg
addToSiteMap is undefined.  Next time i'll throw an error
cloning Repo: git://github.com/balderdashy/sails-docs.git

Info:Cloning into 'sails-docs'...

You have completed a docs object. wtg
addToSiteMap is undefined.  Next time i'll throw an error
cloning Repo: git://github.com/balderdashy/sails-docs.git

Info:Cloning into 'sails-docs'...

You have completed a docs object. wtg
All Done with all docsObjects!
No errors.  WOOOO!
All the Stuff: [ { config: 
     { errors: [],
       results: [],
       prependPathAndName: true,
       addToSiteMap: false,
       __useBaseDir: true,
       dirNameInRepo: 'sails-docs-guides',
       __docsRepoOnDisk: '.tmp/docTemplater/sails-docs-guides',
       docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
       parsedTemplatesDirectory: 'assets/templates/guides' },
    jsonTreeOfRepo: 
     { '-path': '/home/dude/node/templaterTest/.tmp/docTemplater/sails-docs-guides',
       '-type': 'd',
       '-mode': 493,
       '.git': [Object],
       'README.txt': [Object],
       'deployment.md': [Object],
       'generators.md': [Object],
       'gettingStarted.md': [Object],
       'httpStuff.md': [Object],
       'security.md': [Object],
       'workingWithData.md': [Object] } },
  { config: 
     { errors: [],
       results: [],
       prependPathAndName: true,
       addToSiteMap: false,
       __useBaseDir: false,
       dirNameInRepo: 'reference',
       __baseDocsRepoOnDisk: 'sails-docs',
       __docsRepoOnDisk: '.tmp/docTemplater/sails-docs/reference',
       docsGitRepo: 'git://github.com/balderdashy/sails-docs.git',
       parsedTemplatesDirectory: 'assets/templates/reference' },
    jsonTreeOfRepo: 
     { '-path': '/home/dude/node/templaterTest/.tmp/docTemplater/sails-docs/reference',
       '-type': 'd',
       '-mode': 493,
       'Assets.md': [Object],
       'Blueprints.md': [Object],
       'BrowserSDK.md': [Object],
       'CommandLine.md': [Object],
       'Configuration.md': [Object],
       'Controllers.md': [Object],
       'CustomResponses.md': [Object],
       'Deployment.md': [Object],
       'Globals.md': [Object],
       'ModelAssociations.md': [Object],
       'ModelMethods.md': [Object],
       'Models.md': [Object],
       'Policies.md': [Object],
       'README.txt': [Object],
       'Request.md': [Object],
       'Response.md': [Object],
       'Routes.md': [Object],
       'Security.md': [Object],
       'Services.md': [Object],
       'Sockets.md': [Object],
       'Upgrading.md': [Object],
       'Views.md': [Object],
       'i18n.md': [Object] } },
  { config: 
     { errors: [],
       results: [],
       prependPathAndName: false,
       addToSiteMap: false,
       __useBaseDir: false,
       dirNameInRepo: 'anatomy',
       __baseDocsRepoOnDisk: 'sails-docs',
       __docsRepoOnDisk: '.tmp/docTemplater/sails-docs/anatomy',
       docsGitRepo: 'git://github.com/balderdashy/sails-docs.git',
       parsedTemplatesDirectory: 'assets/templates/anatomy' },
    jsonTreeOfRepo: 
     { '-path': '/home/dude/node/templaterTest/.tmp/docTemplater/sails-docs/anatomy',
       '-type': 'd',
       '-mode': 493,
       'myApp.md': [Object] } } ]
*/

```

It returns an array of objects with all that good info in them.

Good luck


### License


**[MIT](./LICENSE)**
&copy; 2013-2014 [Nicholas Crumrine](https://github.com/uncletammy), [Balderdash](http://balderdash.co) & contributors

This module is part of the [Node.js](http://nodejs.org) and [Sails framework](http://sailsjs.org) ecosystem, and is free and open-source under the [MIT License](http://sails.mit-license.org/).


![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png) 
 

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/a22d3919de208c90c898986619efaa85 "githalytics.com")](http://githalytics.com/balderdashy/doc-templater)
