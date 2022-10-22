var db = require('../config/connection')
const { USER_COLLECTION, ADMIN_COLLECTION } = require('../config/collections');
var objectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt');


module.exports = {

  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db.get().collection(USER_COLLECTION).find().toArray()
      resolve(users)
    })
  },

  blockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
        $set: {
          blocked: true
        }
      })
      resolve()
    })
  },

  unblockUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
        $set: {
          blocked: false
        }
      })
      resolve()
    })
  },
  adminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let response = {}
      let admin = await db.get().collection(ADMIN_COLLECTION).findOne({ email: adminData.email })
      if (admin) {
        bcrypt.compare(adminData.password, admin.password).then((status) => {
          if (status) {
            console.log("login successful");
            response.admin=admin
            response.adminStatus =true
            resolve(response)
          } else {
            console.log("login failed");
            resolve({adminStatus:false})
          }
        })
      } else {
        console.log("Login failed");
        resolve({adminStatus:false})
      }
    })
  }

}