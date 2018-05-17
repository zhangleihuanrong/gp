
var bodyParser=require('body-parser');
var jwt=require('jsonwebtoken');

var passport=require('passport');
var passportJwt=require('passport-jwt');

var users=require('./users');

const jwtKey="kljhgfnq409q4urlkndflkhp8yuq43yuadhf0290380uahsdf";

var JwtStrategy = passportJwt.Strategy;
var ExtractJwt = passportJwt.ExtractJwt;

var jwtOptions = {};
jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeader();
jwtOptions.secretOrKey = 'kljadhflakj';

var jwtStrategy = new JwtStrategy(jwtOptions, function(jwt_payload, next) {
  console.log('payload received', jwt_payload);
  var user = fakedUsers[_.findIndex(fakedUsers, {id:jwt_payload.id})];
  if (user) {
    next(null, user);
  }
  else {
    next(null, false);
  }
});

passport.use(jwtStrategy);

const CustomStrategy=require('passport-custom').CustomStrategy;


passport.use('lokiCustom', new CustomStrategy(function(req, done) {
    var user = users.findOne(req.body.username);
    if (user) {
        users.validatePassword(req.body.password, user.password, function(err, isSame) {
            if (isSame) {
                done(null, {username: user.id});
            }
            else {
                done('Wrong username or password!', null, 'Wrong username or password!');
            }
        });
    }
    else {
        done('Wrong username or password!', null, 'Wrong username or password!');
    }
}));



