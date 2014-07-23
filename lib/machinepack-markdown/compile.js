module.exports = {

  id: 'compile',
  moduleName: 'machinepack-markdown',
  description: 'Compile some markdown to HTML.',
  dependencies: {
    marked: '*'
  },
  inputs: {
    mdString: {
      example: '# hello world\n it\'s me, some markdown string \n\n ```js\n//but maybe i have code snippets too...\n```'
    }
  },
  exits: {
    error: {},
    success: {
      example: '<h1 id="hello-world">hello world</h1>\n<p> it&#39;s me, some markdown string </p>\n<pre><code class="lang-js">//but maybe i have code snippets too...</code></pre>\n'
    }
  },

  fn: function($i, $x, $d) {

    /**
     * Contants
     * @type {Object}
     */
    var MARKED_OPTS = {
      gfm: true,
      tables: true,
      langPrefix: 'lang-'
    };

    $d['marked']($i.mdString, MARKED_OPTS, function(err, htmlString) {
      if (err) return $x.error(err);
      return $x.success(htmlString);
    });
  }
};
