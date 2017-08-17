# sambac
Run your Jasmine specs in the browser.

### Requirements
- webpack 2
- jasmine

### Setup

1. `yarn add sambac-webpack --dev` (or npm install)
2. Add a normal webpack configuration to your project. This conifguration should contain whatever loaders/rules/plugins are needed to run your tests. The entry point should be a string or an array of strings with globs that match all of your spec files, as relative paths from the root directory. [See an example](example/webpack.config.js).

### To Run
Make a package.json script with `sambac --webpackConfig PATH_TO_CONFIG`

A tab will open up in your browser with a list of specs to run. Clicking the links will open up tabs that run the specs and show the results every time that file or its dependencies change.

If you click the debug link, the loaded tab will not refresh automatically on file saving. The sourcemaps will refresh every time you refresh tbe browser though. 

#### Command line options

`--port 1234` The port the server runs on which displays the list of specs to run (default: 5678)

`--webpackPort 1235` The port the webpack dev server runs on (default: 5679)

#### Node API

If you need to run sambac with the node API:

```js
const sambac = require('sambac-webpack');
sambac({
  webpackConfig: PATH
  port: port,
  webpackPort: webpackPort
});
```

all of the options have the same defaults as the command line.

#### Configuration options
To customize sambac, add a sambac property to your webpack config

```js
  sambac: {
    includePaths: ['/node_modules/babel-polyfill/dist/polyfill.min.js'],
    pattern: /spec$/
  }
```

##### includePaths
These files will be included in the generated bundles for each spec.

##### pattern (default: `/.*\bspec\b.*/i`)
If test-runners are inadvertently being created for included files, change this regex to filter them out.
