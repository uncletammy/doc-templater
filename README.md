# Doc Templater

Creates organized HTML documentation templates from sections of Github flavored markdown.
 

### Use it like this

```javascript


		var templater = require('docTemplater');

		var docsRepo = 'git://github.com/balderdashy/sails-docs-guides.git';

		var parseThese = {
				baseDir: true,
			//	dirName: 'reference',
				addToSitemap: true,
				saveDirectory: 'assets/templates/guides/'
			};


		var afterTemplateCB = function(err,stuff){
					if (err){
						console.log('There was an error bro',err);
					} else {
						console.log('Here are all the html files written to disk',stuff);
					}
		}

		templater.createTemplate(docsRepo,parseThese,afterTemplateCB);


// Sucessfully Cloned: .tmp/docTemplater/sails-docs-guides
// Done parsing git://github.com/balderdashy/sails-docs-guides.git


```

It returns a collection of these `{fileWritten:'path/on/disk.html',didWrite:true}`

Good luck
