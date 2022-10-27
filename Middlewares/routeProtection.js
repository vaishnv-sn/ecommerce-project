module.exports = {
    adminRouteProtection: (req, res, next) => {
        if (req.session.adminLoggedIn) {
            next()
        } else {
            res.redirect('/admin')
        }
    },
    // cache clearing middleware
    clearCache: (req, res, next) => {
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        next()
    },
    // user Login checking middleware
    verifyLogin: (req, res, next) => {
        if (req.session.userLoggedIn) {
            next()
        } else {
            res.redirect('/')

        }
    }
}