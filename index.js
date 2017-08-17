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
  if(!options.webpackConfig){
    console.log('add a webpack config');
    process.exit(1);
  }
  let webpackConfig = require(process.cwd() + '/' + options.webpackConfig);
  if(!webpackConfig){
    console.log('missing webpack config');
    process.exit(1);
  }


  let projectDir = path.resolve(process.cwd(), options.args && options.args.length > 0 ? options.args[0] : ''),
      go = {cwd: projectDir},
      projectName = projectDir.split(path.sep).pop(),
      jasmineDir = `${process.cwd()}/node_modules/jasmine-core`,
      webpackBaseUrl = `http://localhost:${options.webpackPort}/`,
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
      return _.sortBy(arr, 'name');
    });
  }

  function getSpecsFromPattern(pattern){
    return new Promise((res, rej) => {
      glob(pattern, go, (err, files) => {
          if (err) {
              rej(err);
          } else {
              res(files.map(file => {
                const url = `http://localhost:${options.port}/specs/${file.toString().slice(0, -3)}`;
                return {
                  name: path.basename(file).replace(/\.[^/.]+$/, ""),
                  url,
                  debugUrl: `${url}?debug=true`
                };
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
      child = fork(__dirname + '/webpack.js', [options.webpackConfig, JSON.stringify(webpackConfig.entry), options.webpackPort], {cwd: process.cwd()});
      child.on('message', m => {
        if(m === 'started'){
          resolve();
        }
      });
    });
  }

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
      webpackConfig.entry[entryName] = availableEntries[entryName];
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
        .listen(options.port, () => {
          console.log(`HTTP server listening on port ${options.port}`);
          open(`http://localhost:${options.port}`);
        });
  });
}