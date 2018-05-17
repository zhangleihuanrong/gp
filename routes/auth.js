// const express=require('express');
// const jwt=require('jsonwebtoken');
const passport=require('passport');

const users=require('../users');
const logger=require('winston');

const router=express.Router();
router.post('/login', function(req, res, next) {
    passport.authenticate(
        'lokiCustom', 
        {session: false, failureRedirect: '/login'}, 
        function(err, user, info) {
            req.login(user, {session: false}, function(err) {
                res.send(err);
            });
            const token = jwt.sign(user, jwtKey);
            return res.json({user, token});
        }
    )(req, res);
});

router.post('/user', passport.authenticate('jwt', {session: false}), user);