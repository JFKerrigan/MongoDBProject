const mongoose = require('mongoose');
const opts = {
    // Make Mongoose use Unix time (seconds since Jan 1, 1970)
    timestamps: { timestamps: { currentTime: () => {Math.floor(Date.toDateString() / 1000)} }
    }
  };

const blogpost = new mongoose.Schema({
    title:{
    type: String,
    required: true
},
body:{
    type: String,
    required: true
},
user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'user'
} 
}, 
    opts
)
module.exports = mongoose.model('blogpost', blogpost)