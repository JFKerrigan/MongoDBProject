const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const { json } = require('express');

exports.isLoggedIn = async (req, res, next) => {
    console.log("Checking if user is logged in")

    if(req.cookies.jwt) {
        console.log("The cookie jwt exists")
        const decoded = await jwt.verify(req.cookies.jwt, process.env.JWT_SECRET)
        console.log("My token decoded")
        console.log(decoded)

        req.userFound = await User.findById(decoded.id);
    }

    next();
}

exports.logout = (req, res, next) => {
    res.cookie('jwt' ,'logout', {
        expires: new Date( Date.now() + 2*1000),
    httpOnly: true
});
  
    
    next();
}