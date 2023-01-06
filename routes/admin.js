var express = require('express');
var router = express.Router();
var userHelper = require('../helpers/user-helper');
var adminHelper = require('../helpers/admin-helper');
var productHelper = require('../helpers/product-helper');
var categoryHelper = require('../helpers/category-helper');
const chartHelper = require('../helpers/chart-helper');
const e = require('express');
const { adminRouteProtection } = require('../Middlewares/routeProtection');
const multer = require('multer');
const { route } = require('./user');
const { response } = require('express');

// handle storage using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/product')
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });


/* GET admin login */
router.route('/')
  .get(function (req, res, next) {
    if (req.session.adminLoggedIn) {
      res.redirect('/admin/dashboard')
    } else {
      res.render('admin/adminLogin', { adminLoginErr: req.session.adminLoginErr })
      req.session.adminLoginErr = null;
    }
  })
  .post(function (req, res) {
    // console.log(req.body);
    adminHelper.adminLogin(req.body).then((response) => {
      // console.log(response);
      if (response.adminStatus) {
        req.session.admin = response.admin
        req.session.adminLoggedIn = true
        res.redirect('/admin/dashboard')
      } else {
        req.session.adminLoginErr = "Warning: Invalid admin credentials!!!"
        res.redirect('/admin')
      }
    })
  });

/* GET users listing. */
router.route('/all-users')
  .get(adminRouteProtection, function (req, res) {
    adminHelper.getAllUsers().then((users) => {
      // console.log(users);
      res.render('admin/list-users', { users, admin: req.session.admin })
    })
  });

// add user
router.route('/add-user')
  .get(adminRouteProtection, function (req, res) {
    res.render('admin/add-user', { admin: req.session.admin })
  })
  .post(function (req, res) {
    userHelper.doSignup(req.body).then(
      res.redirect('/admin/add-user')
    )
  });

/* GET users listing. */
router.route('/all-products')
  .get(adminRouteProtection, function (req, res) {
    productHelper.getAllProducts().then((products) => {
      res.render('admin/list-products', { admin: req.session.admin, products })
    })
  });

/* Categories route */
router.route('/categories')
  .get(adminRouteProtection, function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      let categorySuccess = req.session.categorySuccess
      let categoryErr = req.session.categoryErr
      res.render('admin/categories', { categories, admin: req.session.admin, categoryErr, categorySuccess })
      req.session.categoryErr = null;
      req.session.categorySuccess = null;
    })
  })
  .post((req, res) => {
    categoryHelper.addCategory(req.body).then((response) => {
      req.session.categorySuccess = response.status
      res.redirect('/admin/categories')
    }).catch((err) => {
      req.session.categoryErr = err.status
      res.redirect('/admin/categories')
    })
  });

/* Delete Category route */
router.route('/delete-category/:id')
  .get(adminRouteProtection, (req, res) => {
    categoryHelper.deleteCategory(req.params.id).then(() => {
      res.redirect('/admin/categories')
    })
  });


/* Product adding route */
router.route("/add-product")
  .get(adminRouteProtection, function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      res.render('admin/add-products', { categories, admin: req.session.admin })
    })
  })
  .post(upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 },]), function (req, res) {
    let product = req.body
    product.image1 = req.files.image1[0].filename
    product.image2 = req.files.image2[0].filename
    productHelper.addProduct(product).then((data) => {
      res.redirect('/admin/all-products')
    })
  });

// all orders route
router.route("/all-orders")
  .get(adminRouteProtection, async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    let count = await adminHelper.orderCount();
    const numPages = Math.ceil(count / limit)
    adminHelper.getOrderList(page, limit).then((orders) => {
      res.render('admin/all-orders', { orders, numPages, page, admin: req.session.admin })
    })

  });

// delete product
router.get('/delete-product/:id', adminRouteProtection, (req, res) => {
  let prodId = req.params.id
  productHelper.deleteProduct(prodId).then((responce) => {
    res.redirect('/admin/all-products')
  })
});

// edit product
router.route('/edit-product/:id')
  .get(adminRouteProtection, (req, res) => {
    productHelper.getProductDetails(req.params.id).then(async (product) => {
      let categories = await categoryHelper.getAllCategory(req.params.id)
      // console.log(categories);
      res.render('admin/edit-product', { product, admin: req.session.admin, categories })
    })
  })
  .post(upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }]), (req, res) => {
    console.log(req.files);
    productHelper.updateProduct(req.params.id, req.body).then(() => {
      if (req.files.image1 && req.files.image2) {
        productHelper.editImages(req.params.id, req.files.image1[0].filename, req.files.image2[0].filename)
      } else if (req.files.image1 && !req.files.image2) {
        productHelper.editImage1(req.params.id, req.files.image1[0].filename)
      } else if (req.files.image2 && !req.files.image1) {
        productHelper.editImage2(req.params.id, req.files.image2[0].filename)
      }
    }).then(() => {
      res.redirect('/admin/all-products')
    })
  });

