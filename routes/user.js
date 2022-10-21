var express = require('express');
const { doSignup, doLogin } = require('../helpers/user-helper');
const productHelper = require('../helpers/product-helper')
var router = express.Router();

// cache clearing middleware
const clearCache = (req,res,next)=>{
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next()
}

// verify Login middleware
const verifyLogin = (req,res,next)=>{
  if(req.session.userLoggedIn){
    next()
  }else{
    res.redirect('/')
  }
}


// Landing page
router.route('/')
.get(function(req, res) {
  productHelper.getAllProducts().then((products)=>{
    // console.log(products);
    res.render('user/landingPage',{user : req.session.user, products});
  })
  
});

// Login page
router.route('/login')
.get(clearCache, function(req, res) {
  if (req.session.userLoggedIn){
    res.redirect('/');
  }else
  res.render('user/login',{loginErr:req.session.loginErr});
  req.session.loginErr=null;
})
.post(function(req, res) {
  // console.log(req.body);
  doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user=response.user
      req.session.userLoggedIn=true
      res.redirect('/')
    }else{
      req.session.loginErr="Invalid credentials!!!"
      res.redirect('/login')
    }
  })
});

// Signup page
router.route('/signup')
.get(function(req, res) {
  res.render('user/signup',{emailErr:req.session.emailErr});
  req.session.emailErr=null;
})
.post(function(req,res){
  doSignup(req.body).then(()=>{
    res.redirect('/login');
  }).catch((err)=>{
    req.session.emailErr=err.status
    res.redirect('/signup')
  })
})

// product page
router.route('/view-product')
.get(function(req, res) {
  res.render('user/viewProduct');
});

// Otp page
router.route('/otp-page')
.get(function(req, res) {
  res.render('user/otpPage');
});

// Logout route
router.get('/logout',(req,res)=>{
  req.session.user=false;
  req.session.userLoggedIn = false;
  res.redirect('/')
})

// OTP routes
router.route('/phonePost')
.get(function (req, res){
  res.render('user/enterMobile')
})
.post(function (req, res){
  console.log(req.body);
  res.redirect('/otp-page')
})

// cart route
router.route('/cart')
.get(verifyLogin, function(req, res){
  res.render('user/cart',{user : req.session.user})
})



module.exports = router;
