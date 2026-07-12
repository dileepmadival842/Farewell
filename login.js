(function() {
    const config = window.FAREWELL_SUPABASE_CONFIG || {};
    const client = window.supabase && config.url && config.anonKey
        ? window.supabase.createClient(config.url, config.anonKey)
        : null;

    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('adminEmail');
    const passwordInput = document.getElementById('adminPassword');
    const loginBtn = document.getElementById('loginBtn');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const toast = document.getElementById('toast');

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('is-visible');
        clearTimeout(showToast.timeoutId);
        showToast.timeoutId = setTimeout(() => toast.classList.remove('is-visible'), 2600);
    }

    async function redirectIfLoggedIn() {
        if (!client) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('force') === '1') {
            await client.auth.signOut();
            window.history.replaceState({}, '', 'login.html');
            return;
        }

        const { data } = await client.auth.getSession();
        if (data.session) {
            window.location.href = 'admin.html';
        }
    }

    async function login(event) {
        event.preventDefault();
        if (window.location.protocol === 'file:') {
            showToast('Open this app through localhost, not by double-clicking the HTML file.');
            return;
        }

        if (!client) {
            showToast('Supabase is not configured.');
            return;
        }

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in';

        const { error } = await client.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        if (error) {
            showToast(error.message === 'Failed to fetch'
                ? 'Cannot reach Supabase. Use http://localhost and check internet connection.'
                : error.message);
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-right-to-bracket"></i> Login';
            return;
        }

        window.location.href = 'admin.html';
    }

    togglePasswordBtn.addEventListener('click', () => {
        const shouldShow = passwordInput.type === 'password';
        passwordInput.type = shouldShow ? 'text' : 'password';
        togglePasswordBtn.innerHTML = `<i class="fas ${shouldShow ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
        togglePasswordBtn.setAttribute('aria-label', shouldShow ? 'Hide password' : 'Show password');
    });

    form.addEventListener('submit', login);
    redirectIfLoggedIn();
})();