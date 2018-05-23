"use strict";

const debug=require('debug')('gp:api');
debug(`++++Running js script ${__filename}...`);

const config=require('config');
const express=require('express');
const { lstatSync, readdirSync } = require('fs')
const { join } = require('path')

function isDirectory(source) {
    return lstatSync(source).isDirectory();
};

function isFile(source) {
    return lstatSync(source).isFile();
};

function getDirTree(source, parentId, result) {
    let children = readdirSync(source);
    for (let i in children) {
        let name = children[i];
        let fullPath = join(source, name);
        if (isDirectory(fullPath)) {
            let subdir = { id: `${parentId}/${name}`, text: name, children: []};
            result.push(subdir);
            getDirTree(fullPath, subdir.id, subdir.children);
        }
    }
}

function listFiles(source, parentId) {
    const children = readdirSync(source);
    const subFiles = [];
    for (let i in children) {
        let name = children[i];
        let fullPath = join(source, name);
        if (isFile(fullPath)) {
            let subFile = { id: `${parentId}/${name}`, text: name};
            subFiles.push(subdir);
        }
    }
    return subFiles;
}

const moduleName='api';
const treeOfModules = {};
const router=express.Router();

router.get('/tree/:module', function (req, res, next) {
    debug(`  ~~Processing ${req.url}  ${req.originalUrl}`);
    let moduleName = req.params['module'];
    if (!treeOfModules.hasOwnProperty(moduleName)) {
        const moduleRoot = config.get(`cms.rootDirs.${moduleName}`);
        const rootNode = { id: moduleName, text: moduleName, children: [] };
        getDirTree(moduleRoot, rootNode.id, rootNode.children);
        treeOfModules[moduleName] = rootNode;
        debug(rootNode);
    }
    const tree = treeOfModules[moduleName];
    res.send(tree);
});

router.get('/:module/*', function (req, res, next) {
    debug(`  ~~Processing ${req.url}  ${req.originalUrl}`);
    let moduleName = req.params['module'];
    const moduleRoot = config.get(`cms.rootDirs.${moduleName}`);
    const subPath = req.url.substring(2 + moduleName.length);
    const fullPath = join(moduleRoot, subPath);
    const subFiles = listFiles(fullPath, subPath);
    debug(subFiles);
    res.send(subFiles); 
});

module.exports = router;
