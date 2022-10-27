var db = require('../config/connection')
const { USER_COLLECTION } = require('../config/collections');
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
      console.log(user);
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

  doOTPconfirm: (OTP,number) => {

    return new Promise((resolve, reject) => {

      client.verify.v2
        .services(otp.serviceID)
        .verificationChecks.create({to: `+91${number}`,code: OTP.otp})
        .then((data) => {
          console.log(data);
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
  getUser: (userNumber)=>{
    return new Promise(async (resolve, reject)=>{
      let user = await db.get().collection(USER_COLLECTION).findOne({number:userNumber})
      resolve(user)
    })
  }

}