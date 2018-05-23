"use strict";

const debug = require('debug')('gp:config');
debug(`++++Running default configurations @${__filename}...`);

const path = require('path');
const fs = require('fs');

const applicationName = 'gp';
const applicationUser = 'gp';
const saltRound = 10;

const keytar = require('keytar');
const bcrypt = require('bcrypt');
//const defer = require('config/defer').deferConfig;

// function getPassword(service, account) will be added to this object
let keyVault = null;

let secretKeyLocation = process.env.SECRET_KEY_LOCATION || 'keytar';
if (secretKeyLocation == 'keyring' || secretKeyLocation == 'keytar') {
  // All password saved in keyring. Not working when application run as system service.
  keyVault = keytar;
}
else if (secretKeyLocation == 'file') {
  var crypto = require('crypto');

  assert(fs.existsSync(secretKeyLocation), `${secretKeyLocation} not exists`);
  // TODO: check read only by user
  let secret = fs.readFileSync(secretKeyLocation, "utf8");
  //Default value: "abcd1234ABCD!@#$", please change it and remember original password.
  validateHash: "$2b$10$RfGTA9i4SBHV6g1DMFMe0eYDcgW5xw8sHobFeRth1PUgTxusph9wm";
  assert(bcrypt.compareSync(secret, conf.validateHash) === true, "Secret is not matching with recorded hash!");

  let encryptedConfigFile = process.env.ENCRYPTED_CONFIG_LOCATION;

  let encryptedContent = fs.readFileSync(encryptedConfigFile, "utf8");
  
  let decipher = crypto.createDecipher('aes-128-cbc', secret);
  let origin = decipher.update(encryptedContent, 'hex', 'utf8')
  origin += decipher.update.final('utf8');
  debug(origin);  // origin should be object { service: { account : password...}}
  keyVault = eval(origin);
  keyVault['getPassword'] = function(service, account) {
    return this[service][account];
  }
}

function getDecryptedSecret(service, account)  {
  let rawPassword = keytar.getPassword(applicationName, applicationUser);
  return rawPassword;
}

const defaultConfig = {
  application: { 
    name: applicationName, 
    user: applicationUser
  },
  initialUsers : [
    {id: 'admin', password: getDecryptedSecret('gp', 'admin'), roles:['admin']}, 
    {id: 'test', password: getDecryptedSecret('gp', 'test'), roles: ['test']},
    {id: 'user1', password: getDecryptedSecret('gp', 'user1'), roles: ['writer']},
    {id: 'user2', password: getDecryptedSecret('gp', 'user2'), roles: ['writer']},
    {id: 'guest', password: 'guest', roles: ['guest']},
  ],
  authentication : {
    bcrypt : { saltRound }
  },
  cms : {
    docRoot : path.resolve(__dirname, "../cms/docs"),
    imgRoot : path.resolve(__dirname, "../cms/images"),
    videoRoot : path.resolve(__dirname, "../cms/videos"),
  },
  server : {
    PORT : 3000
  },
  loki : {
    password: getDecryptedSecret('gp', 'loki'),
  }
};

const cmsConfig = defaultConfig['cms'];
const subContents = ['docRoot', 'imgRoot', 'videoRoot'];
for (var i = 0; i < subContents.length; i++) {
    const sc = subContents[i];
    debug(`  --SubContentRoot for: ${sc} is  ${cmsConfig[sc]}`);
}

module.exports=defaultConfig;
