var express = require('express');
var router = express.Router();
var userHelper = require('../helpers/user-helper')
var adminHelper = require('../helpers/admin-helper')
var productHelper = require('../helpers/product-helper');
var categoryHelper = require('../helpers/category-helper')
const e = require('express');
// const { blockUser, unblockUser } = require('../helpers/admin-helper');
const { adminRouteProtection, clearCache } = require('../Middlewares/routeProtection');
const multer = require('multer');
const { route } = require('./user');

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
      res.redirect('/admin/dashbord')
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
        res.redirect('admin/dashboard')
      } else {
        req.session.adminLoginErr = "Warning: Invalid admin credentials!!!"
        res.redirect('/admin')
      }
    })
  });

/* GET users listing. */
router.route('/all-users')
  .get(adminRouteProtection, clearCache, function (req, res) {
    adminHelper.getAllUsers().then((users) => {
      // console.log(users);
      res.render('admin/list-users', { users, admin: true })
    })
  });

// add user
router.route('/add-user')
  .get(adminRouteProtection, clearCache, function (req, res) {
    res.render('admin/add-user', { admin: true })
  })
  .post(function (req, res) {
    userHelper.doSignup(req.body).then(
      res.redirect('/admin/add-user')
    )
  });

/* GET users listing. */
router.route('/all-products')
  .get(adminRouteProtection, clearCache, function (req, res) {
    productHelper.getAllProducts().then((products) => {
      // console.log(products);
      res.render('admin/list-products', { admin: true, products })
    })
  });

/* Categories route */
router.route('/categories')
  .get(adminRouteProtection, clearCache, function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      res.render('admin/categories', { categories, admin: true })
    })
  })
  .post((req, res) => {
    categoryHelper.addCategory(req.body).then(() => {
      res.redirect('/admin/categories')
    })
  });

/* Delete Category route */
router.route('/delete-category/:id')
  .get(adminRouteProtection, clearCache, (req, res) => {
    categoryHelper.deleteCategory(req.params.id).then(() => {
      res.redirect('/admin/categories')
    })
  });


/* Product adding route */
router.route("/add-product")
  .get(adminRouteProtection, clearCache, function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      res.render('admin/add-products', { categories, admin: true })
    })
  })
  .post(upload.fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 },]), function (req, res) {

    let product = req.body
    product.image1 = req.files.image1[0].filename
    product.image2 = req.files.image2[0].filename
    console.log(product);


    productHelper.addProduct(product).then((data) => {
      // console.log(data)
      res.redirect('/admin/all-products')
    })

  });

// all orders route
router.route("/all-orders")
  .get(adminRouteProtection, clearCache, async function (req, res) {
    await adminHelper.getAllOrders().then((orders) => {
      console.log(orders);
      res.render('admin/all-orders', { admin: req.session.admin, orders })
    })
  });

// delete product
router.get('/delete-product/:id', clearCache, adminRouteProtection, (req, res) => {
  let prodId = req.params.id
  // console.log(userId+'userId');
  productHelper.deleteProduct(prodId).then((responce) => {
    res.redirect('/admin/all-products')
  })
});

// edit product
router.route('/edit-product/:id')
  .get(adminRouteProtection, clearCache, (req, res) => {
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
  .get(adminRouteProtection, clearCache, (req, res) => {
    // console.log(req.params.id);
    adminHelper.blockUser(req.params.id).then(() => {
      res.redirect('/admin/all-users')
    })
  });

// Unblock User
router.route('/unblock-user/:id')
  .get(adminRouteProtection, clearCache, (req, res) => {
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
  .get(async (req, res) => {
    await adminHelper.getBanners().then((banners) => {
      // console.log(banners);
      res.render('admin/add-banner', { banners })

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
  .get(adminRouteProtection, (req, res) => {
    res.render('admin/dashboard', { admin: req.session.admin })
  })




module.exports = router;
