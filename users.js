'use strict';

const assert = require('assert');
const logger = require('winston');
const config = require('config');

const loki = require('lokijs');
const LokiFSCipherAdapter = require('loki-fs-cipher-adapter');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const cryptPassword = config['loki.password'];
const adapter= new LokiFSCipherAdapter({password : cryptPassword});
const db = new loki('data/users.db', {
    autoload: true,
    autoloadCallback: dbInitialize,
    autosave: true,
    autosaveInterval: 5000,
    adapter: adapter
});

var users = null;

exports.addUser=function addUser(user) {
    logger.assert(users != null, "users db should is still null!");
    logger.assert(user && user.id && user.password, "user id and password can not be null");
    let record = users.findOne({id: user.id});
    if (record) return `User ${user.id} already exists`;
    let hashedPassword = bcrypt.hashSync(user.password, saltRounds);
    users.insert({
        id: user.id, 
        password: hashedPassword, 
        email: user.email || "",
        roles: user.roles || []
    });
    return "";
}

exports.findOne=function(userId) {
    return users.findOne({id: userId});
}

exports.validatePassword=function(rawPass, encPass, cb) {
    bcrypt.compare(rawPass, encPass, cb);
}

function dbInitialize(err) { 
    logger.assert(!(err && err instanceof Error), "Error init users db", err.message);

    users = db.getCollection('users');
    if (users === null) {
        logger.verbose("Initializing users database...");
        users = db.addCollection('users');
        // [ {id: 'admin', password: 'abcd0987)(*&ABCD', roles:['admin']}, {id: 'test', password: 'test', roles: ['test']} ]...;
        const startingUsers = config.initialUsers; 
        startingUsers.map(user => { addUser(user); });
        verbose.verbose("Added starting users to db...");
        db.save((err) => { 
            logger.assert(!err, "Error saving users db", err);
        });
    }
}

