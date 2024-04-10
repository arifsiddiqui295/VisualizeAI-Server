var express = require("express");
var router = express.Router();
var axios = require("axios");
const bcrypt = require("bcrypt");
var users = require("./users");
const post = require("./post");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const maxAge = 3 * 24 * 60 * 60;
const cloudinary = require("cloudinary").v2;
const createToken = (id) => {
    const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn:maxAge });
    return accessToken ;
  };
require('dotenv').config(); 
// console.log("hhh",process.env.OPENAI_API_KEY)
const handelErrors = (err) => {
  let errors = { username: "", password: "" };
  console.log(err);
  if (err == "Invalid username") {
    errors.username = "That username is not registered";
    console.log("erros = ", errors);
    // return errors;
  } else if (err == "Invalid password") {
    console.log("erros = ", errors);
    errors.password = "Incorrect password";
  } else if (err.code === 11000) {
    errors.username = "Username already exists";
    return errors;
  } else if (err.message.includes("User Validation Failed")) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
  }
  return errors;
};
cloudinary.config({
  cloud_name: "duj67thmo",
  api_key: "861867415328183",
  api_secret: "Imkv0Mi8uCtCvkFLil_hVucQqX0",
});
/* GET home page. */
router.get("/", function (req, res, next) {
  // res.render("index", { title: "Express" });
  res.json("hello")
});
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const newUser = new users({ username, email, password });
    await newUser.save();
    const token = createToken(newUser._id);
    res.cookie("jwt", token, {
      withCredentials: true,
      httpOnly: false,
      maxAge: maxAge * 1000,
    });
    res.status(201).json({ user: newUser._id, created: true });
  } catch (error) {
    const errors = handelErrors(error);
    res.json({ errors, created: false });
  }
});
router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  console.log('username', username);
  console.log('password', password);
  try {
    const authenticatedUser = await users.findOne({ username });
    console.log('authenticatedUser', authenticatedUser)
    if (!authenticatedUser) {
      const errors = handelErrors("Invalid username");
    }
    const auth = await authenticatedUser.comparepassword(req.body.password);
    console.log('auth', auth)
    if (!auth) {
      const errors = handelErrors("Invalid password");
    }

    const token = createToken(authenticatedUser._id);
    console.log("token = ",token)
    res.cookie("jwt", token, {
      withCredentials: true,
      httpOnly: false,
      maxAge: maxAge * 1000,
    });
    res.status(200).json({ user: authenticatedUser._id, loggedIn: true, token: token });
  } catch (error) {
    // Handle other errors
    const errors = handelErrors(error);
    console.log('error from login ',errors)
    res.json({ errors, created: false });
  }
});
router.post("/checkuser", async (req, res) => {
  // console.log("hhh",process.env.OPENAI_API_KEY)
  const token = req.cookies.jwt;
  console.log("towwwken = ", token);  
  if (token) {
    try {
      const decodedToken = jwt.verify(token, "hululu");
      console.log("decodedToken = ", decodedToken);
      const user = await users.findById(decodedToken.id);
      // console.log("user = ", user);
      if (user) {
        res.json({ status: true, user: user.username }); // Consider returning a different identifier
      } else {
        res.json({ status: false });
      }
    } catch (err) {
      console.error("JWT verification error:", err);
      res.json({ status: false, error: "Invalid token" }); // Generic error message
    }
  } else {
    res.json({ status: false });
  }
});
router.post("/api/logout", async (req, res) => {
  try {
    // Handle logout logic (e.g., invalidate token in database)
    res.clearCookie("token"); // Clear the token cookie on the server
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});
router.post("/api/v1/dalle", async (req, res) => {
  const {prompt } = req.body;
  // console.log(prompt);
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/images/generations",
      {
        model: "dall-e-2",
        prompt: `${prompt}`,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer  ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    // console.log(response.data); // Log the response data
    res.status(200).json({ photo: response.data });
  } catch (error) {
    console.error("Error while making the request:", error);
  }
});
router.post("/imagePost", async (req, res, next) => {
  try {
    const { user, prompt, src } = req.body;
    const photoUrl = await cloudinary.uploader.upload(src);
    console.log("photo url = ", photoUrl);
    const newPost = new post({
      name: user,
      prompt: prompt,
      photo: photoUrl.url,
    });
    await newPost.save();
    const foundUser = await users.findOne({ username: user });
    console.log("found user ", foundUser);
    foundUser.post.push(newPost);
    await foundUser.save();
    res.status(201).json({ success: true, data: newPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error });
  }
});
router.post("/getPost", async (req, res, next) => {
  const { profileUser } = req.body;
  // console.log("profile User = ", profileUser);
  try {
    const posts = await post.find({ name: profileUser });
    console.log("posts = ", posts);
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error });
  }
});
router.post("/getFeedPost", async (req, res, next) => {
  const posts = await post.find({});
  // console.log("posts = ", posts);
  res.status(200).json({ success: true, data: posts });
});

router.post("/toggleLiked", async (req, res) => {
  const token = req.cookies.jwt;
  console.log("token = ", token);
  if(token){
    const { postId, profileUser } = req.body;
  // console.log("postId = ", postId);
  // console.log("profileUser = ", profileUser);
  const findLikedUser = await users.findOne({ username: profileUser });
  // console.log("findLikedUser = ", findLikedUser);
  const findLikedUserName = findLikedUser.username;
  // console.log("findLikedUserName = ", findLikedUserName);
  const findPost = await post.findById(postId);
  // console.log("find post id: " , findPost)
  if (findPost) {
    const index = findPost.like.indexOf(findLikedUserName);
    if (index === -1) {
      findPost.like.push(findLikedUserName);
      console.log(`${findLikedUserName} liked this post.`);
    } else {
      findPost.like.splice(index, 1);
      console.log(`${findLikedUserName} unliked this post.`);
    }
  }
  await findPost.save();
  res.status(200).json(findPost);
  }
  else{
    res.json({success: false, message: "Unauthorized"})
  }
});
module.exports = router;
