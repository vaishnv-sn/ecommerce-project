var express = require('express');
var router = express.Router();
var userHelper = require('../helpers/user-helper')
var adminHelper = require('../helpers/admin-helper')
var productHelper = require('../helpers/product-helper');
var categoryHelper = require('../helpers/category-helper')
const e = require('express');
// const { blockUser, unblockUser } = require('../helpers/admin-helper');
const { adminRouteProtection } = require('../Middlewares/routeProtection');


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
  })

/* GET users listing. */
router.route('/all-users')
  .get(adminRouteProtection, function (req, res) {
    adminHelper.getAllUsers().then((users) => {
      // console.log(users);
      res.render('admin/list-users', { users, admin: true })
    })
  })

// add user
router.route('/add-user')
  .get(adminRouteProtection, function (req, res) {
    res.render('admin/add-user', { admin: true })
  })
  .post(function (req, res) {
    userHelper.doSignup(req.body).then(
      res.redirect('/admin/add-user')
    )
  })

/* GET users listing. */
router.route('/all-products')
  .get(adminRouteProtection, function (req, res) {
    productHelper.getAllProducts().then((products) => {
      // console.log(products);
      res.render('admin/list-products', { admin: true, products })
    })
  })

/* Categories route */
router.route('/categories')
  .get(function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      res.render('admin/categories', { categories, admin: true })
    })
  })
  .post((req, res) => {
    categoryHelper.addCategory(req.body).then(() => {
      res.redirect('/admin/categories')
    })
  })

/* Delete Category route */
router.route('/delete-category/:id')
  .get((req, res) => {
    categoryHelper.deleteCategory(req.params.id).then(()=>{
      res.redirect('/admin/categories')
    })
  })


/* Product adding route */
router.route("/add-product")
  .get(adminRouteProtection, function (req, res) {
    categoryHelper.getAllCategory().then((categories) => {
      res.render('admin/add-products', { categories, admin: true })
    })
  })
  .post(function (req, res) {
    productHelper.addProduct(req.body, (id) => {
      let Image = req.files.pro_image;
      Image.mv('./public/product-images/' + id + '.jpg', (err) => {
        if (!err) {
          res.redirect('/admin/add-product')
        } else {
          console.log(err);
        }
      })
    })
  })

router.route("/all-orders")
  .get(adminRouteProtection, function (req, res) {
    res.render('admin/all-orders', { admin: true })
  })

// delete product
router.get('/delete-product/:id', adminRouteProtection, (req, res) => {
  let prodId = req.params.id
  // console.log(userId+'userId');
  productHelper.deleteProduct(prodId).then((responce) => {
    res.redirect('/admin/all-products')
  })
});

// edit product
router.route('/edit-product/:id')
  .get(adminRouteProtection, async (req, res) => {
    let product = await productHelper.getProductDetails(req.params.id)
    // console.log(product);
    res.render('admin/edit-product', { product, admin: true })
  })
  .post((req, res) => {
    productHelper.updateProduct(req.params.id, req.body).then(() => {
      res.redirect('/admin/all-products')
      // console.log(req.files.pro_image);
      if (req.files.pro_image) {
        req.files.pro_image.mv('./public/product-images/' + req.params.id + '.jpg')
      }
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
})


module.exports = router;
