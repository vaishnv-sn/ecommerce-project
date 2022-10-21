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

  blockUser: () => {

  },

  unblockUser: () => {

  }

}