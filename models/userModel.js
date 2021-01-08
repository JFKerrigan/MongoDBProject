const mongoose = require('mongoose');

const user = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        // unique: true,
        required: true
        // validate: {
        //     validator: function(value) {
        //         const self = this;
        //         const errorMsg = 'Email already in use!';
        //         return new Promise((resolve, reject) => {
        //             self.constructor.findOne({ email: value })
        //                 .then(model => model._id ? reject(new Error(errorMsg)) : resolve(true)) // if _id found then email already in use 
        //                 .catch(err => resolve(true)) // make sure to check for db errors here
        //         });
        //     },
        // }
    },
    password: {
        type: String,
        required: true
    },
    admin: { 
        type: Boolean,
        default: false
    }
}); 

module.exports = mongoose.model('user', user);