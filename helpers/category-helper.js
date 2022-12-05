var db = require('../config/connection')
var { CATEGORY_COLLECTION } = require('../config/collections')
var objectId = require('mongodb').ObjectId


module.exports = {

    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            let categories = await db.get().collection(CATEGORY_COLLECTION).find({}).toArray()
            resolve(categories)
        })
    },
    addCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            console.log(category);
            let categoryExist = db.get().collection(CATEGORY_COLLECTION).findOne({ category: category.category })
            if (categoryExist) {
                reject({ status: 'Category already Exist!!' })
            } else {
                db.get().collection(CATEGORY_COLLECTION).insertOne(category).then(() => {
                    resolve()
                })
            }
        })
    },
    deleteCategory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(CATEGORY_COLLECTION).deleteOne({ _id: objectId(catId) }).then((response) => {
                console.log(response);
                resolve()
            })
        })
    }


}