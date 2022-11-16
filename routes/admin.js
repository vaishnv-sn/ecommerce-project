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

// handle storage using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/product')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname + '-' + Date.now())
  }
});

const upload = multer({ storage: storage });


/* GET admin login */
router.route('/')
  .get(function (req, res, next) {
    res.render('admin/adminLogin', { adminLoginErr: req.session.adminLoginErr })
    req.session.adminLoginErr = null;
  })
  .post(function (req, res) {
    console.log(req.body);
    adminHelper.adminLogin(req.body).then((response) => {
      // console.log(response);
      if (response.adminStatus) {
        req.session.admin = response.admin
        req.session.adminLoggedIn = true
        res.redirect('admin/all-users')
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
  .post(upload.array('Images', 4), function (req, res) {
    const files = req.files

    const file = files.map((file) => {
      return file
    })

    const fileName = file.map((file) => {
      return file.fileName
    })

    const product = req.body
    product.image = fileName

    productHelper.addProduct(product).then(() => {
      res.redirect('admin/list-products')
    })

  });

// all orders route
router.route("/all-orders")
  .get(adminRouteProtection, clearCache, function (req, res) {
    res.render('admin/all-orders', { admin: true })
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
  .get(adminRouteProtection, clearCache, async (req, res) => {
    await productHelper.getProductDetails(req.params.id).then(async (product) => {
      let categories = await categoryHelper.getAllCategory(req.params.id)
      res.render('admin/edit-product', { product, admin: true, categories })
    })
  })
  .post((req, res) => {
    productHelper.updateProduct(req.params.id, req.body).then(() => {
      res.redirect('/admin/all-products')
      // console.log(req.files.pro_image);
      if (req.files?.pro_image) {
        req.files.pro_image.mv('./public/product-images/' + req.params.id + '.jpg')
      }
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


module.exports = router;
