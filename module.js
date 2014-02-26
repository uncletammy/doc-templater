var spawn = require('child_process').spawn;
var _ = require('lodash');
var fs = require('fs-extra');

var utils = {
	markedOptions : {
		gfm: true,
		tables: true,
		breaks: true,
		pedantic: false,
		sanitize: true,
		smartLists: true,
		smartypants: false,
		langPrefix: 'lang-'
	},
	template: function(savePath, md , cb) {
		var convertToHTML = require('marked');

		if (md.substr(0,1) !== '#')
			md = '#'+md

		var afterWriteCB = function(err) {
				var afterConvertCB = cb;
				if (err)
					return afterConvertCB({type:'markup',err:err})
				else {
					//console.log('now saving',savePath)
					return afterConvertCB(null,{file:savePath + '.html',success:true})
				}
			};

		var saveToDisk = function(err,html){
			var afterConvertCB = cb;
			if (err){
				return afterConvertCB({type:'conversion',err:err})
			} else {
				return afterWriteCB(fs.outputFile(savePath + '.html', html));
			}

		}


		convertToHTML(md, utils.markedOptions, saveToDisk)
	},
	writeTemplates: function(jsonTree,returnResults){

		var errors = [];
		var results = [];
		var finalCB = returnResults;
		var writeCB = function(err,result){

			var allErrors = errors;
			var allResults = results;
			if (err)
				return allErrors.push(err);
			else {
				return allResults.push(result);
				//console.log('Marked!',result)
			}
		}
		var sectionCounter = 0;
		var numberOfSections = Object.keys(jsonTree).length;
		//console.log('There are ',numberOfSections,'sections.');

		for (var s in jsonTree){
			var thisSection = jsonTree[s];

			try {
				var fromSection = s.split('.md')[0];

			} catch(splitErr){
				console.log('One or more objects is not a .md file',splitErr)
			}

			var fullPath = thisSection.savePath+fromSection;

			//console.log('creating dir ',fullPath)
			fs.mkdirsSync(fullPath);

			var sectionFiles = thisSection.files;
			//console.log('Section',s,'has',sectionFiles.length,'files');

			for (var ss=0;ss<=sectionFiles.length-1;ss++){
				var thisFile = sectionFiles[ss];
				var fullPathAndName = fullPath+'/'+thisFile.templateTitle;
				utils.template(fullPathAndName,thisFile.templateHTML,writeCB)
			}

				// console.log('Section ',sectionCounter,'of ',numberOfSections)
				sectionCounter++;
			if (sectionCounter === numberOfSections){
				return finalCB(errors,results)
			}
		}

	},
	populateObject: function(mappedTree){
		var populated = {

		};
		for (var key in mappedTree){
			var useSavePath = mappedTree['savePath']|| mappedTree[key]['savePath'];
			var isMarkdownFile = (key.toLowerCase().indexOf('.md')>=0);
			var isObject = (mappedTree[key]['-type'] === 'd');

			if (isMarkdownFile && !isObject){
				populated[key] = mappedTree[key];
				populated[key]['savePath'] = useSavePath;

				populated[key]['contents'] = fs.readFileSync(populated[key]['-path'], 'utf8');
				//populated[key]['contents'] = '# content\nLook, content!\n# Even More\nAnd theres even more content...'

			// TODO: Make this Recursive
			// } else if (!isMarkdownFile && isObject){
			// 	console.log(key,'is a directory');
			// 	var newDir = new populateObject(object[key]);
			// 	if (newDir){
			// 		populated[key] = newDir;
			// 		console.log('got',newDir)
			// 	}

			} else if (!isMarkdownFile && !isObject){
				if (key !== '-path' && key !== 'savePath'){
					//console.log('Deleting ',key)
					delete mappedTree[key];
				}
			}
			
		}
		return utils.splitIntoFiles(populated);
	},
	splitIntoFiles: function(thisObject){
		var splitObject = _.cloneDeep(thisObject);

		for (var b in thisObject){

			var splitFiles = thisObject[b]['contents'].split(/\n{0,1}[^#]#\s/ig);

			splitFiles.forEach(function(v, i) {
					try {
						var firstLine = v.match(/([^]+?)\n/)[0];
					} catch(mdSplitError){
						console.log('MD Split Error in ',b,':',mdSplitError);
						var firstLine = 'Title Parsing Error in ';
					}

					var getFileName = firstLine.replace(/[\r\t\n\s`#]/ig, '');

					// Allows Function notation in titles
					if (getFileName.match(/[\(]/)){
						try {

						getFileName = getFileName.split('(')[0];						
						} catch(grabFileNameError){
							console.log('Problem grabbing fileName in ',b,':',grabFileNameError)
						}
					}

				// Allows Function notation in titles
				if (getFileName.match(/[\(]/))
					getFileName = getFileName.split('(')[0];

				// For Dynamic Finders
				if (getFileName.match(/[<]/))
					getFileName = getFileName.replace(/<[^]+?>/ig,'');

		//		if (parseOptionRef.addToSitemap)
		//			siteMap.pages.push(dirName+'/'+getFileName);
				
			//	console.log('Path: '+path+'\ngetFileName:'+getFileName);
		//		new Ejs(path+getFileName.replace(/\./g,'_d_'), v);

				var newFile = {
					templateTitle:getFileName,
					firstLineOfTemplate:firstLine,
					templateHTML:v};


				if (splitObject[b]['files']){
					splitObject[b].files.push(newFile)
				} else {
					splitObject[b]['files'] = [];
					splitObject[b].files.push(newFile)
				}

			});
			delete splitObject[b].contents
		};

	//	splitObject['files'] = _.cloneDeep(files);

		return splitObject
	},
	getPathTree: function(repoPathOnDisk,cb){

		var jsonDir = require('jsondir');
//		jsonDir.dir2json(repoPathOnDisk,{ attributes: ['content', 'mode'] }, function(err, results) {
		jsonDir.dir2json(repoPathOnDisk,function(err, results) {
			if (err){
				return cb(err)
			} else {
				return cb(null,results);
			}
		})
	},
	grabFolders: function(jsonTree,docsToGrab,isBaseDir,cb){
		//console.log(docsToGrab,'AAAAANNNNNDDDDD:',isBaseDir)
		var result = {};
		return cb(null,_.transform(jsonTree, function(result, objectVal, objectKey) {
			for (i=0;i<=docsToGrab.length-1;i++){
				var checkThis = docsToGrab[i];
				if (objectKey.indexOf(checkThis.dirName)>=0 || (isBaseDir === true && objectKey.indexOf('.md')>=0)){
					result[objectKey] = objectVal;
					result[objectKey]['savePath'] = checkThis.saveDirectory
				}
			}
	}))},
	cloneRepo: function(repoURL,docsDirName,cb){

		if (fs.existsSync(docsDirName)){
			console.log('Removing Directory',docsDirName)
			fs.removeSync(docsDirName)
		}
		// else
		// 	console.log(baseDir+docsDirName,'doesnt exist')

	//	fs.mkdirsSync(baseDir);
		process.chdir('.tmp/docTemplater/');

		var clone = spawn('git', ['clone', repoURL]);

		clone.stdout.on('data', function(d) {
			console.log('\nInfo:' + d);
		});
		clone.stderr.on('data', function(d) {
			console.log('\nError:' + d);
		});
		clone.on('close', function(code) {
		process.chdir('../..');
			if (code === 0) {
				return cb(null,docsDirName);
			} else {
				var error = 'Sorry Homie.  The building collapsed and i\'m left holding exit code ' + code;
				return cb(error);
			}
		})
	}
};

function Docs(){

	this.createTemplate = function(repoURL,docsDirs,callback){
		var finalCB = callback;

		var getRepoName = repoURL.split('/');
		var baseDir = '.tmp/docTemplater/';
		var docsDirName = baseDir+(getRepoName[getRepoName.length - 1].replace('.git', ''));

		if (_.isArray(docsDirs)){
			var docsToGrab = docsDirs;
		} else if (_.isPlainObject(docsDirs)){


			if (docsDirs['baseDir']){
				var useBaseDir = true;
				console.log('The md files are in the base docs dir.')

				var saveDir = docsDirs['saveDirectory'];
				var lastChar = saveDir.substr(saveDir.length-1);
				if (lastChar === '/')
					saveDir = saveDir.substr(0,saveDir.length-1);

				var grabNameArray = saveDir.split('/');
				var grabName = grabNameArray[grabNameArray.length-1];

			}
			var docsToGrab = [docsDirs];
		} else if (_.isFunction(docsDirs)){
			console.log('docsDir is a function.  Something isnt right.')
		}

		var returnResults = function(err,stuffCreated){
			var sendErrors = null;
			if (err.length){
				sendErrors = err;
				console.log('There was one or more errors processing docs...',err);
				//return finalCB(err)
			}
			console.log('Done parsing',repoURL);
			return finalCB(sendErrors,stuffCreated);

		}

		var writeToDisk = function(err,jsonTree){
			if (err){
				return finalCB(err)
			} else {
				var mergeAll = {};
				if (useBaseDir){
					jsonTree['-path'] = docsDirName;
					var mergeThis = utils.populateObject(jsonTree);
				} else {				
					for (var l in jsonTree)
						var mergeThis = utils.populateObject(jsonTree[l])					
				}
					mergeAll = _.merge(mergeThis,mergeAll)

				utils.writeTemplates(mergeAll,returnResults);
			}
		}

		var afterGetTree = function(err,jsonTree){
			if (err){
				console.log('Error in getTree');
				return finalCB(err)
			} else {
				utils.grabFolders(jsonTree,docsToGrab,useBaseDir,writeToDisk);
			}
		}


		var afterClone = function(err,repoPathOnDisk){
			if (err){
				console.log('Error in getPathTree');
				return finalCB(err)
			} else {
				console.log('Sucessfully Cloned:',repoPathOnDisk)
				utils.getPathTree(repoPathOnDisk,afterGetTree);
			}
		}

		var afterCheckout = function(err,checkoutStatus){
			if (err){
				console.log('Error doing Checkout');
				return finalCB(err)
			} else {
				console.log('Git Checkout Status:',checkoutStatus)
				utils.cloneRepo(repoURL,docsDirName,afterClone);
			}
		}


		utils.cloneRepo(repoURL,docsDirName,afterClone);

	}
//	return cb(array.length);
}




module.exports = new Docs;


