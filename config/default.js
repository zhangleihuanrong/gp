"use strict";

const debug=require('debug')('gp:config');
debug(`++++Running default configurations @${__filename}...`);

const path=require('path');
//const defer = require('config/defer').deferConfig;

const defaultConfig = {
  authentication : {
    bcrypt : {
      saltRound : 10,
      secretKey: "abcdefghijklmn123456"
    }
  },
  cms : {
    docRoot : path.resolve(__dirname, "../cms/docs"),
    imgRoot : path.resolve(__dirname, "../cms/images"),
    videoRoot : path.resolve(__dirname, "../cms/videos"),
  },
  server : {
    PORT : 3000
  }
};

const cmsConfig = defaultConfig['cms'];
const subContents = ['docRoot', 'imgRoot', 'videoRoot'];
for (var i = 0; i < subContents.length; i++) {
    const sc = subContents[i];
    debug(`  --SubContentRoot for: ${sc} is  ${cmsConfig[sc]}`);
}

module.exports=defaultConfig;
