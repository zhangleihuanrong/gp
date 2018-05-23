'use strict';

const bcrypt = require('bcrypt');

const rawPassword = process.argv[2];
const saltRound = parseInt(process.argv[3]) || 10;

var hash=bcrypt.hashSync(rawPassword, saltRound);

console.log(`[${rawPassword}] ==> [${hash}]`);

