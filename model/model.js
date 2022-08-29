var mongoose = require('mongoose');
 
module.exports = mongoose.model('User',{
    username: { type: String, require: true},
    password: { type: String, require: true},
    email: { type: String, require: true},
    default: []
	 
});


