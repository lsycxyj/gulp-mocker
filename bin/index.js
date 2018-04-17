#!/usr/bin/env node

const command = require('../src/command');
const argv = require('optimist').argv;

const pkg = require('../package.json');

command.exec(argv);
