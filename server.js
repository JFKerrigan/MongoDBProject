const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('./models/userModel');
const auth = require('./middlewares/auth');

const app = express();
dotenv.config( { path: './.env' } );

mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
}).then( () => console.log("MongoDB is connected"));

const viewsPath = path.join(__dirname, '/views');
const publicDirectory = path.join(__dirname, '/public');

app.set('views', viewsPath);
app.set('view engine', 'hbs');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({extended: false}));
app.use(express.json({extended: false}));
app.use(cookieParser());

app.get('/', (req, res) => {
    res.render('index')
});

app.get('/register', (req, res) => {
    res.render('register')
});

app.post('/register', async (req, res) => {
    const {userName, userEmail, userPassword, userConfirmPassword} = req.body
    const email = await User.find({email: userEmail})
    if(email.length > 0) {
        res.render('register', {
            message: "Oops, that email looks a little familiar"
        })
    }else if(userPassword != userConfirmPassword){
        res.render('register', {
            message: "Don't think those passwords quite matched, try again?"
        })
    } else{
    const hashedPassword = await bcrypt.hash(req.body.userPassword, 13)
    
    await User.create({
        name: userName,
        email: userEmail,
        password: hashedPassword
    }); 
    
    res.render("register", {
        message: "User registered"
    });
     }
});

app.get('/login', (req, res) => {
    res.render("login")
});

app.post('/login', async (req, res) => {
 
    try {
        const user = await User.findOne({ email: req.body.userEmail })
        const isMatch = await bcrypt.compare(req.body.userPassword, user.password)

        if (isMatch) {
         
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {
                expiresIn: process.env.JWT_EXPIRES_IN,
            });

            console.log(token); 

            const cookieOptions = {
                expires: new Date(
                    Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
                ),
                httpOnly:true
            }
            res.cookie('jwt', token, cookieOptions);
            res.send("You are logged in")
        } else {
            const error = "login failed";
            res.send("details not recognised");
        }
    } catch (err) {
        const error = "login failed";
        res.render("login", {
            error: error
        });
    }
});

app.get("/profile", auth.isLoggedIn, async (req, res) => {
    try {
        if( req.userFound ) {
            // const userDB = await User.findById(req.params.userId);
            const userDB = req.userFound;
            console.log(userDB);
            res.render('profile', {
                user: userDB
            });
        } else {
            res.render("login",{
            message: "You are not logged in"});
        }
    } catch(error) {
        res.render("login",{
            message: "User not found"});
    }
});

app.get('/update', auth.isLoggedIn, (req, res) => {
    res.render('update')
})

app.post('/update', auth.isLoggedIn, async (req, res) => {
    const {userName, userEmail,} = req.body
    
    await User.findByIdAndUpdate( req.userFound._id, {
        name: userName,
        email: userEmail

    });
    res.render("update", {
        message: "details updated"
    })
})

app.get('/password', auth.isLoggedIn, (req, res) => {
    res.render('password')
})

app.post('/password', auth.isLoggedIn, async (req, res) => {
    const {userPassword, userNewPassword, userConfirmNewPassword} = req.body
    const isMatch = await bcrypt.compare(req.body.userPassword, User.password)

    if(isMatch){
        if(userNewPassword != userConfirmNewPassword){
            res.render('password',{
                message: "Those new passwords don't quite match"
            })
        }else{
            await User.findByIdAndUpdate( req.userFound._id),{
                password: userNewPassword
            }
            res.render('password', {
                message: "password updated"
            })
        }
    }else{
        res.render('password', {
            message: "Don't think you got your current password right, try again"
        })
    }
    
})


app.get('*', (req, res) => {
    res.send("Not sure where you were heading but pretty sure this isn't it.")
});

app.listen(5000, () => {
    console.log("Server is running on port 5000")
});
