#! /usr/bin/env node

let sambac = require('../index.js');
    program = require('commander'),

program
    .usage('[options] <file ...>')
    .option('--webpackConfig <webpackConfig>', 'webpackConfigLocation')
    .option('--port <portNumber>', 'serve spec list on the specified local port number', 5678)
    .option('--webpackPort <webpackPort>', 'local webpack dev server port ', 5679)
    .parse(process.argv);

sambac(program);