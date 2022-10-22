module.exports = {
    adminRouteProtection: (req, res, next) => {
        if (req.session.adminLoggedIn) {
            next()
        } else {
            res.redirect('/admin')
        }
    }
}