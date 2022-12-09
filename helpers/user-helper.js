var db = require('../config/connection')
const { USER_COLLECTION, CART_COLLECTION, PRODUCT_COLLECTION, ORDER_COLLECTION, BANNER_COLLECTION, WISHLIST_COLLECTION, CATEGORY_COLLECTION } = require('../config/collections');
const bcrypt = require('bcrypt');
var objectId = require('mongodb').ObjectId
const otp = require('../config/otp');
const { response } = require('express');
const client = require('twilio')(otp.accountSID, otp.authToken)
const razorpay = require('razorpay');
const { resolve } = require('path');

var instance = new razorpay({
  key_id: 'rzp_test_FhG5qtJmHWybtq',
  key_secret: 'JCorSRosrNLhJkdmREMshtJm',
});


module.exports = {

  /* -------------------------------------------------------------------------- */
  /*                                    Signup                                  */
  /* -------------------------------------------------------------------------- */

  doSignup: (userData) => {
    console.log(userData.referral);
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userData.number })

      if (user) {

        reject({ status: "User with same phone number already exists" })

      } else {

        if (userData.referral === "") {
          userData.wallet = 0;
          userData.blocked = false;
          userData.password = await bcrypt.hash(userData.password, 10)
          userData.walletHistory = []
          userData.referral = Math.floor((Math.random() * 100000000) + 12345)
          console.log(userData);
          db.get().collection(USER_COLLECTION).insertOne(userData).then(() => {
            resolve({ status: "User Created Successfully!!" })
          })

        } else {

          let referralCheck = await db.get().collection(USER_COLLECTION).findOne({ referral: parseInt(userData.referral) })
          if (referralCheck) {

            let today = new Date();
            let dd = String(today.getDate()).padStart(2, '0');
            let yyyy = today.getFullYear();
            let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
            today = dd + '/' + mm + '/' + yyyy;

            await db.get().collection(USER_COLLECTION).updateOne({ referral: parseInt(userData.referral) },
              {
                $set: {
                  wallet: referralCheck.wallet + 100
                },
                $push: {
                  walletHistory: {
                    date: today,
                    message: userData.fname + " joined with your referral code.",
                    amount: 100
                  }
                }
              }
            )
            userData.wallet = 100;
            userData.blocked = false;
            userData.password = await bcrypt.hash(userData.password, 10);
            userData.walletHistory = [
              {
                date: today,
                message: "Reward for joining with the referral code of " + referralCheck.fname,
                amount: 100
              }
            ];
            userData.referral = Math.floor((Math.random() * 100000000) + 12345);
            db.get().collection(USER_COLLECTION).insertOne(userData).then(() => {
              resolve({ status: "User Created Successfully!!" })
            })

          } else {

            userData.wallet = 0;
            userData.blocked = false;
            userData.password = await bcrypt.hash(userData.password, 10)
            userData.walletHistory = []
            userData.referral = Math.floor((Math.random() * 100000000) + 12345)
            console.log(userData);
            db.get().collection(USER_COLLECTION).insertOne(userData).then(() => {
              resolve({ status: "User Created Successfully!!" })
            })

          }
        }
      }
    })
  },

  /* -------------------------------------------------------------------------- */
  /*                                     Login                                  */
  /* -------------------------------------------------------------------------- */

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response = {}
      let user = await db.get().collection(USER_COLLECTION).findOne({ email: userData.email })
      if (user) {
        if (!user.blocked) {
          bcrypt.compare(userData.password, user.password).then((status) => {
            if (status) {
              // console.log(user);
              response.user = user
              response.status = true
              resolve(response)
            } else {
              // console.log("login failed");
              resolve({ status: false })
            }
          })
        } else {
          // console.log("Login failed");
          resolve({ status: false })
        }
      } else {
        resolve({ status: false })
      }

    })
  },

  /* -------------------------------------------------------------------------- */
  /*                               Send OTP                                     */
  /* -------------------------------------------------------------------------- */

  doOTP: (userData) => {

    let response = {}
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userData.phone })
      // console.log(user);
      // console.log(otp.accountSID, otp.authToken, otp.serviceID);
      if (user) {
        response.status = true
        response.user = user
        client.verify.v2
          .services(otp.serviceID)
          .verifications.create({ to: `+91${userData.phone}`, channel: 'sms' })
          .then((verification) => {
            // console.log(verification.status);
          });
        // console.log(response);
        resolve(response)

      }
      else {
        response.status = false;
        resolve(response)

      }
    })
  },


  /* -------------------------------------------------------------------------- */
  /*                               Confirm OTP                                  */
  /* -------------------------------------------------------------------------- */

  doOTPconfirm: (OTP, number) => {

    return new Promise((resolve, reject) => {

      client.verify.v2
        .services(otp.serviceID)
        .verificationChecks.create({ to: `+91${number}`, code: OTP.otp })
        .then((data) => {
          if (data.status == 'approved') {
            // response.user = user;
            // response.user.status = true
            // response.status = true;
            resolve({ status: true })
          }
          else {
            resolve({ status: false })
          }

        })

    })

  },

  getUser: (userNumber) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ number: userNumber })
      resolve(user)
    })
  },

  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(CART_COLLECTION).findOne({ user: objectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(product => product.item == proId)
        // console.log(proExist);
        if (proExist != -1) {
          db.get().collection(CART_COLLECTION)
            .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
              {
                $inc: { 'products.$.quantity': 1 }
              })
        } else {
          db.get().collection(CART_COLLECTION)
            .updateOne({ user: objectId(userId) },
              {
                $push: { products: proObj }

              }).then(() => {
                resolve()
              })
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj]
        }
        db.get().collection(CART_COLLECTION).insertOne(cartObj).then(() => {
          resolve()
        })
      }
    })
  },

  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db.get().collection(CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
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
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }
      ]).toArray()
      resolve(cartItems)
    })
  },

  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db.get().collection(CART_COLLECTION).findOne({ user: objectId(userId) });
      // console.log(cart);
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },

  changeProductQuantity: (details) => {
    let quantity = parseInt(details.quantity)
    let count = parseInt(details.count)

    return new Promise((resolve, reject) => {
      if (count == -1 && quantity == 1) {
        db.get().collection(CART_COLLECTION)
          .updateOne({ _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } }

            }
          ).then((response) => {

            resolve({ removeProduct: true })

          })
      } else {
        db.get().collection(CART_COLLECTION)
          .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
            {
              $inc: { 'products.$.quantity': count }
            }
          ).then((response) => {
            resolve({ status: true })
          })
      }
    })
  },

  getTotalCartAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      // let quantity = parseInt(quantity)

      let cartTotal = await db.get().collection(CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
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
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.pro_price' }] } }
          }
        }
      ]).toArray()
      if (cartTotal.length != 0) {

        resolve(cartTotal[0].total)

      } else {

        resolve(false)
      }
    })
  },

  removeCartItem: (cartId, prodId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(CART_COLLECTION)
        .updateOne({ _id: objectId(cartId) },
          {
            $pull: { products: { item: objectId(prodId) } }
          }
        ).then((response) => {
          resolve(response)
        })
    })
  },

  placeOrder: (orderDetails, userId, products, total) => {
    return new Promise(async (resolve, reject) => {

      let status = orderDetails.paymentMethod === 'COD' ? 'Placed' : 'Pending';

      let deliveryAddress = await db.get().collection(USER_COLLECTION).findOne(
        { _id: objectId(userId) },
        {
          projection: {
            _id: 0,
            address: { $elemMatch: { id: orderDetails.address } }
          }
        }
      )
      deliveryAddress = deliveryAddress.address[0]

      let today = new Date();
      let dd = String(today.getDate()).padStart(2, '0');
      let yyyy = today.getFullYear();
      let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      today = dd + '/' + mm + '/' + yyyy;

      let orderObj = {
        deliveryDetails: {
          name: deliveryAddress.name,
          mobile: deliveryAddress.contactNumber,
          address: deliveryAddress.address,
          locality: deliveryAddress.locality,
          pincode: deliveryAddress.pincode,
          date: today
        },
        userId: objectId(userId),
        products: products,
        totalAmount: total,
        paymentMethod: orderDetails.paymentMethod,
        status: status
      }

      db.get().collection(ORDER_COLLECTION).insertOne(orderObj)
        .then((data) => {
          console.log(data);
          db.get().collection(CART_COLLECTION).deleteOne({ user: objectId(userId) });
          resolve(data.insertedId);
        })
    })
  },

  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(CART_COLLECTION).findOne({ user: objectId(userId) })
      resolve(cart.products);
    })
  },

  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
      resolve(orders)
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

  cancelOrder: (orderId) => {
    // console.log(orderId);
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
      )
    }).then(() => {
      resolve()
    })
  },

  getBanners: () => {
    return new Promise(async (resolve, reject) => {
      let banners = await db.get().collection(BANNER_COLLECTION).findOne({})
      resolve(banners)
    })
  },

  addToWishlist: (prodId, userId) => {
    return new Promise(async (resolve, reject) => {
      let userWishlist = await db.get().collection(WISHLIST_COLLECTION).findOne({ user: objectId(userId) })
      if (userWishlist) {
        db.get().collection(WISHLIST_COLLECTION)
          .updateOne(
            {
              user: objectId(userId)
            },
            {
              $addToSet: {
                products: objectId(prodId)
              }
            }
          ).then((data) => {
            if (data.modifiedCount) {
              resolve()
            }
          })
      } else {
        let wishlistObj = {
          user: objectId(userId),
          products: [objectId(prodId)],
        }
        db.get().collection(WISHLIST_COLLECTION)
          .insertOne(wishlistObj).then((data) => {
            // console.log(data);
            resolve()
          })
      }
    })
  },

  removeFromWishlist: (prodId, userId) => {
    // console.log(prodId);
    // console.log(userId);
    return new Promise(async (resolve, reject) => {
      await db.get().collection(WISHLIST_COLLECTION)
        .updateOne(
          {
            user: objectId(userId)
          },
          {
            $pull: {
              products: objectId(prodId)
            }
          }
        ).then((data) => {
          if (data.modifiedCount) {
            resolve()
          }
        })
    })
  },

  getWishlistCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let wishlist = await db.get().collection(WISHLIST_COLLECTION).findOne({ user: objectId(userId) });
      // console.log(cart);
      if (wishlist) {
        count = wishlist.products.length
      }
      resolve(count)
    })
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlistProducts = await db.get().collection(WISHLIST_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $lookup: {
            from: PRODUCT_COLLECTION,
            localField: 'products',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            _id: 0,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }

      ]).toArray()
      resolve(wishlistProducts)
    })
  },

  generateRazorpay: (orderId, totalPrice) => {
    // console.log('' + orderId, totalPrice);
    return new Promise((resolve, reject) => {
      instance.orders.create({
        amount: totalPrice * 100,
        currency: "INR",
        receipt: '' + orderId,
      }, (err, order) => {
        if (err) {
          console.log(err);
        } else {
          resolve(order)
        }
      })
    })
  },

  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto');
      let hmac = crypto.createHmac('sha256', 'JCorSRosrNLhJkdmREMshtJm')

      hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
      hmac = hmac.digest('hex')

      if (hmac == details['payment[razorpay_signature]']) {
        resolve()
      } else {
        reject()
      }
    })
  },

  changePaymentStatus: (orderId) => {
    console.log(orderId + 'orderId');
    return new Promise(async (resolve, reject) => {
      await db.get().collection(ORDER_COLLECTION)
        .updateOne(
          {
            _id: objectId(orderId)
          },
          {
            $set: {
              status: 'Placed'
            }
          }
        ).then((data) => {
          console.log(data + 'status updation');
          resolve()
        })
      reject()
    })
  },

  updateUser: (userId, userDetails) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(USER_COLLECTION)
        .updateOne(
          {
            _id: objectId(userId)
          },
          {
            $set: {
              fname: userDetails.fname,
              lname: userDetails.lname,
              number: userDetails.number,
              email: userDetails.email
            }
          }
        ).then((data) => {
          console.log(data);
          resolve()
        })
    })
  },

  getUserInfo: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(USER_COLLECTION).findOne({ _id: objectId(userId) }).then((data) => {
        console.log(data);
        resolve(data)
      })
    })
  },

  changePassword: ({ currentPassword, newpassword }, userId) => {
    return new Promise(async (resolve, reject) => {

      let response = {}

      let userfind = await db.get().collection(USER_COLLECTION).findOne({ _id: objectId(userId) })
      console.log(userfind)
      if (userfind) {

        currentPassword = currentPassword.toString()
        bcryptpass = await bcrypt.hash(currentPassword, 10)

        bcrypt.compare(currentPassword, userfind.password).then(async (status) => {
          console.log(status);

          if (status) {

            response.check = true;
            response.successMessage = "password reseted successfully"

            newpassword = newpassword.toString()
            bcryptNewPass = await bcrypt.hash(newpassword, 10)

            db.get().collection(USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
              $set: {
                password: bcryptNewPass
              }
            }).then(() => {
              console.log(response);
              resolve(response)
            })

          } else {
            response.check = false;
            response.errmessage = "old password is incorrect";
            reject(response)
          }
        })
      }
    })
  },

  saveAddressInUser: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto')
      let id = crypto.randomUUID()
      details.id = id
      db.get().collection(USER_COLLECTION).updateOne(
        {
          _id: objectId(details.userId)
        },
        {
          $push: {
            address: details
          }
        }
      ).then((data) => {
        resolve(data)
      })
    })
  },

  getUserAddresses: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(USER_COLLECTION).findOne({ _id: objectId(userId) }).then((data) => {
        // console.log(data);
        resolve(data.address)
      })
    })
  },

  removeAddress: (userId, addressId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(USER_COLLECTION).updateOne(
        {
          _id: objectId(userId)
        },
        {
          $pull: { address: { id: addressId.addressId } }
        }
      ).then(() => {
        resolve()
      })
    })
  },

  getDeliveryAddress: (userId, addressId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(USER_COLLECTION).findOne(
        { _id: objectId(userId) },
        {
          projection: {
            _id: 0,
            address: { $elemMatch: { id: addressId.addressId } }
          }
        }
      ).then((data) => {
        resolve(data.address[0])
      })
    })
  },

  createOrderObj: (orderAddress, products, total) => {
    return new Promise(async (resolve, reject) => {
      let today = new Date();
      let dd = String(today.getDate()).padStart(2, '0');
      let yyyy = today.getFullYear();
      let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      today = dd + '/' + mm + '/' + yyyy;
      console.log(today);

      orderObj = {
        deliveryDetails: {
          name: orderAddress.name,
          mobile: orderAddress.contactNumber,
          address: orderAddress.address,
          locality: orderAddress.locality,
          pincode: orderAddress.pincode,
          date: today
        },
        userId: objectId(orderAddress.userId),
        products: products,
        totalAmount: total
      }
      await db.get().collection(ORDER_COLLECTION).insertOne(orderObj).then((data) => {
        resolve(data)
      })
    })
  },

  getWalletHistory: (userId) => {
    return new Promise((resolve, reject) => {
      db.get().collection(USER_COLLECTION).findOne({ _id: objectId(userId) }).then((data) => {
        console.log(data);
        resolve(data.walletHistory)
      })
    })
  },

  getCategories: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db.get().collection(CATEGORY_COLLECTION).find().toArray()
      resolve(categories)
    })
  },

  getCategoryProducts: (categoryName) => {
    return new Promise(async (resolve, reject) => {
      let categoryProducts = await db.get().collection(PRODUCT_COLLECTION).find({ pro_category: categoryName }).toArray()
      resolve(categoryProducts)
    })
  },
  getWalletAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(USER_COLLECTION).findOne({ _id: objectId(userId) });
      resolve(user.wallet)
    })
  },

  placeWalletOrder: (orderDetails, userId, products, total, walletAmt) => {
    return new Promise(async (resolve, reject) => {
      let status = orderDetails.paymentMethod = "Placed"
      let deliveryAddress = await db.get().collection(USER_COLLECTION).findOne(
        { _id: objectId(userId) },
        {
          projection: {
            _id: 0,
            address: { $elemMatch: { id: orderDetails.address } }
          }
        }
      )
      deliveryAddress = deliveryAddress.address[0]
      console.log(deliveryAddress);

      let today = new Date();
      let dd = String(today.getDate()).padStart(2, '0');
      let yyyy = today.getFullYear();
      let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
      today = dd + '/' + mm + '/' + yyyy;

      let orderObj = {
        deliveryDetails: {
          name: deliveryAddress.name,
          mobile: deliveryAddress.contactNumber,
          address: deliveryAddress.address,
          locality: deliveryAddress.locality,
          pincode: deliveryAddress.pincode,
          date: today
        },
        userId: objectId(userId),
        products: products,
        totalAmount: total,
        paymentMethod: orderDetails.paymentMethod,
        status: status
      }

      db.get().collection(ORDER_COLLECTION).insertOne(orderObj)
        .then(async (data) => {
          await db.get().collection(CART_COLLECTION).deleteOne({ user: objectId(userId) });
          await db.get().collection(USER_COLLECTION).updateOne(
            {
              _id: objectId(userId)
            },
            {
              $inc: {
                wallet: parseInt(-total)
              },
              $push: {
                walletHistory: {
                  date: today,
                  message: "Created an order with your wallet amount.",
                  amount: total,
                  orderId: data.insertedId
                }
              }

            }

          )
          resolve();
        })
    })
  }
}

/* let status = orderDetails.paymentMethod === 'COD' ? 'Placed' : 'Pending';

let deliveryAddress = await db.get().collection(USER_COLLECTION).findOne(
  { _id: objectId(userId) },
  {
    projection: {
      _id: 0,
      address: { $elemMatch: { id: orderDetails.address } }
    }
  }
)
deliveryAddress = deliveryAddress.address[0]

let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let yyyy = today.getFullYear();
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
today = dd + '/' + mm + '/' + yyyy;

let orderObj = {
  deliveryDetails: {
    name: deliveryAddress.name,
    mobile: deliveryAddress.contactNumber,
    address: deliveryAddress.address,
    locality: deliveryAddress.locality,
    pincode: deliveryAddress.pincode,
    date: today
  },
  userId: objectId(userId),
  products: products,
  totalAmount: total,
  paymentMethod: orderDetails.paymentMethod,
  status: status
}

  db.get().collection(ORDER_COLLECTION).insertOne(orderObj)
  .then((data) => {
    console.log(data);
    db.get().collection(CART_COLLECTION).deleteOne({ user: objectId(userId) });
    resolve(data.insertedId);
  })
    }) */