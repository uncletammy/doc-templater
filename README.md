<h1>
  <a title="doc-templater" href="https://github.com/balderdashy/doc-templater">
    <img width="75" title="doc-templater" alt="(md) icon, representing the markdown syntax" src="http://dashkards.com/img/markdown-icon.png"/>
  </a>
  doc-templater
</h1>

[![NPM version](https://badge.fury.io/js/doc-templater.png)](http://badge.fury.io/js/doc-templater) &nbsp; &nbsp;
[![Build Status](https://travis-ci.org/uncletammy/doc-templater.svg?branch=master)](https://travis-ci.org/uncletammy/doc-templater)

Compiles a tree of Github-flavored markdown files into themable HTML templates.  Supports pulling directly from multiple remote or local git repositories and exposes lifecycle hooks for transforming markdown input (beforeConvert) or HTML output (afterConvert).  Also writes flat tree arrays representing the directory hierarchy as JSON files.
 

### Installation

```sh
$ npm install doc-templater
```


### In a Node script

```javascript
var DocTemplater = require('doc-templater');

DocTemplater().build([{
  remote: 'git://github.com/balderdashy/sails-docs-guides.git',
  remoteDirPath: 'assets/templates/guides/'
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

================================================
> ### TODO
>
> Note to self:                  ||
> finish updating the rest below \/
> ~mike
================================================


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
        The source repository from which source markdown files will be fetched, e.g.: `git://github.com/balderdashy/sails-docs-guides.git#v08`.  If the branch is ommited, `master` will be used.
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
      <td><code>saveJsonMenu</code></td>
      <td><vartype>string</vartype></td>
      <td>
        The relative path and filename where an optional json file will be saved.  This file is a json representation of the compiled documentation templates. e.g.: `assets/templates/jsmenus/reference.jsmenu`.
      </td>
    </tr>
    <tr>
      <td><code>applyToTemplates</code></td>
      <td><vartype>object</vartype></td>
      <td>
        Object that contains user hooks allowing manipulation of the templates before and/or after they are compiled but before they are written to disk.  See below for usage.
      </td>
    </tr>    
    <tr>
      <td><code>applyToTemplates.beforeConvert</code></td>
      <td><vartype>function</vartype></td>
      <td>
        Function that gets called on every template file before it is compiled and written to disk.  It gets two arguments.  The first is an object containing information about the template being compiled.  The second is a callback THAT MUST BE CALLED in order for doc-templater to continue compiling.
      </td>
    </tr>    
    <tr>
      <td><code>applyToTemplates.afterConvert</code></td>
      <td><vartype>function</vartype></td>
      <td>
        Function that gets called on every template file after it has been compiled but before it is written to disk.  It gets two arguments.  The first is an object containing information about the newly compiled template.  The second is a callback THAT MUST BE CALLED in order for doc-templater to continue compiling.
      </td>
    </tr>    
    <tr>
      <td><code>addToSitemap</code></td>
      <td><vartype>boolean</vartype></td>
      <td>(NOT YET SUPPORTED)
        Whether an entry for this HTML file should be added to a generated sitemap.xml file 
      </td>
    </tr>
  </tbody>
</table>




### Changelog

> #####v0.1.0
> __August 2014__
>
> Refactored to use smaller, more testable modules and enhance stability.  Also added some caching/performance improvements.
>
>
> #####v0.0.9
> __May 2014__
>
> Now supports git branches, infinitely deep docs directories, and outputting json menus with template metaData attached (use `<docmeta name="keyname" value="keyvalue">` inside of templates).  


### License


**[MIT](./LICENSE)**
&copy; 2013-2014 [Nicholas Crumrine](https://github.com/uncletammy), [Mike McNeil](https://github.com/mikermcneil) & contributors

This module is part of the [Node.js](http://nodejs.org) and [Sails framework](http://sailsjs.org) ecosystem, and is free and open-source under the [MIT License](http://sails.mit-license.org/).


![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png) 
 

[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/a22d3919de208c90c898986619efaa85 "githalytics.com")](http://githalytics.com/balderdashy/doc-templater)
