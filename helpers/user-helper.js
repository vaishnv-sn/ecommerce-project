var db = require('../config/connection')
const { USER_COLLECTION, CART_COLLECTION, PRODUCT_COLLECTION } = require('../config/collections');
const bcrypt = require('bcrypt');
var objectId = require('mongodb').ObjectId
const otp = require('../config/otp')
const client = require('twilio')(otp.accountSID, otp.authToken)


module.exports = {

  /* -------------------------------------------------------------------------- */
  /*                                    Signup                                  */
  /* -------------------------------------------------------------------------- */

  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userData.number })
      if (user) {
        reject({ status: "User already exists" })
        // console.log("User exists!");
      } else {
        userData.password = await bcrypt.hash(userData.password, 10)
        db.get().collection(USER_COLLECTION).insertOne(userData)
        resolve()
      }
    })
  },

  /* -------------------------------------------------------------------------- */
  /*                                     Login                                  */
  /* -------------------------------------------------------------------------- */

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {}
      let user = await db.get().collection(USER_COLLECTION).findOne({ email: userData.email })
      if (user) {
        if (!user.blocked) {
          bcrypt.compare(userData.password, user.password).then((status) => {
            if (status) {
              // console.log("login successful");
              response.user = user
              response.status = true
              resolve(response)
            } else {
              // console.log("login failed");
              resolve({ status: false })
            }
          })
        } else {
          // console.log("Login failed");
          resolve({ status: false })
        }
      } else {
        resolve({ status: false })
      }

    })
  },

  /* -------------------------------------------------------------------------- */
  /*                               Send OTP                                     */
  /* -------------------------------------------------------------------------- */

  doOTP: (userData) => {

    let response = {}
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userData.phone })
      // console.log(user);
      // console.log(otp.accountSID, otp.authToken, otp.serviceID);
      if (user) {
        response.status = true
        response.user = user
        client.verify.v2
          .services(otp.serviceID)
          .verifications.create({ to: `+91${userData.phone}`, channel: 'sms' })
          .then((verification) => {
            console.log(verification.status);
          });
        // console.log(response);
        resolve(response)

      }
      else {
        response.status = false;
        resolve(response)

      }
    })
  },


  /* -------------------------------------------------------------------------- */
  /*                               Confirm OTP                                  */
  /* -------------------------------------------------------------------------- */

  doOTPconfirm: (OTP, number) => {

    return new Promise((resolve, reject) => {

      client.verify.v2
        .services(otp.serviceID)
        .verificationChecks.create({ to: `+91${number}`, code: OTP.otp })
        .then((data) => {
          // console.log(data);
          if (data.status == 'approved') {
            // response.user = user;
            // response.user.status = true
            // response.status = true;
            resolve({ status: true })
          }
          else {
            resolve({ status: false })
          }

        })

    })

  },

  getUser: (userNumber) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userNumber })
      resolve(user)
    })
  },

  addToCart: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(CART_COLLECTION).findOne({ user: objectId(userId) });
      if (userCart) {
        db.get().collection(CART_COLLECTION)
          .updateOne({ user: objectId(userId) },
            {
              $push: { products: objectId(prodId) }
            })
        resolve()
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [objectId(prodId)]
        }
        db.get().collection(CART_COLLECTION).insertOne(cartObj)
        resolve()
      }
    })
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db.get().collection(CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $lookup: {
            from: PRODUCT_COLLECTION,
            let: {
              prodList: '$products'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', '$$prodList']
                  }
                }
              },
            ],
            as: 'cartItems'
          }
        }
      ]).toArray()
      resolve(cartItems[0].cartItems)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db.get().collection(CART_COLLECTION).findOne({ user: objectId(userId) });
      // console.log(cart);
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  }
}
