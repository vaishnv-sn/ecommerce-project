var express = require('express');
const { doSignup, doLogin } = require('../helpers/user-helper');
const productHelper = require('../helpers/product-helper');
const userHelper = require('../helpers/user-helper');
const { response } = require('express');
var router = express.Router();
const { clearCache, verifyLogin } = require("../Middlewares/routeProtection");


// verify Login middleware


/* -------------------------------------------------------------------------- */
/*                        Landing page route                                  */
/* -------------------------------------------------------------------------- */
router.route('/')
  .get(function (req, res) {
    productHelper.getAllProducts().then((products) => {
      // console.log(products);
      res.render('user/landingPage', { user: req.session.user, products });
    })

  });


/* -------------------------------------------------------------------------- */
/*                          Login page route                                  */
/* -------------------------------------------------------------------------- */
router.route('/login')
  .get(clearCache, function (req, res) {
    if (req.session.userLoggedIn) {
      res.redirect('/');
    } else
      res.render('user/login', { loginErr: req.session.loginErr, blockErr: req.session.blockedErr });
    req.session.loginErr = null;
    req.session.blockedErr = null;
  })
  .post(function (req, res) {
    // console.log(req.body);
    doLogin(req.body).then((response) => {
      if (response.status) {
        req.session.user = response.user
        req.session.userLoggedIn = true
        res.redirect('/')
      } else {
        req.session.loginErr = "Invalid credentials!!!"
        res.redirect('/login')
      }
    })
  });


/* -------------------------------------------------------------------------- */
/*                         Signup page route                                  */
/* -------------------------------------------------------------------------- */
router.route('/signup')
  .get(clearCache, function (req, res) {
    res.render('user/signup', { emailErr: req.session.emailErr });
    req.session.emailErr = null;
  })
  .post(function (req, res) {
    doSignup(req.body).then(() => {
      res.redirect('/login');
    }).catch((err) => {
      req.session.emailErr = err.status
      res.redirect('/signup')
    })
  })


/* -------------------------------------------------------------------------- */
/*                             View product details                           */
/* -------------------------------------------------------------------------- */
router.route('/view-product/:id')
  .get(clearCache,function (req, res) {
    productHelper.getProductDetails(req.params.id).then((product) => {
      console.log(product);
      res.render('user/viewProduct', { user: req.session.user, product })
    })

  });


/* -------------------------------------------------------------------------- */
/*                              Logout route                                  */
/* -------------------------------------------------------------------------- */
router.get('/logout', (req, res) => {
  req.session.user = false;
  req.session.userLoggedIn = false;
  res.redirect('/')
})


/* -------------------------------------------------------------------------- */
/*                               OTP phone page route                         */
/* -------------------------------------------------------------------------- */

router.route('/phone-page')
  .get(function (req, res) {
    res.render('user/phonePage', { otpNumberErr: req.session.otpNumberErr });
    req.session.otpNumberErr = null;
  })
  .post((req, res) => {
    req.session.otpNumber = req.body.phone
    console.log(req.body.phone);
    let signupData;
    userHelper.doOTP(req.body).then((response) => {
      if (response.status) {
        signupData = response.user
        res.redirect('/otp-page')
      }
      else {
        req.session.otpNumberErr = "Oops, Number not found!! Check the number or Register your number and try again."
        res.redirect('/phone-page')
      }
    })
  })


/* -------------------------------------------------------------------------- */
/*                                    OTP routes                              */
/* -------------------------------------------------------------------------- */
router.route('/otp-page')
  .get(function (req, res) {
    res.render('user/enterOtp', { otpErr: req.session.otpErr })
  })
  .post((req, res) => {
    let number = req.session.otpNumber
    // console.log(number + 'success');
    userHelper.doOTPconfirm(req.body, number).then((response) => {
      if (response.status) {
        userHelper.getUser(number).then((user) => {
          console.log(user);
          if (!user.blocked) {
            req.session.loggedIn = true;
            req.session.user = user;

            res.redirect('/')
          } else {
            req.session.blockedErr = "You can't access this site at this moment"
            res.redirect('/login')
          }
        })
      }
      else {
        req.session.otpErr = "OTP incorrect!!!"
        res.redirect('/otp-page')
      }
    })
  })

/* -------------------------------------------------------------------------- */
/*                                    Cart route                              */
/* -------------------------------------------------------------------------- */
router.route('/cart')
  .get(verifyLogin, function (req, res) {
    res.render('user/cart', { user: req.session.user })
  })



module.exports = router;
