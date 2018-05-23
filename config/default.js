"use strict";

const debug = require('debug')('gp:config');
debug(`++++Running default configurations @${__filename}...`);

const defer = require('config/defer').deferConfig;
const path = require('path');
const fs = require('fs');

const applicationName = 'gp';
const applicationUser = 'gp';
const saltRound = 10;

const keytar = require('keytar');
const bcrypt = require('bcrypt');

function KeyVault(kvs) {
  this.keyValues = kvs;
  this.getPassword = function(service, account) {
    return Promise.resolve(this.keyValues[service][account]);
  }
}

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
  keyVault = new KeyVault(eval(origin));
}

async function getDecryptedSecret(service, account) {
  let rawPassword = await keyVault.getPassword(service, account);
  debug(`   -got password for ${service} ${account}: [${rawPassword}]`);
  return rawPassword;
}

let adminPass = getDecryptedSecret(applicationName, 'admin');
let testPass = getDecryptedSecret(applicationName, 'test');
let writerPass = getDecryptedSecret(applicationName, 'writer');

const defaultConfig = {
  application: { 
    name: applicationName, 
    user: applicationUser
  },
  initialUsers : [
    {id: 'admin', password: adminPass, roles:['admin']}, 
    {id: 'test', password: testPass, roles: ['test']},
    {id: 'writer', password: writerPass, roles: ['writer']},
    {id: 'guest', password: 'guest', roles: ['guest']},
  ],
  authentication : {
    bcrypt : { saltRound }
  },
  cms : {
    rootDirs: {
      docs : path.resolve(__dirname, "../cms/docs"),
      images : path.resolve(__dirname, "../cms/images"),
      videos : path.resolve(__dirname, "../cms/videos"),
    }
  },
  server : {
    PORT : 3000
  },
  loki : {
    password: getDecryptedSecret('gp', 'loki'),
  }
};

const cmsConfig = defaultConfig['cms']['rootDirs'];
for (let key in cmsConfig) {
    debug(`  --SubContentRoot for: ${key} is  ${cmsConfig[key]}`);
}

module.exports=defaultConfig;
