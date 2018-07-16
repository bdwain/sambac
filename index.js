let _ = require('lodash'),
    glob = require('glob'),
    path = require('path'),
    express = require('express'),
    http = require('http'),
    serveIndex = require('serve-index'),
    open = require('open'),
    fork = require('child_process').fork,
    WebpackJasmineHtmlRunnerPlugin = require('webpack-jasmine-html-runner-plugin');

module.exports = function(options){
  let port = options.port || 5678;
  let webpackPort = options.webpackPort || 5679;

  if(!options.webpackConfig){
    console.log('add a webpack config');
    process.exit(1);
  }

  let webpackConfig = require(path.resolve(process.cwd(), options.webpackConfig));
  if(!webpackConfig){
    console.log('missing webpack config');
    process.exit(1);
  }


  let projectDir = process.cwd(),
      go = {cwd: projectDir},
      projectName = projectDir.split(path.sep).pop(),
      jasmineDir = path.resolve(require.resolve('jasmine-core'), '..', '..'),
      webpackBaseUrl = `http://localhost:${webpackPort}/`,
      webpackLiveReloadBaseUrl = `${webpackBaseUrl}webpack-dev-server/`;

  let specGlobs = webpackConfig.entry;

  function getSpecs() {
    let promise;
    if(Array.isArray(specGlobs)){
      promise = Promise.all(specGlobs.map(getSpecsFromPattern)).then(arrs => {
        return [].concat(...arrs);
      })
    }
    else{
      promise = getSpecsFromPattern(specGlobs);
    }
    return promise.then(arr => {
      return _.sortBy(arr, getDisplayOption());
    });
  }

  function getCommonStartPath(files) {
    files = files.sort();
    const first = files[0];
    const last = files[files.length - 1];
    let rv = '';
    if (first !== last) {
      let i;
      for (i = 0; i < first.length && i < last.length && first.charAt(i) === last.charAt(i); ++i) {
        // No body, just leading i along
      }
      rv = first.substring(0, i);
    }
    return rv;
  }

  function getDisplayOption(spec) {
    const fileLongEnough = spec ? spec.file.length > spec.name.length : true;
    return (options.showPath && fileLongEnough) ? 'file' : 'name';
  }

  function getSpecsFromPattern(pattern){
    return new Promise((res, rej) => {
      glob(pattern, go, (err, files) => {
          if (err) {
              rej(err);
          } else {
              const commonStart = getCommonStartPath(files);
              res(files.map(file => {
                const url = `http://localhost:${port}/specs/${file.toString().slice(0, -3)}`;
                const rv = {
                  name: path.basename(file).replace(/\.[^/.]+$/, ""),
                  file: file.replace(commonStart, '').replace(/\.[^/.]+$/, ""),
                  url,
                  debugUrl: `${url}?debug=true`
                };
                rv.display = rv[getDisplayOption(rv)];
                return rv;
              }));
          }
      });
    });
  }

  let app = express();

  app.set('view engine', 'jade');
  app.set('views', `${__dirname}/views`);
  app.use('/jasmine', serveIndex(jasmineDir, {icons: true}));
  app.use('/jasmine', express.static(jasmineDir));

  app.get('/', (req, res) => {
      getSpecs()
          .then(specs => {
              res.render('home', {
                  projectName,
                  specs
              });
          })
          .catch(error => {
              res.status(500).render('500', {error});
          });
  });

  const pattern = webpackConfig.entry;
  let availableEntries;
  if(Array.isArray(pattern)){
    availableEntries = WebpackJasmineHtmlRunnerPlugin.entry(...webpackConfig.entry);
  }
  else{
    availableEntries = WebpackJasmineHtmlRunnerPlugin.entry(webpackConfig.entry);
  }
  const availableEntryKeys = Object.keys(availableEntries);
  webpackConfig.entry = {};

  let child;

  process.on('exit', function(){
    child.kill();
  });

  function restartFork(entryMap){
    return new Promise((resolve) => {
      child = fork(__dirname + '/webpack.js', [options.webpackConfig, JSON.stringify(webpackConfig.entry), webpackPort], {cwd: process.cwd()});
      child.on('message', m => {
        if(m === 'started'){
          resolve();
        }
      });
    });
  }

  const sambacOptions = webpackConfig.sambac || {};
  const includePaths = sambacOptions.includePaths || [];

  app.get('/specs/*?', (req, res, next) => {
    function redirect(){
      let newUrl;
      if(!req.query.debug){
        newUrl = `${webpackLiveReloadBaseUrl}${specPath}.html`;
      }
      else{
        newUrl = `${webpackBaseUrl}${specPath}.html`
      }
      res.redirect(newUrl);
    }

    const specPath = req.params[0];
    let entryName = availableEntryKeys.find(entry => entry.endsWith(specPath));
    if(!webpackConfig.entry[entryName]){
      webpackConfig.entry[entryName] = includePaths.concat(availableEntries[entryName]);
      child.kill();
      restartFork().then(redirect);
    }
    else{
      redirect();
    }
  });

  restartFork().then(() => {
    http
        .createServer(app)
        .listen(port, () => {
          console.log(`HTTP server listening on port ${port}`);
          open(`http://localhost:${port}`);
        });
  });
}
