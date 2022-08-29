var LocalStrategy   = require('passport-local').Strategy;
var User = require('../model/model.js');
var bCrypt = require('bcrypt-nodejs');

module.exports = function(passport){

	passport.use('signup', new LocalStrategy({
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, username, password, done) {

            findOrCreateUser = function(){
                User.findOne({ 'username' :  username }, function(err, user) {
                    if (err){
                        console.log('Error in SignUp: '+err);
                        return done(err);
                    }
                    if (user) {
                        console.log('User already exists with username: '+username);
                        return done(null, false);
                    } 
                    else {
                        if(validRegNo(password))
                        {
                        var newUser = new User({

                        username: username,
                        password: createHash(password),
                        email: req.param('email'),
                        
                    });
                        

                        newUser.save(function(err) {
                            if (err){
                                console.log('Error in Saving user: '+err);  
                                throw err;  
                            }
                            console.log('User Registration successful');    
                            return done(null, newUser);
                        });
                    	}
                    	else{
                    		console.log("invalid reg")
                    		return done(null,false);
                    	}
                    }
                });
            };
            process.nextTick(findOrCreateUser);
        })
    );

    // Generates hash using bCrypt
    var createHash = function(password){
        return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
    }
    var validRegNo=function(password){
    	return true; 
    }

}
