var db = require('../config/connection')
const { USER_COLLECTION, ADMIN_COLLECTION, ORDER_COLLECTION, BANNER_COLLECTION } = require('../config/collections');
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
            response.admin = admin
            response.adminStatus = true
            resolve(response)
          } else {
            console.log("login failed");
            resolve({ adminStatus: false })
          }
        })
      } else {
        console.log("Login failed");
        resolve({ adminStatus: false })
      }
    })
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(ORDER_COLLECTION).find().toArray()
      resolve(orders)
    })
  },
  cancelOrder: (orderId) => {
    console.log(orderId);
    return new Promise(async (resolve, reject) => {
      await db.get().collection(ORDER_COLLECTION).updateOne(
        {
          _id: objectId(orderId)
        },
        {
          $set: {
            status: 'Cancelled'
          }
        }
      ).then((data) => {
        console.log(data);
        resolve()
      })
    })
  },
  editBanners: (banners) => {
    console.log(banners);
    return new Promise(async (resolve, reject) => {
      await db.get().collection(BANNER_COLLECTION).updateOne(
        {

        },
        {
          $set: {
            banner1: banners.banner1,
            banner2: banners.banner2,
            banner3: banners.banner3
          }

        }
      ).then((data) => {
        // console.log(data);
        resolve()
      })
    })
  },
  editBanner1: () => {

  },
  editBanner2: () => {

  },
  getBanners: () => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(BANNER_COLLECTION).findOne({}).then((data) => {
        resolve(data)
      })
    })
  }

}