var db = require('../config/connection')
var {CATEGORY_COLLECTION} =require('../config/collections')
var objectId = require('mongodb').ObjectId


module.exports = {

    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            let categories = await db.get().collection(CATEGORY_COLLECTION).find().toArray()
            // console.log(categories);
            resolve(categories)
        })
    },
    addCategory: (category) => {
        return new Promise(async (resolve, reject)=>{
            db.get().collection(CATEGORY_COLLECTION).insertOne(category)
            resolve()
        })
    },
    deleteCategory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(CATEGORY_COLLECTION).deleteOne({ _id: objectId(catId) }).then((response) => {
                // console.log(response);
                resolve()
            })
        })
    }
        
        
}