// Block User
router.route('/block-user/:id')
  .get(adminRouteProtection, (req, res) => {
    // console.log(req.params.id);
    adminHelper.blockUser(req.params.id).then(() => {
      res.redirect('/admin/all-users')
    })
  });

// Unblock User
router.route('/unblock-user/:id')
  .get(adminRouteProtection, (req, res) => {
    adminHelper.unblockUser(req.params.id).then(() => {
      res.redirect('/admin/all-users')
    })
  });

// Logout route
router.get('/admin-logout', adminRouteProtection, (req, res) => {
  req.session.admin = false;
  req.session.adminLoggedIn = false;
  res.redirect('/admin')
});

router.route('/cancel-order')
  .post(adminRouteProtection, (req, res) => {
    console.log(req.body);
    adminHelper.cancelOrder(req.body.orderId).then(() => {
      res.json({ status: true })
    })
  })

router.route('/add-banner')
  .get(adminRouteProtection, async (req, res) => {
    await adminHelper.getBanners().then((banners) => {
      // console.log(banners);
      res.render('admin/add-banner', { admin: req.session.admin, banners })

    })
  })
  .post(
    upload.fields([
      { name: 'banner1', maxCount: 1 },
      { name: 'banner2', maxCount: 1 },
      { name: 'banner3', maxCount: 1 }
    ]),
    async (req, res) => {
      let fileName = {}
      fileName.banner1 = req.files.banner1[0].filename
      fileName.banner2 = req.files.banner2[0].filename
      fileName.banner3 = req.files.banner3[0].filename
      await adminHelper.editBanners(fileName).then((response) => {
        res.redirect('/admin/list-banner')
      })
    })

router.route('/list-banner')
  .get((req, res) => {
    res.render('admin/list-banner')
  })

router.route('/dashboard')
  .get(adminRouteProtection, async (req, res) => {
    let userCount = await adminHelper.allUsersCount()
    let orderStatusCount = await adminHelper.orderStatusCount()
    res.render('admin/dashboard', { admin: req.session.admin, userCount, orderStatusCount })
  })

router.route('/edit-order-status/:id')
  .post(adminRouteProtection, (req, res) => {
    adminHelper.changeOrderStatus(req.params.id, req.body.deliveryStatus).then((response) => {
      req.session.orderStatus = response.status
      res.redirect('/admin/all-orders')
    }).catch((response) => {
      req.session.orderStatus = response.status
    })
  })

router.route('/order-details/:id')
  .get(adminRouteProtection, async (req, res) => {
    let orderDetails = await adminHelper.getOrderDetails(req.params.id);
    let orderProducts = await adminHelper.getOrderedProducts(req.params.id);
    console.log(orderDetails);
    res.render('admin/adminOrderDetails', { admin: req.session.admin, orderProducts, orderDetails });
  })

router.route('/sales-report')
  .get(adminRouteProtection, async (req, res) => {
    let salesData = await adminHelper.fetchYearAndMonthSale();
    let monthSale = salesData.monthSale;
    let yearSale = salesData.yearSale;
    let allCount = await adminHelper.allCount();
    let sales = await adminHelper.fetchSales();
    let userCount = await adminHelper.getUserCount();
    let monthNames = await adminHelper.fetchMonth();
    let noOfOrders = await adminHelper.getOrderCount();
    let orderList = await adminHelper.getCustomOrdersList();
    console.log(sales);
    res.render('admin/salesReport', {
      admin: req.session.admin,
      userCount,
      sales,
      allCount,
      monthNames,
      monthSale,
      yearSale,
      noOfOrders,
      orderList
    });
  })

router.route('/coupons')
  .get(adminRouteProtection, (req, res) => {
    adminHelper.getCoupons().then((coupon) => {
      res.render('admin/coupon', { admin: req.session.admin, coupon })
    })
  })
  .post(adminRouteProtection, (req, res) => {
    console.log(req.body);
    adminHelper.addCoupons(req.body).then(() => {
      res.json({ status: true })
    })
  })

router.route('/remove-coupon')
  .post((req, res) => {
    console.log(req.body);
    adminHelper.removeCoupon(req.body.coupon).then(() => {
      res.json({ status: true })
    })
  })



module.exports = router;




/* getprodlist: (startIndex, limit) => {

  return new Promise(async (resolve, reject) => {


    let index = ((startIndex - 1) * limit)

    console.log(index);


    let categoryName = await db.get().collection(collection.PRODUCTCOLLECTION).aggregate([

      {
        $lookup: {

          from: collection.CATEGORYCOLLECTION,
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $project: {
          category: { $arrayElemAt: ['$category', 0] },
          name: 1,
          image: 1,
          price: 1,
          description: 1,
          originalPrice: 1,
          offerPercentage: 1


        }
      },
      {
        $skip: index


      }, {
        $limit: limit


      }
    ]).toArray()

    console.log(categoryName, "222222222222211111");
    resolve(categoryName)

  })


} */