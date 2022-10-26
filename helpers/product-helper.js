var db = require('../config/connection')
const { PRODUCT_COLLECTION } = require('../config/collections');
var objectId = require('mongodb').ObjectId

module.exports = {

    addProduct: (product, callback) => {
        db.get().collection(PRODUCT_COLLECTION).insertOne(product).then((data) => {
            // console.log(data.insertedId);
            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION).deleteOne({ _id: objectId(prodId) }).then((response) => {
                console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails: (prodId) => {
        return new Promise(async (resolve, reject) => {
            product = await db.get().collection(PRODUCT_COLLECTION).findOne({ _id: objectId(prodId) })
            resolve(product)
        })
    },
    updateProduct:(prodId,productDetails)=>{
        console.log(productDetails);
        // console.log(image);
        return new Promise((resolve, reject)=>{
          db.get().collection(PRODUCT_COLLECTION)
          .updateOne({_id:objectId(prodId)},{
            $set:{
              pro_title:productDetails.pro_title,
              pro_description:productDetails.pro_description,
              pro_price:productDetails.pro_price,
              pro_stock:productDetails.pro_stock,
              pro_category:productDetails.pro_category,
              pro_gender:productDetails.pro_gender
            }
          }).then((renponse)=>{
            resolve()
          })
        })
      }


}