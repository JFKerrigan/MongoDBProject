const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const User = require('./models/userModel');
const auth = require('./middlewares/auth');
const Blogpost = require('./models/blogpostModel');

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
    const userDB = req.userFound;
    res.render('update', {
        user:userDB
    })
})

app.post('/update', auth.isLoggedIn, async (req, res) => {
    const {userName, userEmail,} = req.body
    const userDB = req.userFound;
    
    await User.findByIdAndUpdate( req.userFound._id, {
        name: userName,
        email: userEmail

    });
    res.render("update", {
        message: "details updated",
        user:userDB
    })
})

app.get('/password', auth.isLoggedIn, (req, res) => {
    res.render('password')
})

app.post('/password', auth.isLoggedIn, async (req, res) => {
    const {userPassword, userNewPassword, userConfirmNewPassword} = req.body
    const isMatch = await bcrypt.compare(userPassword, req.userFound.password)

    if(isMatch){
        if(userNewPassword != userConfirmNewPassword){
            res.render('password',{
                message: "Those new passwords don't quite match"
            })
        }else{
            const hashedpassword = await bcrypt.hash(userNewPassword, 13)
            await User.findByIdAndUpdate( req.userFound._id,{
                password: hashedpassword
            })
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

app.get("/newPost", auth.isLoggedIn, (req, res) => {
    res.render('newPost', {
       id: req.params.id
    });
})

app.post("/newPost", auth.isLoggedIn, async (req, res) => {
    
    
    await Blogpost.create({
        title: req.body.postTitle,
        body: req.body.postBody,
        user: req.userFound._id
    }); 

    res.send("Blog has been posted");
})

app.get("/userBlogPosts", auth.isLoggedIn, async (req, res) => {
    // const allPosts = await Blogpost.find();
    // console log(allPosts);
    // shows all posts from everyone
    
    const allPosts = await Blogpost.find({user: req.userFound._id}).populate('user', 'name'); 
    
    
        for(let i =0; i < allPosts.length; i++) {
            // console.log(allPosts[i].createdAt)
            
            const d = {
                day: allPosts[i].createdAt
            }
            const year = d.day.getFullYear() 
            const date = d.day.getDate()
            const months = [
                'January',
                'February',
                'March',
                'April',
                'May',
                'June',
                'July',
                'August',
                'September',
                'October',
                'November',
                'December'
              ]
            const monthIndex = d.day.getMonth()
            const monthName = months[monthIndex]
           
            const days = [
                'Sun',
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat'
              ]
              const dayName = days[d.day.getDay()] 
              let formatted = `${dayName}, ${date} ${monthName} ${year}`
            console.log(formatted)

            allPosts[i].createdAt = formatted
            console.log(allPosts[i].createdAt)
        }

    res.render("userBlogPosts", {
        allPosts
    });
});

app.get("/editPost", auth.isLoggedIn, async (req, res) => {
    res.render("editPost", {
        
    })
})

app.post("/editPost", auth.isLoggedIn, async (req, res) => {
    
})

app.get("/logout", auth.isLoggedIn, (req, res) => {
    res.render("logout")
})

app.post("/logout", auth.logout, (req, res) => {


    res.render("logout", {
        message: "you are logged out"
    })
})

app.get('*', (req, res) => {
    res.send("Not sure where you were heading but pretty sure this isn't it.")
});

app.listen(5000, () => {
    console.log("Server is running on port 5000")
});
