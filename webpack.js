let webpack = require('webpack'),
    webpackDevServer = require('webpack-dev-server'),
    WebpackJasmineHtmlRunnerPlugin = require('webpack-jasmine-html-runner-plugin');

let webpackConfig = require(process.cwd() + '/' + process.argv[2]);
webpackConfig.entry = JSON.parse(process.argv[3]);
webpackConfig.plugins = webpackConfig.plugins || [];

let options = webpackConfig.sambac || {};
let pluginOptions = {
  includePaths: options.includePaths || []
};
if(options.pattern){
  pluginOptions.pattern = options.pattern;
}

webpackConfig.plugins.push(new WebpackJasmineHtmlRunnerPlugin(pluginOptions));
delete webpackConfig.sambac;

if(Object.keys(webpackConfig.entry).length > 0){
  let compiler = webpack(webpackConfig);
  let webpackServer = new webpackDevServer(compiler, {
    stats: {
      colors: true
    }
  });

  webpackServer.listen(parseInt(process.argv[4]));
}
process.send('started');