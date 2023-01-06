var express = require('express');
const { doSignup, doLogin } = require('../helpers/user-helper');
const productHelper = require('../helpers/product-helper');
const userHelper = require('../helpers/user-helper');
const { response } = require('express');
var router = express.Router();
const { verifyLogin } = require("../Middlewares/routeProtection");

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
    let categories = await userHelper.getCategories()
    let banners = await userHelper.getBanners()
    productHelper.getAllProducts().then((products) => {
      res.render('user/landingPage', { user: req.session.user, products, cartCount, banners, wishlistCount, categories });
    })

  });


/* -------------------------------------------------------------------------- */
/*                          Login page route                                  */
/* -------------------------------------------------------------------------- */
router.route('/login')
  .get(function (req, res) {
    if (req.session.userLoggedIn) {
      res.redirect('/');
    } else
      res.render('user/login', {
        loginErr: req.session.loginErr,
        blockErr: req.session.blockedErr,
        signupMsg: req.session.signupSuccess,
        passwordChangeSuccess: req.session.changePasswordSuccess
      });
    req.session.loginErr = null;
    req.session.blockedErr = null;
    req.session.signupSuccess = null;
    req.session.changePasswordSuccess = null;
  })
  .post(function (req, res) {
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
  .get(function (req, res) {
    res.render('user/signup');
    req.session.emailErr = null;
  })
  .post(function (req, res) {
    doSignup(req.body).then((status) => {
      req.session.signupSuccess = status.status
      res.redirect('/login');
    })
  })


/* -------------------------------------------------------------------------- */
/*                             View product details                           */
/* -------------------------------------------------------------------------- */
router.route('/view-product/:id')
  .get(function (req, res) {
    productHelper.getProductDetails(req.params.id).then((product) => {
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
    userHelper.doOTPconfirm(req.body, number).then((response) => {
      if (response.status) {
        userHelper.getUser(number).then((user) => {
          if (!user.blocked) {
            req.session.user = user;
            req.session.userLoggedIn = true;
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
    userHelper.changeProductQuantity(req.body).then(async (response) => {
      res.json(response)
    })
  })

router.route('/place-order')
  .get(verifyLogin, async (req, res) => {
    let cartTotal = await userHelper.getTotalCartAmount(req.session.user._id);
    let coupon = req.session.coupon
    let couponErr = req.session.couponErr
    let status
    if (coupon) {
      let minAmount = coupon.minAmount
      let maxDiscount = coupon.maxDiscount
      let discountPercentage = coupon.discountPercentage
      if (cartTotal >= minAmount) {
        let discount = cartTotal * (discountPercentage / 100)
        discount = Math.round(discount)
        if (discount > maxDiscount) {
          discount = maxDiscount
          status = 'Maximum discound ' + discount + ' applied!!'
          cartTotal = cartTotal - discount
        } else {
          status = 'Discounted amount' + discount + '!!'
          cartTotal = cartTotal - discount
        }
      } else {
        status = 'Purchase for minimum' + minAmount + 'to use this coupon!!'
      }
    }
    req.session.newTotal = cartTotal;
    req.session.couponStatus = status;
    let addresses = await userHelper.getUserAddresses(req.session.user._id);
    let walletErr = req.session.walletErr;
    res.render('user/selectAddress', { user: req.session.user, cartTotal, addresses, walletErr, couponErr, status })
    req.session.walletErr = null;
    req.session.coupon = null;
    req.session.couponErr = null;
    status = null;
  })
  .post(verifyLogin, async (req, res) => {
    let products = await userHelper.getCartProductList(req.session.user._id);
    let total
    let status
    if (req.session.newTotal) {
      total = req.session.newTotal
      status = req.session.couponStatus
    } else {
      total = await userHelper.getTotalCartAmount(req.session.user._id);
    }
    let walletAmt = await userHelper.getWalletAmount(req.session.user._id);
    if (req.body.paymentMethod === 'wallet') {
      if (walletAmt > total) {
        userHelper.placeWalletOrder(req.body, req.session.user._id, products, total, status).then(() => {
          res.json({ walletSuccess: true })
        })
      } else {
        req.session.walletErr = "Insufficient balance in wallet, Try another payment method"
        res.json({ walletErr: true })
      }
    } else {
      userHelper.placeOrder(req.body, req.session.user._id, products, total, status).then((orderId) => {
        if (req.body.paymentMethod === 'COD') {
          res.json({ codSuccess: true });
        } else {
          userHelper.generateRazorpay(orderId, total).then((response) => {
            res.json({ response });
          })
        }
      })
    }
    req.session.newTotal = null;
    req.session.couponStatus = null;
  })

router.route('/verify-payment')
  .post(verifyLogin, (req, res) => {
    userHelper.verifyPayment(req.body).then(() => {
      userHelper.changePaymentStatus(req.body['order[response][receipt]'], req.session.user._id).then(() => {
        res.json({ status: true })
      }).catch((err) => {
        console.log(err);
        res.json({ status: false })
      })
    }).catch((err) => {
      console.log(err + 'error is here');
    })
  })

router.route('/apply-coupon')
  .post(async (req, res) => {
    let coupon = req.body.couponName
    userHelper.applyCoupon(coupon).then((status) => {
      req.session.coupon = status
      res.json({ resp: true })
    }).catch((status) => {
      req.session.couponErr = status.err
      res.json({ resp: false })
    })
  })

router.route('/remove-cartItem')
  .post(verifyLogin, (req, res) => {
    userHelper.removeCartItem(req.body.cartId, req.body.prodId).then((response) => {
      res.json(true);
    })
  })

router.route('/orders')
  .get(verifyLogin, async (req, res) => {
    await userHelper.getUserOrders(req.session.user._id).then(async (orders) => {
      res.render('user/order', { user: req.session.user, orders })
    })
  })

router.route('/order-details/:id')
  .get(verifyLogin, async (req, res) => {
    let order = await userHelper.getOrder(req.params.id)
    userHelper.getOrderedProducts(req.params.id).then((orderDetails) => {
      console.log(orderDetails);
      res.render('user/orderDetails', { user: req.session.user, orderDetails, order })
    })
  })

router.route('/order-placed')
  .get(verifyLogin, (req, res) => {
    res.render('user/orderPlaced', { user: req.session.user })
  })

router.route('/cancel-order')
  .post(verifyLogin, (req, res) => {
    userHelper.cancelOrder(req.body.orderId).then(() => {
      res.json({ status: true })
    })
  })

router.route('/wishlist')
  .get(verifyLogin, async (req, res) => {
    let wishlist = await userHelper.getWishlistProducts(req.session.user._id)
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
    userHelper.removeFromWishlist(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    })
  })

router.route('/profile')
  .get(verifyLogin, async (req, res) => {
    let userData = await userHelper.getUserInfo(req.session.user._id);
    let walletAmt = await userHelper.getWalletAmount(req.session.user._id);
    res.render('user/profile', {
      user: req.session.user,
      userData,
      walletAmt,
      passwordResetFailed: req.session.changePasswordError
    });
    req.session.changePasswordError = null;
  })
  .post(verifyLogin, (req, res) => {
    userHelper.updateUser(req.session.user._id, req.body).then(() => {
      res.redirect('/profile')
    })
  })

router.route('/change-password')
  .post(verifyLogin, (req, res) => {
    userHelper.changePassword(req.body, req.session.user._id).then((response) => {
      req.session.changePasswordSuccess = response.successMessage;
      req.session.user = false;
      req.session.userLoggedIn = false;
      res.redirect('/login')
    }).catch((response) => {
      req.session.changePasswordError = response.errMessage;
      res.redirect('/profile');
    })
  })

router.route('/address-form')
  .get(verifyLogin, async (req, res) => {
    res.render('user/addNewAddress', { user: req.session.user })
  })
  .post(verifyLogin, (req, res) => {
    userHelper.saveAddressInUser(req.body).then((response) => {
      res.redirect('/place-order')
    })
  })

router.route('/remove-address')
  .post(verifyLogin, (req, res) => {
    userHelper.removeAddress(req.session.user._id, req.body).then(() => {
      res.json({ status: true })
    })
  })

router.route('/wallet-history')
  .get(verifyLogin, (req, res) => {
    userHelper.getWalletHistory(req.session.user._id).then((walletHistory) => {
      res.render('user/walletHistory', { user: req.session.user, walletHistory })
    })
  })

router.route('/get-category-products/:id')
  .get(async (req, res) => {
    let categories = await userHelper.getCategories()
    userHelper.getCategoryProducts(req.params.id).then((categoryProducts) => {
      res.render('user/categoryProducts', { user: req.session.user, categoryProducts, categories })
    })
  })

router.route('/email-check')
  .post((req, res) => {
    userHelper.emailCheck(req.body.email).then(() => {
      res.json({ status: true })
    }).catch(() => {
      res.json({ status: false })
    })
  })

router.route('/phone-check')
  .post((req, res) => {
    userHelper.phoneCheck(req.body.phone).then(() => {
      res.json({ status: true })
    }).catch(() => {
      res.json({ status: false })
    })
  })

router.route('/return-order/:id')
  .get(verifyLogin, (req, res) => {
    userHelper.returnOrder(req.params.id).then(() => {
      res.redirect('/orders')
    })
  })



router.route('/sample')
  .get((req, res) => {
    res.render('admin/all-orders')
  })
  .post((req, res) => {
    console.log(req.body);
  })

module.exports = router;





