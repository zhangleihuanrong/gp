"use strict";

const debug=require('debug')('gp:cms');
debug(`++++Running js script ${__filename}...`);

const config=require('config');
const express=require('express');
const router=express.Router();

const moduleName='cms';

router.get('/', function (req, res, next) {
    debug(`  ~~Sending redirect ${req.url}  ${req.originalUrl}`);
    if (req.originalUrl.endsWith("/")) {
        res.redirect('docs');
    }
    else {
        //ignore /gp such case
        next('route');
    }
});