function addToCart(prodId) {
    $.ajax({
        url: '/add-to-cart/' + prodId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-count').html()
                count = parseInt(count) + 1
                $('#cart-count').html(count)
            }
        }
    })
}

function addToWishlist(prodId) {
    $.ajax({
        url: '/add-to-wishlist/' + prodId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#wishlist-count').html()
                count = parseInt(count) + 1
                $('#wishlist-count').html(count)
            }
        }
    })
}

function removeFromWishlist(prodId) {
    console.log('remove wishlist')
    $.ajax({
        url: '/remove-from-wishlist/' + prodId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                console.log(response.status);
                let count = $('#wishlist-count').html()
                count = parseInt(count) - 1
                $('#wishlist-count').html(count)
            }
        }
    })
}
