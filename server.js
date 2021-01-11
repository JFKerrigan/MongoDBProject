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
            res.render("profile", {
                user
            })
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
app.get("/adminProfile", auth.isLoggedIn, async (req, res) => {
    if(req.userFound.admin == true){
        const userDB = req.userFound;
        console.log(userDB);
        res.render('adminProfile', {
            user: userDB,
        });
    }else{
        const userDB = req.userFound;
        console.log(userDB);
        res.render('profile', {
            user: userDB
        });
    }
})

app.get("/profile", auth.isLoggedIn, async (req, res) => {
    try {
        if( req.userFound ) {
            if(req.userFound.admin == true){
                const userDB = (req.userFound);
                console.log(userDB);
                res.render('adminProfile', {
                    user: userDB,
                });
            }else{
                const userDB = req.userFound;
                console.log(userDB);
                res.render('profile', {
                    user: userDB
                });
            }
            // const userDB = await User.findById(req.params.userId);
            
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
    
    
    await User.findByIdAndUpdate( req.userFound._id, {
        name: userName,
        email: userEmail

    });
    const userDB = req.userFound;
    res.render("profile", {
        message: "details updated",
        user:userDB
    })
})

app.get('/allUsersAdmin', auth.isLoggedIn, async (req, res) =>{
    if(req.userFound.admin == true) {
        const usersDB = await User.find();
        console.log(usersDB)
        res.render('allUsersAdmin', {
            user: usersDB
        });
    }else{
        res.send('You do not have the authorisation to access this information')
    }
})

app.post('/adminEdit', auth.isLoggedIn, async (req, res) =>{
    if(req.userFound.admin == true) {
        const usersDB = await User.findById(req.body.id);
        console.log(usersDB)
        res.render('adminEdit', {
            user: usersDB
        });
    }else{
        res.send('You do not have the authorisation to access this information')
    }
})

app.post('/adminEdit/:id', auth.isLoggedIn, async (req, res) =>{
    
    if(req.userFound.admin == true) {
        
        const adminEdit = await User.findByIdAndUpdate( req.params.id, {
            name: req.body.userName,
            email: req.body.userEmail
        });
        const usersDB = await User.find();
        res.render("allUsersAdmin",{
                message: "user updated",
                user: adminEdit,
                user: usersDB})
        
    }else{
        res.send('You do not have the authorisation to access this information')
    }
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

app.get('/delete', auth.isLoggedIn, async (req, res) => {
    try{
        await User.findByIdAndDelete(req.userFound._id);
        res.send("User has been deleted");
    } catch(error) {
        res.send("That user does not exist");
    };
});

app.get("/newPost", auth.isLoggedIn, (req, res) => {
    res.render('newPost', {
       id: req.params.id
    });
})

app.post("/newPost", auth.isLoggedIn, async (req, res) => {
    
    const userDB = req.userFound;
    await Blogpost.create({
        title: req.body.postTitle,
        body: req.body.postBody,
        user: req.userFound._id
    }); 

    res.render("profile", {
        message: "Blog updated",
        user: userDB
    });
})

app.get("/userBlogPosts", auth.isLoggedIn, async (req, res) => {
    // const allPosts = await Blogpost.find();
    // console log(allPosts);
    // shows all posts from everyone
    
    const name = await req.userFound.name;
    const allPosts = await Blogpost.find({user: req.userFound._id}).populate('user', 'name'); 
    let d= []
    console.log(allPosts.length)
        for(let i =0; i < allPosts.length; i++) {
            // console.log(allPosts[i].createdAt)
            
            // const dates = {
            //     day: allPosts[i].createdAt
            // }

            const dates= new Date(allPosts[i].createdAt)
            const year = dates.getFullYear() 
            const getDay = dates.getDate()
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
            const monthIndex = dates.getMonth()
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
            const dayName = days[dates.getDay()] 
            let formatted = `${dayName}, ${getDay} ${monthName} ${year}`
            // console.log(formatted)
            d.push(
                formatted
            )
        }
        console.log(d)
        let myDate =[]

        for(var i = 0; i < allPosts.length; ++i){
            myDate.push({
                blog: allPosts[i],
                date: d[i]
            });
        }
    res.render("userBlogPosts", {
        // allPosts, 
        name, 
        myDate,
        
    });
});

app.get("/editPost/:id", auth.isLoggedIn, async (req, res) => {
    const editPost = await Blogpost.findById(req.params.id)
    console.log(editPost)
    res.render("editPost", {
        blogpost: editPost
    })
})

app.post("/editPost/:id", auth.isLoggedIn, async (req, res) => {
    const {postTitle, postBody,} = req.body
    ;
    const userDB = req.userFound;
    await Blogpost.findByIdAndUpdate( req.params.id, {
        title: postTitle,
        body: postBody

    });
    res.render("profile", {
        user:userDB,
        message: "blog updated",
    })
})

app.post("/delete/:id", auth.isLoggedIn, async (req, res) => {
    await Blogpost.findByIdAndDelete(req.params.id);
    const userDB = req.userFound;
    res.render("profile",{
        message: "blog post deleted",
    })
})

app.get("/logout", auth.isLoggedIn, (req, res) => {
    res.render("logout")
})

app.post("/logout", auth.logout, (req, res) => {


    res.render("login", {
        message: "you are logged out"
    })
})

app.get('*', (req, res) => {
    res.send("Not sure where you were heading but pretty sure this isn't it.")
});

app.listen(5000, () => {
    console.log("Server is running on port 5000")
});