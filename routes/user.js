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
  .get(async function (req, res) {
    let cartCount = null
    let wishlistCount = null
    if (req.session.user) {
      cartCount = await userHelper.getCartCount(req.session.user._id)
      wishlistCount = await userHelper.getWishlistCount(req.session.user._id)
    }
    let banners = await userHelper.getBanners()
    console.log(banners);
    productHelper.getAllProducts().then((products) => {
      res.render('user/landingPage', { user: req.session.user, products, cartCount, banners, wishlistCount });
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
  .get(clearCache, function (req, res) {
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
    console.log(req.body);
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
    req.session.otpErr = null;
  })
  .post((req, res) => {
    let number = req.session.otpNumber
    // console.log(number + 'success');
    console.log(req.body);
    userHelper.doOTPconfirm(req.body, number).then((response) => {
      if (response.status) {
        userHelper.getUser(number).then((user) => {
          console.log(user);
          if (!user.blocked) {
            req.session.user = user;
            req.session.userLoggedIn = true;
            console.log(req.session.user);
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
  .get(verifyLogin, async function (req, res) {
    let cartProducts = await userHelper.getCartProducts(req.session.user._id);
    let cartTotal = await userHelper.getTotalCartAmount(req.session.user._id);
    let single = cartProducts.map((item) => {
      return item.quantity * item.product.pro_price
    })
    console.log(single);
    res.render('user/cart', { user: req.session.user, cartProducts, cartTotal, single });
  })

router.route('/add-to-cart/:id')
  .get(verifyLogin, (req, res) => {
    userHelper.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    });
  });

router.route('/change-product-quantity')
  .post(verifyLogin, (req, res) => {
    console.log(req.body);
    userHelper.changeProductQuantity(req.body).then(async (response) => {
      // response.cartTotal = await userHelper.getTotalCartAmount(req.body.user);
      res.json(response)
    })
  })

router.route('/place-order')
  .get(verifyLogin, async (req, res) => {
    let cartTotal = await userHelper.getTotalCartAmount(req.session.user._id);
    res.render('user/place-order', { user: req.session.user, cartTotal })
  })
  .post(verifyLogin, async (req, res) => {
    let products = await userHelper.getCartProductList(req.body.userId);
    let total = await userHelper.getTotalCartAmount(req.body.userId);
    userHelper.placeOrder(req.body, products, total).then((orderId) => {
      if (req.body['paymentMethod'] === 'COD') {
        res.json({ codSuccess: true });
      } else {
        userHelper.generateRazorpay(orderId, total).then((response) => {
          res.json({ response })
        })
      }
    })
  })

router.route('/verify-payment')
  .post(verifyLogin, (req, res) => {
    console.log(req.body);
    userHelper.verifyPayment(req.body).then(() => {
      userHelper.changePaymentStatus(req.body['order[response][receipt]']).then(() => {
        res.json({ status: true })
      }).catch((err) => {
        console.log(err);
        res.json({ status: false })
      })

    }).catch((err) => {
      console.log(err + 'error is here');
    })
  })

router.route('/remove-cartItem')
  .post(verifyLogin, (req, res) => {
    // console.log(req.body);
    userHelper.removeCartItem(req.body.cartId, req.body.prodId).then((response) => {
      console.log(response);
      res.json(true);
    })
  })

router.route('/orders')
  .get(verifyLogin, async (req, res) => {
    await userHelper.getUserOrders(req.session.user._id).then(async (orders) => {
      res.render('user/order', { user: req.session.user, orders })
    })
  })

router.route('/order-details')
  .get(verifyLogin, async (req, res) => {
    await userHelper.getOrderedProducts().then((products) => {
      res.render('user/orderDetails', { user: req.session.user, products })
    })
  })

router.route('/order-placed')
  .get(verifyLogin, (req, res) => {
    res.render('user/orderPlaced', { user: req.session.user })
  })

router.route('/cancel-order')
  .post(verifyLogin, (req, res) => {
    // console.log(req.body);
    userHelper.cancelOrder(req.body.orderId).then(() => {
      res.json({ status: true })
    })
  })

router.route('/wishlist')
  .get(verifyLogin, async (req, res) => {
    let wishlist = await userHelper.getWishlistProducts(req.session.user._id)
    console.log(wishlist);
    res.render('user/wishlist', { user: req.session.user, wishlist })
  })

router.route('/add-to-wishlist/:id')
  .get(verifyLogin, (req, res) => {
    userHelper.addToWishlist(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    })
  })

router.route('/remove-from-wishlist/:id')
  .get(verifyLogin, (req, res) => {
    console.log('hitted');
    userHelper.removeFromWishlist(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    })
  })

router.route('/profile')
  .get(verifyLogin, (req, res) => {
    res.render('user/profile', { user: req.session.user })
  })




router.route('/sample')
  .get((req, res) => {
    res.render('admin/sample')
  })


module.exports = router;
