var db = require('../config/connection')
const { USER_COLLECTION} = require('../config/collections');
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
          let user = await db.get().collection(USER_COLLECTION).findOne({ email: userData.email })
          if (user) {
            reject({ status: "User already exists" })
            console.log("User exists!");
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
            bcrypt.compare(userData.password, user.password).then((status) => {
              if (status) {
                // console.log("login successful");
                response.user=user
                response.status =true
                resolve(response)
              } else {
                // console.log("login failed");
                resolve({status:false})
              }
            })
          } else {
            console.log("Login failed");
            resolve({status:false})
          }
        })
    },

    /* -------------------------------------------------------------------------- */
    /*                                   GET OTP                                  */
    /* -------------------------------------------------------------------------- */

    getOtp : (req, res) => {
      res.render('user/otp')
    },

    /* -------------------------------------------------------------------------- */
    /*                                get Confirm OTP                             */
    /* -------------------------------------------------------------------------- */

    confirmOtp : (req, res) => {
      res.render('user/confirmotp')
    },

    /* -------------------------------------------------------------------------- */
    /*                                  Post OTP                                  */
    /* -------------------------------------------------------------------------- */

    // let signupData
    postOtp : (req, res) => {
      userhelper.doOTP(req.body).then((response) => {
          if (response.status) {
              signupData = response.user
              res.redirect('/confirmotp')
          }
          else {
              res.redirect('/otp')
          }
      })
    },


    /* -------------------------------------------------------------------------- */
    /*                                 Resend Otp                                 */
    /* -------------------------------------------------------------------------- */

    postresendOtp : (req, res) => {
      userhelper.doOTP(req.body).then((response) => {
          if (response.status) {
              signupData = response.user
              res.redirect('/confirmotp')
          }
          else {
              res.redirect('/otp')
          }
      })
    },


    /* -------------------------------------------------------------------------- */
    /*                              POST Confirm OTP                              */
    /* -------------------------------------------------------------------------- */

    postconfirmOtp : (req, res) => {
      userhelper.doOTPconfirm(req.body, signupData).then((response) => {
          if (response.status) {
              req.session.loggedIn = true;
              req.session.user = signupData

              res.redirect('/')
          }
          else {
              res.redirect('/confirmotp',)
          }
      })
    }

}