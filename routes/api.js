"use strict";

const debug=require('debug')('gp:api');
debug(`++++Running js script ${__filename}...`);

const config=require('config');
const express=require('express');

// const showdown  = require('showdown');
// const mdConverter = new showdown.Converter();

const { lstatSync, readdirSync, readFile } = require('fs')
const { join } = require('path')

function isDirectory(source) {
    return lstatSync(source).isDirectory();
};

function isFile(source) {
    return lstatSync(source).isFile();
};

// parentPath should be relative, starting from ""
function getDirTree(moduleRoot, parentPath, result) {
    let source = join(moduleRoot, parentPath);
    let children = readdirSync(source);
    for (let i in children) {
        let text = children[i];
        let fullPath = join(source, text);
        if (isDirectory(fullPath)) {
            let relpath = join(parentPath, text);

            // TODO: use better and faster hash function
            const hasher = require('crypto').createHash('sha1');
            hasher.update(relpath);
            let id = hasher.digest('hex');

            let subdir = { id, text, children: []};
            result.push(subdir);
            getDirTree(moduleRoot, relpath, subdir.children);
        }
    }
}

function listFiles(moduleRoot, relativePath) {
    const fullPath = join(moduleRoot, relativePath);
    const children = readdirSync(fullPath);
    const subFiles = [];
    for (let i in children) {
        let childName = children[i];
        let childFullPath = join(fullPath, childName);
        let childRelative = join(relativePath, childName)
        if (isFile(childFullPath)) {
            let subFile = [ childName, childRelative ];
            subFiles.push(subFile);
        }
    }
    return subFiles;
}

const moduleName='api';
const treeOfModules = {};
const router=express.Router();

router.get('*', function (req, res, next) {
    debug(`  ~~API  ROUTE got ${req.url}  from ${req.originalUrl}`);
    next();
});

router.get('/tree/:module(docs)', function (req, res, next) {
    let moduleName = req.params['module'];
    let refresh = req.query['refresh'] || false;
    if (!treeOfModules.hasOwnProperty(moduleName) || refresh) {
        const moduleRoot = config.get(`cms.rootDirs.${moduleName}`);
        const rootNodes = [{ id: `cms_doc_root`, text: moduleName, state: {opened: true}, children: []}];
        getDirTree(moduleRoot, '', rootNodes[0].children);
        treeOfModules[moduleName] = rootNodes;
    }
    const tree = treeOfModules[moduleName];
    debug(JSON.stringify(tree));
    res.json(tree);
    res.end();
});

router.get('/:module(docs)/*', function (req, res, next) {
    let moduleName = req.params['module'];
    const moduleRoot = config.get(`cms.rootDirs.${moduleName}`);
    const relativePath = req.url.substring(2 + moduleName.length);
    const fullPath = join(moduleRoot, relativePath);
    if (isDirectory(fullPath)) {
        const subFiles = listFiles(moduleRoot, relativePath);
        debug(subFiles);
        res.json(subFiles);
        res.end();
    } else {
        if (fullPath.endsWith('.md')) {
            readFile(fullPath, 'utf8', (err, text) => {
                // //TODO: should do convert on client
                // const html = mdConverter.makeHtml(text);
                res.send(text);
            });
        }
        else {
            next();
        }
    }
});

router.get('*', function (req, res, next) {
    debug(`  ~~API ROUTE did not handle ${req.url}  from ${req.originalUrl}`);
    next();
});

module.exports = router;
