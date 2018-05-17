'use strict';

const bcrypt=require('bcrypt');
const config=require('config');

var saltRound=config.get('authentication.bcrypt.saltRound');
var bcryptSecret=config.get('authentication.bcrypt.secretKey');

var rawPassword=process.argv[2];

var hash=bcrypt.hashSync(rawPassword, saltRound);

console.log(`[${rawPassword}] ==> [${hash}]`);

