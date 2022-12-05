let db = require('../config/connection')
let { ORDER_COLLECTION } = require('../config/collections')
let objectId = require('mongodb').ObjectId


module.exports = {
    donutChartData: () => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(ORDER_COLLECTION).aggregate([
                {
                    $group: {
                        _id: '$paymentMethod',
                        count: {
                            $sum: 1
                        }
                    }
                }
            ]).toArray()
            resolve(order)
        })
    }
}