var db = require('../config/connection')
const { PRODUCT_COLLECTION } = require('../config/collections');
var objectId = require('mongodb').ObjectId

module.exports = {

    addProduct: (product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION).insertOne(product).then((data) => {
                resolve(data)
            })
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
    updateProduct: (prodId, productDetails) => {
        // console.log(productDetails);
        // console.log(image);
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(prodId) }, {
                    $set: {
                        pro_title: productDetails.pro_title,
                        pro_description: productDetails.pro_description,
                        pro_offerPrice: productDetails.pro_offerPrice,
                        pro_price: productDetails.pro_price,
                        pro_stock: productDetails.pro_stock,
                        pro_category: productDetails.pro_category,
                        pro_gender: productDetails.pro_gender
                    }
                }).then((renponse) => {
                    resolve()
                })
        })
    },
    editImages: (prodId, fileName1, fileName2) => {
        console.log(fileName1);
        console.log(prodId);
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION).updateOne(
                {
                    _id: objectId(prodId)
                },
                {
                    $set: {
                        'image1': fileName1,
                        'image2': fileName2
                    }
                }
            ).then((data) => {
                console.log(data);
                resolve()
            })
        })
    },
    editImage1: (prodId, fileName1) => {
        console.log(fileName1);
        console.log(prodId);
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION).updateOne(
                {
                    _id: objectId(prodId)
                },
                {
                    $set: {
                        'image1': fileName1
                    }
                }
            ).then((data) => {
                console.log(data);
                resolve()
            })
        })
    },
    editImage2: (prodId, fileName2) => {
        console.log(fileName2);
        console.log(prodId);
        return new Promise((resolve, reject) => {
            db.get().collection(PRODUCT_COLLECTION).updateOne(
                {
                    _id: objectId(prodId)
                },
                {
                    $set: {
                        'image2': fileName2
                    }
                }
            ).then((data) => {
                console.log(data);
                resolve()
            })
        })
    }


}