<h1>
  <a title="doc-templater" href="https://github.com/balderdashy/doc-templater">
    <img width="75" title="doc-templater" alt="(md) icon, representing the markdown syntax" src="http://dashkards.com/img/markdown-icon.png"/>
  </a>
  doc-templater
</h1>

[![NPM version](https://badge.fury.io/js/doc-templater.png)](http://badge.fury.io/js/doc-templater) &nbsp; &nbsp;
[![Build Status](https://travis-ci.org/uncletammy/doc-templater.svg?branch=master)](https://travis-ci.org/uncletammy/doc-templater)

Compiles Github flavored markdown files into organized HTML templates, with support for pulling directly from one or more git repositories.
 

## Installation

```sh
$ npm install doc-templater
```


### In a Node script

```javascript
var DocTemplater = require('doc-templater');
var compiler = DocTemplater();

compiler.build([{
    docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
    parsedTemplatesDirectory: 'assets/templates/guides/'
}]);

```

## Usage

### build(instructions, [, callback])

The `build()` function pulls markdown file(s) from the specified git repo(s), then compiles them into HTML file(s) using the `marked` module.  It accepts two arguments- an array of build instruction objects and a callback function that runs when the build is complete.


```javascript
compiler.build([{
    docsGitRepo: 'git://github.com/balderdashy/sails-docs-guides.git',
    parsedTemplatesDirectory: 'assets/templates/guides/'
}], function whenFinished (err, metadata) {
  if (err) { return console.error('Failed to compile:\n',err); }
  // `metadata` contains an array of objects with info about each
  // template that was created, including its path.
});
```

A complete list of the options for `instructions` is located below.

The `callback` argument is a standard Node callback with the conventional function signature: `(err, metadata)`  If something went wrong, the error argument will be truthy.  The `metadata` argument consists of an array of objects containing info about each template that was created, including its new path.


The following options may be used as keys in build instruction objects:

<table>
  <thead>
    <tr>
      <th>Option</th>
      <th>Type</th>
      <th>Details</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>docsGitRepo</code><br/><em>(required)</em></td>
      <td><vartype>string</vartype></td>
      <td>
        The source repository markdown source files will be fetched from, e.g.: `git://github.com/balderdashy/sails-docs-guides.git`
      </td>
    </tr>
    <tr>
      <td><code>parsedTemplatesDirectory</code><br/><em>(required)</em></td>
      <td><vartype>string</vartype></td>
      <td>
        The destination directory where output HTML files will be created.
      </td>
    </tr>
    <tr>
      <td><code>dirNameInRepo</code></td>
      <td><vartype>string</vartype></td>
      <td>
        Path to the directory of markdown files in the repo (if omitted, the root directory will be used)
      </td>
    </tr>
    <tr>
      <td><code>prependPathAndName</code></td>
      <td><vartype>boolean</vartype></td>
      <td>
        Whether source path+filename should be prepended to the name of the output file
      </td>
    </tr>
    <tr>
      <td><code>addToSitemap</code></td>
      <td><vartype>boolean</vartype></td>
      <td>
        Whether an entry for this HTML file should be added to a generated sitemap.xml file
      </td>
    </tr>
  </tbody>
</table>





### License


**[MIT](./LICENSE)**
&copy; 2013-2014 [Nicholas Crumrine](https://github.com/uncletammy), [Balderdash](http://balderdash.co) & contributors

This module is part of the [Node.js](http://nodejs.org) and [Sails framework](http://sailsjs.org) ecosystem, and is free and open-source under the [MIT License](http://sails.mit-license.org/).


![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png) 
 

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/a22d3919de208c90c898986619efaa85 "githalytics.com")](http://githalytics.com/balderdashy/doc-templater)


