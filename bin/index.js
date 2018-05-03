#!/usr/bin/env node

const program = require('commander');
const command = require('../src/command');
const argv = require('optimist').argv;

const pkg = require('../package.json');

program.version(pkg.version, '-v, --version')
    .usage('[options]')
    .description('Gulp Mocker. A mock server can be used with gulp and more.')
    .option('-c, --config [filePath]', 'Config file.')
    .option('-r, --mockPath [filePath]', `Mock responses files' root path.`)
    .option('-p, --port [port]', 'Mock server port.')
    .parse(process.argv);

command.exec(argv);
