const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require("dotenv").config();
const userSchema = new mongoose.Schema({
  username:{
    type:String,
    required:[true,"Email is required"],
    unique:true
  },
  password: {
    type:String,
    required:[true,"Password is required"]
  },
  email:String,
  post:[
    {
      type:mongoose.Schema.Types.ObjectId,
      ref: "post"
    }
  ],
})
userSchema.pre("save", async function(){
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password,salt);
});
mongoose.connect(process.env.MONGO_URL).then((result)=>{
  console.log("connected to database")
}).catch(err=>{
  console.log(err.message)
})
module.exports = mongoose.model('users',userSchema)