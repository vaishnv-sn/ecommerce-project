var db = require('../config/connection')
const { USER_COLLECTION, ADMIN_COLLECTION, ORDER_COLLECTION, COUPON_COLLECTION, BANNER_COLLECTION, PRODUCT_COLLECTION } = require('../config/collections');
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
      resolve(orders.reverse())
    })
  },
  cancelOrder: (orderId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(ORDER_COLLECTION).findOneAndUpdate(
        {
          _id: objectId(orderId)
        },
        {
          $set: {
            status: 'Cancelled',
            cancelled: true
          }
        }
      ).then((data) => {
        if (data.value.paymentMethod != "COD") {
          data = data.value
          let amount = data.totalAmount
          db.get().collection(USER_COLLECTION).updateOne(
            {
              _id: objectId(data.userId)
            },
            {
              $inc: {
                wallet: amount
              },
              $push: {
                walletHistory: {
                  date: data.date,
                  message: "Order cancelled, Refund Initialized",
                  amount: amount,
                  orderId: orderId
                }
              }
            }
          ).then(() => {
            resolve()
          })
        } else {
          resolve()
        }
      })
    })
  },
  editBanners: (banners) => {
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
      ).then(() => {
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
  },
  changeOrderStatus: (orderId, orderStatus) => {
    console.log(orderStatus);
    return new Promise(async (resolve, reject) => {
      if (orderStatus === 'Delivered') {
        await db.get().collection(ORDER_COLLECTION).updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: orderStatus,
              delivered: true
            }
          }
        ).then(() => {
          resolve({ status: 'Changed successfully!!' })
        }).catch((err) => {
          console.log(err);
          reject({ status: 'Something went wrong!!' })
        })
      } else {
        await db.get().collection(ORDER_COLLECTION).updateOne(
          { _id: objectId(orderId) },
          {
            $set: {
              status: orderStatus,
              delivered: false
            }
          }
        ).then(() => {
          resolve({ status: 'Changed successfully!!' })
        }).catch((err) => {
          console.log(err);
          reject({ status: 'Something went wrong!!' })
        })
      }
    })
  },

  allUsersCount: () => {
    return new Promise(async (resolve, reject) => {
      let totalUsers = await db.get().collection(USER_COLLECTION).count();
      let blockedUsers = await db.get().collection(USER_COLLECTION).count({ blocked: true });
      let activeUsers = await db.get().collection(USER_COLLECTION).count({ blocked: false });

      let userCounts = {
        totalUsers: totalUsers,
        blockedUsers: blockedUsers,
        activeUsers: activeUsers
      }

      resolve(userCounts)

    })
  },
  orderStatusCount: () => {
    return new Promise(async (resolve, reject) => {
      let totalPlacedOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Placed" })
      let totalShippedOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Shipped" })
      let totalCancelledOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Cancelled" })
      let totalDeliveredOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Delivered" })
      let totalOrders = totalCancelledOrders + totalPlacedOrders + totalShippedOrders + totalDeliveredOrders

      let orderStatusCount = {
        totalPlacedOrders: totalPlacedOrders,
        totalShippedOrders: totalShippedOrders,
        totalCancelledOrders: totalCancelledOrders,
        totalDeliveredOrders: totalDeliveredOrders,
        totalOrders: totalOrders
      }

      resolve(orderStatusCount)
    })
  },
  getOrderDetails: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(ORDER_COLLECTION).findOne({ _id: objectId(orderId) }).then((data) => {
        resolve(data)
      })
    })
  },
  getOrderedProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(ORDER_COLLECTION).aggregate([
        {
          $match: { _id: objectId(orderId) }
        },
        {
          $unwind: '$products'
        },
        {

          $project: {
            item: '$products.item',
            quantity: '$products.quantity',
            totalAmount: '$totalAmount'

          }
        },
        {
          $lookup: {
            from: PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            totalAmount: 1,
            paymentMethod: 1,
            status: 1,
            quantity: 1,
            deliveryDetails: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }

      ]).toArray()
      resolve(products)
    })
  },
  fetchYearAndMonthSale: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let response = {}
        let yearSale = await db.get().collection(ORDER_COLLECTION).aggregate([
          {
            $match: { status: "Delivered" }
          },
          {
            $group:
              { _id: { year: { $year: { $toDate: "$date" } } }, total: { $sum: '$totalAmount' } }
          },
          {
            $sort: { "_id.year": -1 }
          }
        ]).toArray()
        if (yearSale[0]) {
          response.yearSale = yearSale[0].total
        }

        let monthSale = await db.get().collection(ORDER_COLLECTION).aggregate([
          {
            $match: { status: "Delivered" }
          },
          {
            $group: { _id: { month: { $month: { $toDate: "$date" } } }, total: { $sum: '$totalAmount' } }
          },
          {
            $sort: { "_id.month": -1 }
          }
        ]).toArray()
        if (monthSale[0]) {
          response.monthSale = monthSale[0].total
        }
        resolve(response)
      } catch (e) {
        console.log(e);
        resolve({ status: false })
      }
    })
  },
  allCount: () => {
    return new Promise(async (resolve, reject) => {
      let totalPlacedOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Placed" });
      let totalShippedOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Shipped" });
      let totalCancelledOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Cancelled" });
      let totalDeliveredOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Delivered" });
      let totalReturnedOrders = await db.get().collection(ORDER_COLLECTION).count({ status: "Returned" });
      let totalOrders = totalCancelledOrders + totalPlacedOrders + totalShippedOrders + totalDeliveredOrders + totalReturnedOrders

      let orderStatusCount = {
        totalPlacedOrders: totalPlacedOrders,
        totalShippedOrders: totalShippedOrders,
        totalCancelledOrders: totalCancelledOrders,
        totalDeliveredOrders: totalDeliveredOrders,
        totalReturnedOrders: totalReturnedOrders,
        totalOrders: totalOrders
      }

      resolve(orderStatusCount)
    })
  },
  fetchSales: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let sale = await db.get().collection(ORDER_COLLECTION).aggregate([
          {
            $match: { status: "Delivered" }
          },
          {
            $group:
              { _id: { month: { $month: { $toDate: "$date" } } }, total: { $sum: '$totalAmount' } }
          },
          {
            $sort: { "_id.month": 1 }
          },
          {
            $project: { _id: 0, total: 1 }
          }
        ]).toArray()
        if (sale) {
          resolve(sale)
        } else {
          resolve({ status: true })
        }
      } catch (e) {
        console.log(e);
        resolve({ status: false })
      }
    })
  },
  getUserCount: () => {
    return new Promise(async (resolve, reject) => {
      db.get().collection(USER_COLLECTION).countDocuments().then((data) => {
        resolve(data);
      })
    })
  },
  fetchMonth: () => {
    return new Promise(async (resolve, reject) => {
      try {
        let monthNumber = await db.get().collection(ORDER_COLLECTION).aggregate([
          {
            $match: { status: "Delivered" }
          },
          {
            $group:
              { _id: { month: { $month: { $toDate: "$date" } } } }
          },
          {
            $sort: { "_id.month": 1 }
          },
          {
            $project: { _id: 0, month: '$_id.month' }
          }
        ]).toArray()
        monthNumber.forEach(element => {
          function toMonthName(monthNumber) {
            const date = new Date();
            date.setMonth(monthNumber - 1);
            return date.toLocaleString('en-US', {
              month: 'long',
            });
          }
          element.month = toMonthName(element.month)
        });
        resolve(monthNumber)
      } catch (e) {
        console.log(e);
        resolve({ status: false })
      }
    })
  },
  getOrderCount: () => {
    return new Promise((resolve, reject) => {
      db.get().collection(ORDER_COLLECTION).countDocuments().then((data) => {
        resolve(data)
      })
    })
  },
  getCustomOrdersList: () => {
    return new Promise((resolve, reject) => {
      db.get().collection(ORDER_COLLECTION).find({ status: 'Delivered' }).toArray().then((order) => {
        resolve(order.reverse())
      })
    })
  },
  getCoupons: () => {
    return new Promise((resolve, reject) => {
      db.get().collection(COUPON_COLLECTION).find().toArray().then((data) => {
        resolve(data)
      })
    })
  },
  addCoupons: (couponDetails) => {
    return new Promise((resolve, reject) => {
      db.get().collection(COUPON_COLLECTION).insertOne(couponDetails).then((data) => {
        console.log(data);
        resolve()
      })
    })
  },
  removeCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(COUPON_COLLECTION).deleteOne({ _id: objectId(couponId) }).then(() => {
        resolve()
      })
    })
  }

}