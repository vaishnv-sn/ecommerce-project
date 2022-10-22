var db = require('../config/connection')
const { USER_COLLECTION } = require('../config/collections');
var objectId = require('mongodb').ObjectId

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
  }

}