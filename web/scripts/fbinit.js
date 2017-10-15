(function(exports) {

    var defaults = {
        selector: 'fb-login',
        loginButtonClass: 'fb-login-button',
        fbApiVersion: 'v2.10',
    };

    /**
     * Init Facebook - check login status and show login button if needed. Once user completes 
     * login, callback will be called with the authResponse object returned by FB. If user is 
     * already logged in, callback will be invoked immediately.
     * 
     * Options: 
     *
     * - fbAppId - required
     * - fbApiVersion - default 'v2.10'
     * - loginButtonClass - CSS class for login button, default 'fb-login-button'
     * - selector - ID of element to inject login button into, default 'fb-login'
     */
    exports.fbInit = function(options, callback) {

        if (!options.fbAppId) {
            throw ('fbAppId option is missing');
        }
        
        options = Object.assign({}, defaults, options);
        
        var loginWrapper = document.getElementById(options.selector || 'fb-login');

        if (!loginWrapper) {
            console.warn('missing #fb-login, skipping');
        }

        var handleLoginSucess = function(response) {
            hideLoginButton(loginWrapper);
            callback(response.authResponse);
        }

        // Once FB SDK is loaded, check login status and show login button if needed
        window.fbAsyncInit = function() {
            FB.getLoginStatus(function(response) {
                if (response.status == 'connected') {
                    handleLoginSucess(response);
                }
                else {
                    showLoginButton(loginWrapper, handleLoginSucess);
                }
            });
        };
        
        // Inject the FB SDK
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "//connect.facebook.net/en_US/sdk.js#xfbml=1&version="+options.fbApiVersion+"&appId="+options.fbAppId;
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }

    /**
     * Inject the login button into the DOM
     */
    function showLoginButton(wrapper, handleLoginSucess) {

        wrapper.innerHTML = '<button type="button" id="fb-login-button">Login with Facebook</button>';
        
        var loginButton = document.createElement('button');
        loginButton.setAttribute('type', 'button');
        loginButton.textContent = 'Login with Facebook';
        loginButton.classList.add('fb-login-button');
        
        loginButton.onclick = function(e) {
            FB.login(function(response) {
                if (response.status == 'connected') {
                    handleLoginSucess(response);
                }
                else {
                    console.warn('not logged in');
                }
            });
        }

        wrapper.innerHTML = '';
        wrapper.appendChild(loginButton);
    }
     
    /**
     * Hide the login button
     */
    function hideLoginButton(wrapper) {
        wrapper.innerHTML = '';
    }

})(window);
