/**
 * Module dependencies
 */



// ## (A) For each template object (/i.e. build instruction)...
// 
// Example input:
// -----------------------------------------------------------------
// {
//   src: {
//     remote: 'git://github.com/balderdashy/sails-docs.git',
//     path: 'reference/',
//     cache: require('path').resolve('.tmp/compile-markdown-tree/balderdashy/sails-docs/reference')
//   },
//   dest: {
//     cwd: process.cwd(),
//     html: '.tmp/public/templates/documentation/reference',
//     jsmenu: '.tmp/public/templates/jsmenus/reference.jsmenu'
//   }
// }
// -----------------------------------------------------------------
// 
// • if a "remote" was specified, use `git` to clone or pull from the remote
//   in the event of a conflict, smash everything and re-clone UNLESS the `safe`
//   option is set for this particular src. In that case we should prompt the user
//   about whether she actually wants to wipe the repo.
//   
// • if "remote" was NOT specified, we send back an error.
// 
// • now that we have the `src` markdown files locally and ready to go,
//   we parse the directory tree, starting from the configured `path`
//   (or defaulting to the root of the repository)
//
// • we build a POJO containing the file hierarchy- but containing ONLY the
//   markdown files.  This will eventually become the ".jsmenu" file for this
//   build step.
//   
// • Now compile each markdown file
//   -- see (B) below --

