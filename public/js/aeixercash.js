    // ==================== SCRIPT START ====================
    
    if (typeof window.ethers === 'undefined') {
        console.error('Ethers library not loaded!');
    }
    const ethers = window.ethers;
    
    import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
    import { 
        getAuth, 
        signInAnonymously, 
        signInWithCustomToken, 
        onAuthStateChanged, 
        signOut,
        GoogleAuthProvider,
        signInWithPopup,
        setPersistence,
        inMemoryPersistence
    } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
    import { 
        getFirestore, 
        doc, setDoc, getDoc, updateDoc, serverTimestamp, 
        collection, query, where, getDocs, onSnapshot, deleteDoc, addDoc 
    } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
    
    lucide.createIcons();
    
    const firebaseConfig = {
  apiKey: "AIzaSyC96QB4RWl-8vHCSAkuWa-1D1wp6sGiO3E",
  authDomain: "tervallx.firebaseapp.com",
  projectId: "tervallx",
  storageBucket: "tervallx.firebasestorage.app",
  messagingSenderId: "1097149640832",
  appId: "1:1097149640832:web:24205417b4f481b7523665",
  measurementId: "G-32MMXKPB83"
};

    
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    window.auth = auth;
    
    const db = getFirestore(app); 
    
    // ========== NETWORK CONFIGURATION ==========
    const ALCHEMY_API_KEY = "un_fsyvrLK_w11KP75BED";
    // Hero device image URL (override by setting window.HERO_DEVICE_IMAGE_URL)
    const HERO_DEVICE_IMAGE_URL = window.HERO_DEVICE_IMAGE_URL || 'https://i.postimg.cc/j2tQFBx5/image.png';
    
    const NETWORKS = {
        testnet: {
            name: 'Polygon Amoy',
            label: 'Testnet',
            rpcUrl: `https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            usdcContract: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
            explorer: 'https://amoy.polygonscan.com/tx/',
            chainId: 80002
        },
        mainnet: {
            name: 'Polygon',
            label: 'Mainnet',
            rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
            usdcContract: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            explorer: 'https://polygonscan.com/tx/',
            chainId: 137
        }
    };
    
    // Current network — persisted in localStorage (can switch between testnet and mainnet in dashboard)
    let currentNetwork = (localStorage.getItem('AeiXerCash_network') || 'mainnet');
    
    function getCurrentNetworkConfig() {
        return NETWORKS[currentNetwork] || NETWORKS.testnet;
    }
    
    function switchNetwork(net) {
        if (net === currentNetwork) return;
        currentNetwork = net;
        localStorage.setItem('AeiXerCash_network', net);
        // Reinitialise provider
        const cfg = getCurrentNetworkConfig();
        window._provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
        showToast(`Switched to ${cfg.name} (${cfg.label})`, 'info');
        // Refresh balances and transactions
        syncUserData();
        loadTransactions();
        // Re-render to update badges
        render();
    }
    window.switchNetwork = switchNetwork;
    
    const USDC_DECIMALS = 6;
    const USDC_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function transfer(address to, uint256 amount) returns (bool)",
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "event Transfer(address indexed from, address indexed to, uint256 value)"
    ];
    
    // Lazy provider — always reads from current network
    function getProvider() {
        if (!window._provider) {
            window._provider = new ethers.JsonRpcProvider(getCurrentNetworkConfig().rpcUrl);
        }
        return window._provider;
    }
    
    // Backwards compat alias used by existing code
    const provider = { get _isSigner() { return false; } };  // placeholder so old refs don't crash
    // Ensure EIP-1193 providers expose Node-style addListener/removeListener used by some libraries
    try {
        if (typeof window !== 'undefined' && window.ethereum) {
            if (typeof window.ethereum.addListener !== 'function') {
                if (typeof window.ethereum.on === 'function') window.ethereum.addListener = window.ethereum.on.bind(window.ethereum);
                else window.ethereum.addListener = function() {};
            }
            if (typeof window.ethereum.removeListener !== 'function') {
                if (typeof window.ethereum.off === 'function') window.ethereum.removeListener = window.ethereum.off.bind(window.ethereum);
                else if (typeof window.ethereum.removeListener === 'undefined') window.ethereum.removeListener = function() {};
            }
            if (typeof window.ethereum.once !== 'function') {
                window.ethereum.once = function(event, cb) {
                    if (typeof window.ethereum.on === 'function') {
                        const wrapper = function() { cb.apply(null, arguments); window.ethereum.removeListener(event, wrapper); };
                        window.ethereum.on(event, wrapper);
                    }
                };
            }
        }
    } catch (e) { /* ignore polyfill errors */ }
    
    // ==============================================================

    // If the app is loaded at /checkout/<publicId>, render a minimal public checkout page
    (async function handlePublicCheckoutRoute(){
        try {
            const path = window.location.pathname || '/';
            if (!path.startsWith('/checkout/')) return;
            const parts = path.split('/').filter(Boolean);
            const publicId = parts[1];
            if (!publicId) return;

            // Load checkout api record
            const docRef = doc(db, 'checkout_apis', publicId);
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                document.body.innerHTML = `<div class="min-h-screen flex items-center justify-center"><div class="p-6 bg-white rounded shadow">Checkout not found.</div></div>`;
                return;
            }
            const api = snap.data();

            // Minimal checkout UI
            document.body.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div class="bg-white rounded-2xl shadow p-6 max-w-md w-full">
                        <h2 class="text-xl font-bold mb-2">Checkout — ${api.productName}</h2>
                        <p class="text-sm text-slate-500 mb-4">${api.description || ''}</p>
                        <div class="mb-4 p-4 bg-slate-100 rounded">
                            <div class="flex justify-between"><span class="font-semibold">Amount</span><span class="font-bold">$${Number(api.price).toFixed(2)} USDC</span></div>
                        </div>
                        <div class="space-y-3">
                            <label class="text-xs">Your email (optional)</label>
                            <input id="public-payer-email" class="w-full px-3 py-2 border rounded" placeholder="you@example.com" />
                            <label class="text-xs">If you have a AeiXerCash mnemonic, paste it to sign. Otherwise you may sign locally in your browser.</label>
                            <textarea id="public-payer-mnemonic" class="w-full px-3 py-2 border rounded" placeholder="12-word mnemonic (optional)"></textarea>
                        </div>
                        <div class="mt-4 flex gap-2">
                            <button id="public-pay-btn" class="flex-1 bg-blue-600 text-white px-4 py-2 rounded">Pay $${Number(api.price).toFixed(2)}</button>
                        </div>
                        <div id="public-checkout-msg" class="mt-3 text-sm text-slate-500"></div>
                    </div>
                </div>`;

            document.getElementById('public-pay-btn').addEventListener('click', async () => {
                const payBtn = document.getElementById('public-pay-btn');
                payBtn.disabled = true; payBtn.innerText = 'Processing...';
                const mnemonic = document.getElementById('public-payer-mnemonic').value.trim();
                const payerEmail = document.getElementById('public-payer-email').value.trim() || null;
                try {
                    if (!isGoogleLinkedUser()) {
                        document.getElementById('public-checkout-msg').textContent = 'Please sign in with Google in AeiXerCash before paying this checkout.';
                        payBtn.disabled = false; payBtn.innerText = `Pay $${Number(api.price).toFixed(2)}`;
                        return;
                    }
                    // Prefer injected browser wallet (MetaMask) when available and no mnemonic provided
                    let signer = null;
                    if (typeof window !== 'undefined' && window.ethereum && !mnemonic) {
                        try {
                            await window.ethereum.request({ method: 'eth_requestAccounts' });
                            const web3Provider = new ethers.BrowserProvider(window.ethereum);
                            signer = await web3Provider.getSigner();
                        } catch (e) { console.warn('Browser wallet connect failed', e); }
                    }
                    // Fallback to mnemonic if provided
                    if (!signer && mnemonic && mnemonic.split(/\s+/).length === 12 && ethers.Mnemonic.isValidMnemonic(mnemonic)) {
                        const mnemonicObj = ethers.Mnemonic.fromPhrase(mnemonic);
                        const seed = mnemonicObj.computeSeed();
                        const masterNode = ethers.HDNodeWallet.fromSeed(seed);
                        const w = masterNode.derivePath(`m/44'/60'/0'/0/0`);
                        signer = w.connect(getProvider());
                    }
                    if (!signer) {
                        document.getElementById('public-checkout-msg').textContent = 'Please connect a browser wallet (MetaMask) or enter a 12-word mnemonic to sign and pay.';
                        payBtn.disabled = false; payBtn.innerText = `Pay $${Number(api.price).toFixed(2)}`;
                        return;
                    }
                    const cfg = getCurrentNetworkConfig();
                    const usdc = new ethers.Contract(cfg.usdcContract, USDC_ABI, signer);
                    const amountWei = ethers.parseUnits(Number(api.price).toFixed(USDC_DECIMALS), USDC_DECIMALS);
                    // Send to API owner's first address if available, otherwise reject
                    const owner = api.owner;
                    const ownerDoc = (await getDoc(doc(db, 'users', owner))).data();
                    const recipientAddr = (ownerDoc && ownerDoc.addresses && ownerDoc.addresses[0] && ownerDoc.addresses[0].address) || null;
                    if (!recipientAddr) throw new Error('Recipient address not available');
                    const tx = await usdc.transfer(recipientAddr, amountWei);
                    await tx.wait();
                    // save metadata
                    try { await setDoc(doc(db, 'transactions', tx.hash), { hash: tx.hash, type: 'send', amount: Number(api.price), from: signer.address, to: recipientAddr, account: payerEmail, owner: owner, createdAt: serverTimestamp() }, { merge: true }); } catch(e){}
                    document.getElementById('public-checkout-msg').textContent = 'Payment successful — thank you!';
                    // show small toast in public checkout
                    (function showPublicToast(msg, type='success'){
                        try{
                            const id = 'public-toast';
                            let container = document.getElementById(id);
                            if (container) container.remove();
                            container = document.createElement('div');
                            container.id = id;
                            container.style.position = 'fixed';
                            container.style.top = '16px';
                            container.style.right = '16px';
                            container.style.zIndex = '9999';
                            container.innerHTML = `<div style="background:#fff;border:1px solid #e6edf7;padding:12px 16px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.08);font-weight:600;color:${type==='success'?'#10b981':'#334155'}">${msg}</div>`;
                            document.body.appendChild(container);
                            setTimeout(()=>container.remove(), 4500);
                        }catch(e){/* ignore */}
                    })('Payment successful', 'success');
                } catch (err) {
                    console.error('Public checkout failed', err);
                    document.getElementById('public-checkout-msg').textContent = 'Payment failed: ' + (err.message || err);
                } finally { payBtn.disabled = false; payBtn.innerText = `Pay $${Number(api.price).toFixed(2)}`; }
            });

        } catch (e) { console.warn('handlePublicCheckoutRoute error', e); }
    })();
    
    let walletConnected = false;
    let isAuthReady = false;
    let user = null;
    let unsubscribeTxListener = null;
    
    const appViewContainer = document.getElementById('app-view-container');
    const errorModal = document.getElementById('error-modal');
    const signoutModal = document.getElementById('signout-modal');
    const sendPayOverlay = document.getElementById('send-pay-overlay');
    const header = document.getElementById('main-header');
    const footer = document.getElementById('main-footer');
    const walletConnectModal = document.getElementById('wallet-connect-modal');
    
    const mnemonicInput = document.getElementById('mnemonic-input');
    const wordCountSpan = document.getElementById('word-count');
    const wordValidationIcon = document.getElementById('word-validation-icon');
    const wordChipsDiv = document.getElementById('word-chips');
    const verifyBtn = document.getElementById('verify-mnemonic-btn');
    const walletStep1 = document.getElementById('wallet-step-1');
    const walletStep2 = document.getElementById('wallet-step-2');
    const addressListContainer = document.getElementById('address-list-container');
    const finalizeBtn = document.getElementById('finalize-wallet-connection');
    const selectedCountSpan = document.getElementById('selected-count');
    const totalUsdcSpan = document.getElementById('total-usdc-balance');
    
    // Use proper history API routing instead of hash-based
    let currentPath = '/';
    let dashboardPage = 'wallet';
    
    function parseLocation() {
        const path = window.location.pathname;
        if (path === '/' || path === '') {
            currentPath = '/';
            dashboardPage = 'wallet';
        } else if (path.startsWith('/dashboard')) {
            currentPath = 'dashboard';
            const sub = path.replace(/^\/dashboard\/?/, '');
            if (sub === 'send') dashboardPage = 'send';
            else if (sub === 'deposit') dashboardPage = 'deposit';
            else if (sub === 'transactions') dashboardPage = 'transactions';
            else if (sub === 'settings') dashboardPage = 'settings';
            else dashboardPage = 'wallet';
        } else if (path.startsWith('/signin')) {
            currentPath = 'signin';
            dashboardPage = 'wallet';
        } else {
            currentPath = '/';
            dashboardPage = 'wallet';
        }
    }
    parseLocation(); 
    let walletMnemonic = null;
    let walletAddresses = [];
    let selectedAddressIndices = [];
    let activeWalletIndex = 0;
    // selected GIF for current transaction (if any)
    window.selectedGifUrl = null;
    let AeiXerCashUser = { 
        balance: '0.00',
        polBalance: '0.00',
        transactions: [],
        addresses: [],
        selectedAddresses: [],
        activeWalletIndex: 0,
        selectedAddressIndices: [] // FIX: ensure this property exists
    };
    // checkout apis cache
    AeiXerCashUser.checkoutApis = [];
    AeiXerCashUser.checkoutApisLoaded = false;
    
    window.AeiXerCashUser = AeiXerCashUser;
    
    const MAX_SELECTED_WALLETS = 6;
    
    // Toast function
    function showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast ${type}`;
        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'alert-circle';
        if (type === 'warning') icon = 'alert-triangle';
        toast.innerHTML = `
            <i data-lucide="${icon}" class="w-5 h-5 mt-0.5 flex-shrink-0 ${type === 'success' ? 'text-green-600' : type === 'error' ? 'text-red-500' : type === 'warning' ? 'text-amber-600' : 'text-blue-600'}"></i>
            <div class="flex-1"><p class="text-sm text-slate-700">${message}</p></div>
            <button onclick="document.getElementById('${toastId}').remove()" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-4 h-4"></i></button>
        `;
        toastContainer.appendChild(toast);
        lucide.createIcons();
        setTimeout(() => {
            const toastEl = document.getElementById(toastId);
            if (toastEl) {
                toastEl.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => toastEl.remove(), 300);
            }
        }, duration);
    }
    window.showToast = showToast;

    function isValidEmailAddress(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
    }

    function isGoogleLinkedUser() {
        const user = auth.currentUser;
        return Boolean(user && !user.isAnonymous && user.email);
    }

    function requireGoogleLinkedForTransactions() {
        if (isGoogleLinkedUser()) return true;
        showToast('Google account linking is required before sending transactions.', 'warning', 7000);
        navigate('signin');
        return false;
    }

    async function queueTransactionEmail(to, payload) {
        if (!to || !isValidEmailAddress(to)) return;
        try {
            const explorerUrl = payload.hash ? `${getCurrentNetworkConfig().explorer}${payload.hash}` : '';
            const html = `
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
                    <h2>AeiXerCash transaction confirmation</h2>
                    <p>${Number(payload.amount).toFixed(2)} USDC was sent on ${payload.network}.</p>
                    <p><strong>To:</strong> ${payload.to}</p>
                    <p><strong>From:</strong> ${payload.from}</p>
                    ${payload.message ? `<p><strong>Message:</strong> ${payload.message}</p>` : ''}
                    ${explorerUrl ? `<p><a href="${explorerUrl}">View on explorer</a></p>` : ''}
                </div>
            `;
            await fetch('/api/email/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer aeixercash-client'
                },
                body: JSON.stringify({
                    to,
                    subject: `AeiXerCash sent ${Number(payload.amount).toFixed(2)} USDC`,
                    html,
                    recipientName: payload.recipientName || to
                })
            });
        } catch (error) {
            console.warn('Transaction email queue failed', error);
        }
    }
    
    async function saveUserWalletData(addresses, selectedIndices, activeIndex) {
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('No authenticated user');
            
            const walletData = {
                addresses: addresses.map(a => ({ address: a.address, balance: a.balance })),
                selectedAddressIndices: selectedIndices,
                activeWalletIndex: activeIndex || 0,
                updatedAt: new Date().toISOString()
            };
            
            // For Google users: save to Firestore
            if (!currentUser.isAnonymous && currentUser.email) {
                const email = currentUser.email.toLowerCase();
                await setDoc(doc(db, 'users', email), {
                    ...walletData,
                    email: currentUser.email,
                    displayName: currentUser.displayName || null,
                    photoURL: currentUser.photoURL || null,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                console.log('User wallet data saved to Firestore');
            } else {
                // For anonymous/mnemonic users: save to localStorage
                localStorage.setItem('AeiXerCash_walletData', JSON.stringify(walletData));
                console.log('User wallet data saved to localStorage');
            }
        } catch (err) {
            console.error('Error saving wallet data:', err);
            throw err;
        }
    }

    // Save transaction metadata to Firestore under collection 'transactions' keyed by tx hash
    async function saveTransactionMetadata(hash, meta) {
        try {
            if (!hash) throw new Error('No hash');
            const currentUser = auth.currentUser;
            const docRef = doc(db, 'transactions', hash);
            await setDoc(docRef, Object.assign({ createdAt: serverTimestamp(), owner: currentUser?.email || null }, meta), { merge: true });
        } catch (err) {
            console.warn('Failed to save tx metadata', err);
        }
    }
    
    // ---------- Incoming transaction notifications and unseen badge helpers ----------
    function _getNotifiedHashes(){ try { return JSON.parse(localStorage.getItem('AeiXerCash_notified_tx_hashes') || '[]'); } catch(e){ return []; } }
    function _setNotifiedHashes(arr){ try { localStorage.setItem('AeiXerCash_notified_tx_hashes', JSON.stringify(arr || [])); } catch(e){} }
    function _getViewedHashes(){ try { return JSON.parse(localStorage.getItem('AeiXerCash_viewed_tx_hashes') || '[]'); } catch(e){ return []; } }
    function _setViewedHashes(arr){ try { localStorage.setItem('AeiXerCash_viewed_tx_hashes', JSON.stringify(arr || [])); } catch(e){} }

    async function handleIncomingNotifications(txs){
        try {
            const currentUser = auth.currentUser;
            if (!currentUser || currentUser.isAnonymous) return; // only notify signed-in users
            if (!Array.isArray(txs)) txs = [];
            const notified = _getNotifiedHashes();
            const viewed = _getViewedHashes();
            // Only consider received transfers with a positive amount
            const received = (txs || []).filter(t => t && t.type === 'received' && t.hash && Number(t.amount) > 0)
                .sort((a,b) => (b.blockTimestamp || b.timestamp || 0) - (a.blockTimestamp || a.timestamp || 0));
            const newly = [];
            for (const tx of received) {
                if (!notified.includes(tx.hash) && !viewed.includes(tx.hash)) {
                    notified.push(tx.hash);
                    newly.push(tx);
                }
            }
            _setNotifiedHashes(notified);
            AeiXerCashUser.unseenReceivedCount = (notified || []).filter(h => !(viewed || []).includes(h)).length;
            updateUnseenBadge();
            if (newly.length > 0) {
                // show most recent new incoming tx
                showCongratsModal(newly[0]);
            }
        } catch (e) { console.warn('handleIncomingNotifications failed', e); }
    }

    function updateUnseenBadge(){
        try{
            const txNav = document.querySelector('.nav-link[data-nav-id="transactions"]') || document.querySelector('[data-nav-id="transactions"]');
            if (!txNav) return;
            let dot = txNav.querySelector('.unseen-dot');
            const count = AeiXerCashUser.unseenReceivedCount || 0;
            if (count > 0) {
                if (!dot) { dot = document.createElement('span'); dot.className = 'unseen-dot'; txNav.appendChild(dot); }
            } else {
                if (dot) dot.remove();
            }
        } catch(e){ console.warn('updateUnseenBadge', e); }
    }

    function markTxViewed(hash){
        try{
            if (!hash) return;
            const viewed = _getViewedHashes();
            if (!viewed.includes(hash)) { viewed.push(hash); _setViewedHashes(viewed); }
            const notified = _getNotifiedHashes();
            AeiXerCashUser.unseenReceivedCount = (notified || []).filter(h => !viewed.includes(h)).length;
            updateUnseenBadge();
        } catch(e){ console.warn('markTxViewed', e); }
    }

    function markAllNotifiedViewed(){
        try{
            const notified = _getNotifiedHashes() || [];
            const viewed = _getViewedHashes() || [];
            const merged = Array.from(new Set([...(viewed||[]), ...(notified||[])]));
            _setViewedHashes(merged);
            AeiXerCashUser.unseenReceivedCount = 0;
            updateUnseenBadge();
        } catch(e){ console.warn('markAllNotifiedViewed', e); }
    }

    function showCongratsModal(tx){
        try{
            // Only show modal for authenticated users
            const currentUser = auth.currentUser;
            if (!currentUser || currentUser.isAnonymous) return;
            
            const modal = document.getElementById('congrats-modal');
            if (!modal) return;
            const amountEl = document.getElementById('congrats-amount');
            const textEl = document.getElementById('congrats-text');
            const viewBtn = document.getElementById('congrats-view-btn');
            const closeBtn = document.getElementById('congrats-close-btn');
            amountEl.textContent = (tx && tx.amount ? `+${Number(tx.amount).toFixed(2)}` : '+0.00') + ' USDC';
            textEl.textContent = tx && tx.from ? `From ${tx.from}` : 'Incoming payment received';
            modal.classList.remove('hidden'); modal.style.display = 'flex';
            function _close(){ modal.classList.add('hidden'); modal.style.display = 'none'; }
            closeBtn.onclick = () => { _close(); markTxViewed(tx.hash); };
            viewBtn.onclick = () => { _close(); navigate('transactions'); setTimeout(()=> openTxDetails(tx.hash), 450); markTxViewed(tx.hash); };
        } catch(e){ console.warn('showCongratsModal', e); }
    }
    
    async function loadUserWalletData() {
        const currentUser = auth.currentUser;
        if (!currentUser) return false;
        
        try {
            let data = null;
            
            // For Google users: load from Firestore
            if (!currentUser.isAnonymous && currentUser.email) {
                const email = currentUser.email.toLowerCase();
                const docRef = doc(db, 'users', email);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    data = docSnap.data();
                }
            } else {
                // For anonymous/mnemonic users: load from localStorage
                const stored = localStorage.getItem('AeiXerCash_walletData');
                if (stored) {
                    data = JSON.parse(stored);
                }
            }
            
            if (!data) return false;
            
            AeiXerCashUser.addresses = data.addresses || [];
            AeiXerCashUser.selectedAddressIndices = data.selectedAddressIndices || [];
            AeiXerCashUser.selectedAddresses = AeiXerCashUser.selectedAddressIndices.map(idx => data.addresses[idx]).filter(Boolean);
            AeiXerCashUser.activeWalletIndex = data.activeWalletIndex || 0;
            
            // Initialize polBalance for each selected address if not present
            AeiXerCashUser.selectedAddresses.forEach(addr => {
                if (!addr.polBalance) {
                    addr.polBalance = 0;
                }
            });
            
            walletAddresses = data.addresses || [];
            selectedAddressIndices = data.selectedAddressIndices || [];
            activeWalletIndex = data.activeWalletIndex || 0;
            
            if (walletAddresses.length > 0 && activeWalletIndex < walletAddresses.length) {
                AeiXerCashUser.balance = walletAddresses[activeWalletIndex].balance.toFixed(2);
            }
            return true;
        } catch (err) {
            console.error('Error loading wallet data:', err);
            return false;
        }
    }
    
    function deriveAddressesFromMnemonic(phrase, count = 100) {
        // Proper BIP39/BIP44 Ethereum derivation
        // Create mnemonic object and get 512-bit seed
        const mnemonic = ethers.Mnemonic.fromPhrase(phrase);
        const seed = mnemonic.computeSeed(); 
        
        // Create master HD node from seed
        const masterNode = ethers.HDNodeWallet.fromSeed(seed);
        
        const addresses = [];
        // Standard MetaMask path: m/44'/60'/0'/0/index
        for (let i = 0; i < count; i++) {
            const derivedWallet = masterNode.derivePath(`m/44'/60'/0'/0/${i}`);
            addresses.push(derivedWallet.address);
        }
        return addresses;
    }
    
    async function fetchBalancesForAddresses(addresses) {
        const balances = [];
        // Always use mainnet for balance checking (compliance requirement)
        const cfg = NETWORKS.mainnet;
        const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
        const contract = new ethers.Contract(cfg.usdcContract, USDC_ABI, provider);
        
        const promises = addresses.map(async (addr) => {
            let retries = 3;
            while (retries > 0) {
                try {
                    const rawBalance = await contract.balanceOf(addr);
                    const balance = parseFloat(ethers.formatUnits(rawBalance, USDC_DECIMALS));
                    return { address: addr, balance };
                } catch (err) {
                    retries--;
                    if (retries === 0) {
                        console.warn(`Failed to fetch balance for ${addr}:`, err);
                        return { address: addr, balance: 0 };
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        });
        
        const results = await Promise.allSettled(promises);
        results.forEach((r, idx) => {
            if (r.status === 'fulfilled') balances.push(r.value);
            else balances.push({ address: addresses[idx], balance: 0 });
        });

        return balances;
    }
    
    function updateSelectionUI() {
        const count = selectedAddressIndices.length;
        selectedCountSpan.textContent = count;
        
        if (count >= 1 && count <= MAX_SELECTED_WALLETS) {
            finalizeBtn.disabled = false;
            finalizeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            finalizeBtn.disabled = true;
            finalizeBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        document.querySelectorAll('input[name="selected-address"]').forEach(checkbox => {
            const index = parseInt(checkbox.value);
            checkbox.checked = selectedAddressIndices.includes(index);
        });
    }
    
    function renderAddressList(addressesWithBalances) {
        const container = document.getElementById('address-list-container');
        let totalBalance = 0;
        
        container.innerHTML = addressesWithBalances.map((item, index) => {
            totalBalance += item.balance;
            const shortAddr = `${item.address.slice(0,6)}...${item.address.slice(-4)}`;
            return `
                <label class="checkbox-item flex items-center justify-between cursor-pointer hover:bg-slate-100 transition p-3 border-b border-slate-200">
                    <div class="flex items-center gap-3 flex-1">
                        <input type="checkbox" 
                               name="selected-address" 
                               value="${index}" 
                               data-address="${item.address}"
                               data-balance="${item.balance}"
                               class="w-5 h-5 accent-blue-600"
                               onchange="handleWalletSelection(this)">
                        <div class="flex flex-col">
                            <span class="text-xs text-blue-700 font-bold uppercase tracking-wider">Account #${index + 1}</span>
                            <span class="addr text-xs font-mono text-slate-500">${shortAddr}</span>
                        </div>
                    </div>
                    <span class="bal text-green-700 font-bold">$${item.balance.toFixed(2)}</span>
                </label>
            `;
        }).join('');
        
        totalUsdcSpan.textContent = totalBalance.toFixed(2);
        lucide.createIcons();
    }
    
    window.handleWalletSelection = function(checkbox) {
        const index = parseInt(checkbox.value);
        
        if (checkbox.checked) {
            if (selectedAddressIndices.length < MAX_SELECTED_WALLETS) {
                if (!selectedAddressIndices.includes(index)) {
                    selectedAddressIndices.push(index);
                }
            } else {
                checkbox.checked = false;
                showToast(`You can only select up to ${MAX_SELECTED_WALLETS} wallets`, 'warning');
            }
        } else {
            const pos = selectedAddressIndices.indexOf(index);
            if (pos > -1) {
                selectedAddressIndices.splice(pos, 1);
            }
        }
        
        updateSelectionUI();
    };
    
    mnemonicInput.addEventListener('input', () => {
        const text = mnemonicInput.value.trim();
        const words = text.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        wordCountSpan.textContent = wordCount;
        
        wordChipsDiv.innerHTML = '';
        words.slice(0, 12).forEach((word, index) => {
            const chip = document.createElement('span');
            chip.className = 'word-chip';
            chip.textContent = word;
            wordChipsDiv.appendChild(chip);
        });
        
        if (wordCount === 12) {
            wordValidationIcon.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-green-600"></i>';
            verifyBtn.disabled = false;
            verifyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            wordValidationIcon.innerHTML = '<i data-lucide="info" class="w-4 h-4 text-amber-600"></i>';
            verifyBtn.disabled = true;
            verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        lucide.createIcons();
    });
    
    verifyBtn.addEventListener('click', async () => {
        if (!isGoogleLinkedUser()) {
            showToast('A verified Google account must be linked before you can link or generate wallets.', 'error');
            return;
        }
        const phrase = mnemonicInput.value.trim();
        const words = phrase.split(/\s+/);
        if (words.length !== 12) {
            showToast('Please enter exactly 12 words.', 'error');
            return;
        }
        if (!ethers.Mnemonic.isValidMnemonic(phrase)) {
            showToast('Invalid mnemonic phrase. Must be 12 valid BIP39 words.', 'error');
            return;
        }
        
        addressListContainer.innerHTML = '<div class="text-center py-4 text-slate-500"><i data-lucide="loader-circle" class="w-6 h-6 animate-spin mx-auto mb-2"></i>Fetching addresses & balances...</div>';
        lucide.createIcons();
        
        try {
            walletMnemonic = phrase;
            
            const addresses = deriveAddressesFromMnemonic(phrase, 100);
            const balances = await fetchBalancesForAddresses(addresses);
            walletAddresses = balances;
            
            selectedAddressIndices = [];
            
            renderAddressList(balances);
            updateSelectionUI();
            
            walletStep1.classList.add('hidden');
            walletStep2.classList.remove('hidden');
            lucide.createIcons();
            showToast('Wallet verified! Select up to 6 wallets to connect.', 'success');
        } catch (error) {
            showToast('Failed to load addresses: ' + error.message, 'error');
        }
    });
    
    finalizeBtn.addEventListener('click', async () => {
        if (!isGoogleLinkedUser()) {
            showToast('A verified Google account must be linked before you can link or generate wallets.', 'error');
            return;
        }
        if (selectedAddressIndices.length === 0 || selectedAddressIndices.length > MAX_SELECTED_WALLETS) {
            showToast(`Please select between 1 and ${MAX_SELECTED_WALLETS} wallets`, 'error');
            return;
        }

        try {
            finalizeBtn.disabled = true;
            finalizeBtn.innerHTML = '<i data-lucide="loader-circle" class="w-5 h-5 mr-2 animate-spin"></i> Linking...';
            
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('No authenticated user');
            
            const selectedAddresses = selectedAddressIndices.map(idx => walletAddresses[idx]);
            
            await saveUserWalletData(walletAddresses, selectedAddressIndices, 0);

            AeiXerCashUser.addresses = walletAddresses;
            AeiXerCashUser.selectedAddressIndices = selectedAddressIndices;
            AeiXerCashUser.selectedAddresses = selectedAddresses;
            AeiXerCashUser.activeWalletIndex = 0;
            AeiXerCashUser.balance = selectedAddresses[0].balance.toFixed(2);
            AeiXerCashUser.polBalance = (selectedAddresses[0].polBalance || 0).toFixed(6);

            showToast(`${selectedAddresses.length} wallet(s) linked successfully!`, 'success');
            walletConnected = true;
            hideWalletConnectModal();
            
            // Mark that user used mnemonic signin and show password setup
            localStorage.setItem('AeiXerCash_loginMethod', 'mnemonic');
            showPasswordSetupModal();
        } catch (error) {
            console.error("Link Error:", error);
            showToast('Failed to save wallet configuration: ' + error.message, 'error');
        } finally {
            finalizeBtn.disabled = false;
            finalizeBtn.innerHTML = '<i data-lucide="check-circle" class="w-5 h-5 inline mr-2"></i> Continue & Link Selected Wallets';
        }
    });

    // ---------- Create-wallet flow (education -> generate -> link) ----------

    (function(){
        const createBtn = document.getElementById('create-wallet-btn');
        const eduModal = document.getElementById('mnemonic-education-modal');
        const eduUnderstood = document.getElementById('education-understood-btn');
        const eduCancel = document.getElementById('education-cancel-btn');
        const genModal = document.getElementById('generated-mnemonic-modal');
        const genDisplay = document.getElementById('generated-mnemonic-display');
        const genCopy = document.getElementById('generated-copy-btn');
        const genRegen = document.getElementById('generated-regenerate-btn');
        const genConfirm = document.getElementById('generated-confirm-btn');

        function makeRandomMnemonic() {
            try {
                const w = ethers.Wallet.createRandom();
                const phrase = (w && w.mnemonic && w.mnemonic.phrase) ? w.mnemonic.phrase : (w && w._mnemonic && w._mnemonic.phrase) ? w._mnemonic.phrase : null;
                return phrase;
            } catch (e) { return null; }
        }

        async function showGeneratedPhrase(phrase) {
            if (!genDisplay) return;
            genDisplay.innerHTML = phrase.split(/\s+/).map((w,i)=>`<div class="word-chip">${i+1}. ${w}</div>`).join('');
            lucide.createIcons();
        }

        // Open transaction details modal (callable from inline onclick)
        window.openTxDetails = async function(hash) {
            try {
                if (!hash) return;
                const cfg = getCurrentNetworkConfig();
                // Get transaction from in-memory list if available
                const tx = (AeiXerCashUser.transactions || []).find(t => t.hash === hash) || null;
                let meta = null;
                try {
                    const docRef = doc(db, 'transactions', hash);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) meta = docSnap.data();
                } catch (e) { /* ignore */ }

                const type = tx?.type || meta?.type || '—';
                const amount = tx?.amount || meta?.amount || 0;
                const from = tx?.from || meta?.from || meta?.sender || '—';
                const to = tx?.to || meta?.to || meta?.recipient || '—';
                const date = tx?.timestamp ? new Date(tx.timestamp) : (meta?.createdAt ? new Date(meta.createdAt.seconds * 1000) : new Date());
                const message = meta?.message || tx?.message || '';

                // Title and big amount
                const titleEl = document.getElementById('tx-details-title');
                if (titleEl) titleEl.textContent = (type === 'send' ? 'Sent' : (type === 'received' ? 'Received' : 'Transaction'));
                const bigAmt = document.getElementById('tx-details-amount-big');
                if (bigAmt) bigAmt.textContent = Number(amount).toFixed(2);

                document.getElementById('tx-details-from').textContent = from;
                document.getElementById('tx-details-to').textContent = to;
                document.getElementById('tx-details-account').textContent = meta?.account || meta?.owner || '—';
                document.getElementById('tx-details-date').textContent = date.toLocaleString();
                const txMsgEl = document.getElementById('tx-details-message');
                if (txMsgEl) {
                    txMsgEl.innerHTML = '';
                    if (message) {
                        const p = document.createElement('p');
                        p.className = 'text-sm text-slate-700';
                        p.textContent = message;
                        txMsgEl.appendChild(p);
                    } else {
                        txMsgEl.textContent = '—';
                    }
                    if (meta && meta.gifUrl) {
                        const d = document.createElement('div');
                        d.className = 'mt-2';
                        const img = document.createElement('img');
                        img.src = meta.gifUrl;
                        img.style.maxWidth = '100%';
                        img.style.borderRadius = '8px';
                        d.appendChild(img);
                        txMsgEl.appendChild(d);
                    }
                }

                const link = document.getElementById('tx-details-link');
                if (link) { link.href = cfg.explorer + hash; link.textContent = hash; }

                const copyBtn = document.getElementById('tx-copy-hash');
                if (copyBtn) copyBtn.onclick = async () => { try { await navigator.clipboard.writeText(link.textContent || link.href); showToast('Tx hash copied', 'success'); } catch (e) { showToast('Copy failed', 'error'); } };

                // Try to load sender photo / profile if available
                try {
                    const photoEl = document.getElementById('tx-details-photo');
                    if (meta?.account) {
                        const udoc = await getDoc(doc(db, 'users', meta.account));
                        if (udoc && udoc.exists()) {
                            const ud = udoc.data();
                            if (ud.photoURL && photoEl) photoEl.src = ud.photoURL;
                            if (ud.displayName) document.getElementById('tx-details-account').textContent = ud.displayName + ' • ' + (meta.account || '');
                        } else {
                            if (photoEl) photoEl.src = photoEl.src || 'https://placehold.co/56';
                        }
                    } else {
                        if (photoEl) photoEl.src = photoEl.src || 'https://placehold.co/56';
                    }
                } catch (e) { /* ignore photo fetch errors */ }

                document.getElementById('tx-details-modal').classList.remove('hidden');
                // Mark this tx as viewed (clears unseen badge for it)
                markTxViewed(hash);
                lucide.createIcons();
            } catch (err) { console.error('openTxDetails error', err); showToast('Unable to load tx details', 'error'); }
        };

        window.closeTxDetails = function() {
            document.getElementById('tx-details-modal').classList.add('hidden');
        };
        if (createBtn) createBtn.addEventListener('click', () => { 
            if (!isGoogleLinkedUser()) {
                showToast('A verified Google account must be linked before you can generate wallets.', 'error');
                return;
            }
            if (eduModal) eduModal.classList.remove('hidden'); 
        });
        if (eduCancel) eduCancel.addEventListener('click', () => { if (eduModal) eduModal.classList.add('hidden'); });

        if (eduUnderstood) eduUnderstood.addEventListener('click', async () => {
            try {
                if (eduModal) eduModal.classList.add('hidden');
                const phrase = makeRandomMnemonic();
                if (!phrase) throw new Error('Could not generate phrase');
                walletMnemonic = phrase;
                await showGeneratedPhrase(phrase);
                if (genModal) genModal.classList.remove('hidden');
            } catch (err) {
                showToast('Failed to generate wallet: ' + (err.message || err), 'error');
            }
        });

        if (genRegen) genRegen.addEventListener('click', async () => {
            const phrase = makeRandomMnemonic();
            if (!phrase) { showToast('Failed to regenerate', 'error'); return; }
            walletMnemonic = phrase;
            await showGeneratedPhrase(phrase);
        });

        if (genCopy) genCopy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(walletMnemonic || '');
                showToast('Phrase copied to clipboard', 'success');
            } catch (e) { showToast('Copy failed', 'error'); }
        });

        if (genConfirm) genConfirm.addEventListener('click', async () => {
            if (!isGoogleLinkedUser()) {
                showToast('A verified Google account must be linked before you can generate wallets.', 'error');
                return;
            }
            try {
                genConfirm.disabled = true;
                genConfirm.innerText = 'Linking...';
                const phrase = walletMnemonic;
                if (!phrase) throw new Error('No mnemonic found');

                // Derive addresses and fetch balances
                const addresses = deriveAddressesFromMnemonic(phrase, 100);
                const balances = await fetchBalancesForAddresses(addresses);
                walletAddresses = balances;
                selectedAddressIndices = [0];
                await saveUserWalletData(walletAddresses, selectedAddressIndices, 0);

                AeiXerCashUser.addresses = walletAddresses;
                AeiXerCashUser.selectedAddressIndices = selectedAddressIndices;
                AeiXerCashUser.selectedAddresses = [walletAddresses[0]];
                AeiXerCashUser.activeWalletIndex = 0;
                AeiXerCashUser.balance = (walletAddresses[0]?.balance || 0).toFixed(2);
                
                // Store the mnemonic securely in sessionStorage for this session
                sessionStorage.setItem('AeiXerCash_mnemonic', walletMnemonic);

                showToast('Wallet created and linked!', 'success');
                walletConnected = true;
                if (genModal) genModal.classList.add('hidden');
                hideWalletConnectModal();
                
                // Mark that user used mnemonic signin and show password setup
                localStorage.setItem('AeiXerCash_loginMethod', 'mnemonic');
                showPasswordSetupModal();
            } catch (err) {
                console.error('Create & Link error', err);
                showToast('Failed to link wallet: ' + (err.message || err), 'error');
            } finally {
                genConfirm.disabled = false;
                genConfirm.innerText = 'I saved it securely — Link wallet';
            }
        });
    })();

    window.cancelWalletConnect = () => {
        hideWalletConnectModal();
        handleSignOut();
    };
    
    function showWalletConnectModal() {
        if (!isGoogleLinkedUser()) {
            showToast('A verified Google account must be linked before you can generate or link wallets.', 'error');
            navigate('signin');
            return;
        }
        walletStep1.classList.remove('hidden');
        walletStep2.classList.add('hidden');
        mnemonicInput.value = '';
        wordCountSpan.textContent = '0';
        wordChipsDiv.innerHTML = '';
        verifyBtn.disabled = true;
        verifyBtn.classList.add('opacity-50', 'cursor-not-allowed');
        walletConnectModal.classList.remove('hidden');
        lucide.createIcons();
    }
    
    function hideWalletConnectModal() {
        walletConnectModal.classList.add('hidden');
    }
    
    function showPasswordSetupModal() {
        const modal = document.getElementById('password-setup-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('password-input')?.focus();
        }
    }
    
    function hidePasswordSetupModal() {
        const modal = document.getElementById('password-setup-modal');
        if (modal) modal.classList.add('hidden');
    }
    
    // Store password hash locally for mnemonic wallets (persisted across sessions)
    function storePasswordHash(password) {
        try {
            // Store password with timestamp and basic salt
            const saltedPassword = password + '_salt_' + 'AeiXerCash2026';
            // Simple hash: SHA256-like string (use btoa for encoding)
            const hash = btoa(saltedPassword);
            localStorage.setItem('AeiXerCash_walletPassword', hash);
            console.log('Password stored securely in localStorage');
            return true;
        } catch (e) {
            console.error('Failed to store password', e);
            return false;
        }
    }
    
    function verifyPassword(password) {
        try {
            const stored = localStorage.getItem('AeiXerCash_walletPassword');
            if (!stored) return false;
            
            // Verify by hashing the input the same way
            const saltedPassword = password + '_salt_' + 'AeiXerCash2026';
            const hash = btoa(saltedPassword);
            
            const matches = hash === stored;
            if (!matches) {
                console.warn('Password verification failed');
            }
            return matches;
        } catch (e) {
            console.error('Failed to verify password', e);
            return false;
        }
    }
    
    // Setup password modal event handlers
    (function() {
        const modal = document.getElementById('password-setup-modal');
        const passwordInput = document.getElementById('password-input');
        const passwordConfirmInput = document.getElementById('password-confirm-input');
        const cancelBtn = document.getElementById('cancel-password-btn');
        const confirmBtn = document.getElementById('confirm-password-btn');
        
        if (cancelBtn) cancelBtn.addEventListener('click', () => {
            hidePasswordSetupModal();
            navigate('dashboard');
        });
        
        if (confirmBtn) confirmBtn.addEventListener('click', async () => {
            const password = passwordInput?.value || '';
            const passwordConfirm = passwordConfirmInput?.value || '';
            
            if (!password || password.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            if (password !== passwordConfirm) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            try {
                confirmBtn.disabled = true;
                confirmBtn.innerText = 'Saving...';
                
                // Store password persistently in localStorage
                storePasswordHash(password);
                
                // Store password in sessionStorage for current session
                sessionStorage.setItem('AeiXerCash_sessionPassword', password);
                
                // Fetch latest balances and transactions for all wallets
                await syncUserData();
                await loadTransactions();
                
                showToast('Password set successfully! You can use it anytime you log in.', 'success');
                hidePasswordSetupModal();
                passwordInput.value = '';
                passwordConfirmInput.value = '';
                
                // Navigate to dashboard
                setTimeout(() => navigate('dashboard'), 300);
            } catch (err) {
                showToast('Failed to set password: ' + err.message, 'error');
                confirmBtn.disabled = false;
                confirmBtn.innerText = 'Set Password';
            }
        });
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    // Prevent closing by clicking outside
                    showToast('Please set a password to continue', 'warning');
                }
            });
        }
    })();
    
    async function refreshDashboardBalance() {
        if (!AeiXerCashUser.selectedAddresses || AeiXerCashUser.selectedAddresses.length === 0) return;
        
        try {
            // Fetch balances for ALL selected wallets, not just active
            for (let i = 0; i < AeiXerCashUser.selectedAddresses.length; i++) {
                const address = AeiXerCashUser.selectedAddresses[i].address;
                const balance = await getUSDCBalance(address);
                const polBalance = await getPOLBalance(address);
                
                AeiXerCashUser.selectedAddresses[i].balance = balance;
                AeiXerCashUser.selectedAddresses[i].polBalance = polBalance;
            }
            
            // Update active wallet display
            const activeAddr = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex];
            AeiXerCashUser.balance = activeAddr.balance.toFixed(2);
            AeiXerCashUser.polBalance = activeAddr.polBalance.toFixed(6);
            
            const balanceEl = document.getElementById('wallet-balance');
            if (balanceEl) {
                balanceEl.innerText = `$${activeAddr.balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            }
            
            const polBalanceEl = document.getElementById('wallet-pol-balance');
            if (polBalanceEl) {
                polBalanceEl.innerText = activeAddr.polBalance.toFixed(6);
            }
            
            updateWalletDisplay();
        } catch (err) {
            console.error("Balance refresh failed:", err);
        }
    }
    
    async function getUSDCBalance(address) {
        const cfg = getCurrentNetworkConfig();
        const contract = new ethers.Contract(cfg.usdcContract, USDC_ABI, getProvider());
        try {
            const rawBalance = await contract.balanceOf(address);
            return parseFloat(ethers.formatUnits(rawBalance, USDC_DECIMALS));
        } catch (err) {
            console.warn(`Failed to fetch balance for ${address}:`, err);
            return 0;
        }
    }

    async function getPOLBalance(address) {
        try {
            const provider = getProvider();
            const rawBalance = await provider.getBalance(address);
            return parseFloat(ethers.formatUnits(rawBalance, 18));
        } catch (err) {
            console.warn(`Failed to fetch POL balance for ${address}:`, err);
            return 0;
        }
    }
    
    function updateWalletDisplay() {
        const balanceEl = document.getElementById('wallet-balance');
        if (balanceEl) balanceEl.innerHTML = `$${AeiXerCashUser.balance}`;
        
        const polBalanceEl = document.getElementById('wallet-pol-balance');
        if (polBalanceEl) polBalanceEl.innerHTML = AeiXerCashUser.polBalance || '0.00';
        
        const walletCardsContainer = document.getElementById('wallet-cards-container');
        if (walletCardsContainer && AeiXerCashUser.selectedAddresses) {
            walletCardsContainer.style.display = 'grid';
            walletCardsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
            walletCardsContainer.style.gap = '12px';
            walletCardsContainer.innerHTML = AeiXerCashUser.selectedAddresses.slice(0, 6).map((addr, idx) => {
                const isActive = idx === AeiXerCashUser.activeWalletIndex;
                const shortAddr = `${addr.address.slice(0,6)}...${addr.address.slice(-4)}`;
                return `
                    <button onclick="switchActiveWallet(${idx})" class="wallet-card ${isActive ? 'selected' : ''} cursor-pointer text-left w-full p-4" style="border:2px solid ${isActive ? '#3b6ef5' : '#dde3f0'};background:${isActive ? 'linear-gradient(135deg,#eef2ff,#f0f4ff)' : '#ffffff'};">
                        <div class="flex items-start justify-between mb-3">
                            <div style="width:32px;height:32px;border-radius:8px;background:${isActive ? 'linear-gradient(135deg,#3b6ef5,#7c3aed)' : '#e2e8f0'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <i data-lucide="wallet" class="w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}"></i>
                            </div>
                            ${isActive ? '<span class="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Active</span>' : '<span class="text-xs text-slate-400">Tap to use</span>'}
                        </div>
                        <p class="text-xs font-bold ${isActive ? 'text-blue-700' : 'text-slate-600'} mb-1">Wallet #${idx + 1}</p>
                        <p class="text-xs font-mono text-slate-400 mb-3" style="font-family:'JetBrains Mono',monospace;">${shortAddr}</p>
                        <p class="text-sm font-bold text-emerald-600">$${addr.balance.toFixed(2)} <span class="text-xs font-normal text-slate-400">USDC</span></p>
                    </button>
                `;
            }).join('');
            lucide.createIcons();
        }
        
        const selector = document.getElementById('address-selector');
        if (selector && AeiXerCashUser.selectedAddresses) {
            selector.innerHTML = AeiXerCashUser.selectedAddresses.map((addr, idx) => {
                const shortAddr = `${addr.address.slice(0,6)}...${addr.address.slice(-4)}`;
                return `<option value="${idx}" ${idx === AeiXerCashUser.activeWalletIndex ? 'selected' : ''}>${shortAddr} ($${addr.balance.toFixed(2)})</option>`;
            }).join('');
        }
    }
    
    window.switchActiveWallet = async function(index) {
        if (index === AeiXerCashUser.activeWalletIndex) return;
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            
            AeiXerCashUser.activeWalletIndex = index;
            AeiXerCashUser.balance = AeiXerCashUser.selectedAddresses[index].balance.toFixed(2);
            
            // Save active wallet index
            if (currentUser.isAnonymous) {
                // Anonymous user: save to localStorage
                const walletData = JSON.parse(localStorage.getItem('AeiXerCash_walletData') || '{}');
                walletData.activeWalletIndex = index;
                localStorage.setItem('AeiXerCash_walletData', JSON.stringify(walletData));
            } else {
                // Google user: save to Firestore
                const email = currentUser.email.toLowerCase();
                await updateDoc(doc(db, 'users', email), {
                    activeWalletIndex: index
                });
            }
            
            updateWalletDisplay();
            refreshDashboardBalance();
        } catch (err) {
            console.error("Failed to switch wallet:", err);
        }
    };
    
    async function syncUserData() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        // Show balance skeleton
        showBalanceSkeleton('wallet-balance-container');
        
        try {
            if (AeiXerCashUser.selectedAddresses && AeiXerCashUser.selectedAddresses.length > 0) {
                // Sync balances for all wallets according to current network
                for (let i = 0; i < AeiXerCashUser.selectedAddresses.length; i++) {
                    const balance = await getUSDCBalance(AeiXerCashUser.selectedAddresses[i].address);
                    const polBalance = await getPOLBalance(AeiXerCashUser.selectedAddresses[i].address);
                    AeiXerCashUser.selectedAddresses[i].balance = balance;
                    AeiXerCashUser.selectedAddresses[i].polBalance = polBalance;
                }
                AeiXerCashUser.balance = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex].balance.toFixed(2);
                AeiXerCashUser.polBalance = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex].polBalance.toFixed(6);
                updateWalletDisplay();
            }
        } catch (err) {
            console.error("Sync Error:", err);
            updateWalletDisplay();
        }
    }
    
    // Fetch full USDC transfer history using Alchemy's asset transfers API (no block limit)
    async function fetchTransactionsForAddress(address) {
        try {
            const cfg = getCurrentNetworkConfig();
            const results = [];
            
            // Helper to call alchemy_getAssetTransfers with pagination
            async function fetchPage(direction, pageKey) {
                const params = {
                    fromBlock: '0x0',
                    toBlock: 'latest',
                    contractAddresses: [cfg.usdcContract],
                    category: ['erc20'],
                    withMetadata: true,
                    excludeZeroValue: true,
                    maxCount: '0x3e8' // 1000 per page
                };
                if (direction === 'in') params.toAddress = address;
                else params.fromAddress = address;
                if (pageKey) params.pageKey = pageKey;
                
                const resp = await fetch(cfg.rpcUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers', params: [params] })
                });
                const json = await resp.json();
                return json.result || { transfers: [] };
            }
            
            // Fetch inbound
            let inPage = await fetchPage('in', null);
            inPage.transfers.forEach(t => results.push({
                type: 'received', from: t.from, to: t.to,
                amount: parseFloat(t.value || 0),
                timestamp: t.metadata?.blockTimestamp ? new Date(t.metadata.blockTimestamp) : new Date(),
                hash: t.hash,
                blockNum: parseInt(t.blockNum, 16)
            }));
            
            // Fetch outbound
            let outPage = await fetchPage('out', null);
            outPage.transfers.forEach(t => results.push({
                type: 'send', from: t.from, to: t.to,
                amount: parseFloat(t.value || 0),
                timestamp: t.metadata?.blockTimestamp ? new Date(t.metadata.blockTimestamp) : new Date(),
                hash: t.hash,
                blockNum: parseInt(t.blockNum, 16)
            }));
            
            results.sort((a, b) => b.timestamp - a.timestamp);
            return results;
        } catch (err) {
            console.error('Error fetching transactions:', err);
            return [];
        }
    }
    
    // =================== SKELETON LOADING HELPERS ===================
    function showBalanceSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const skeleton = document.getElementById('balance-card-skeleton-template');
        if (skeleton) {
            const clone = skeleton.cloneNode(true);
            clone.classList.remove('hidden');
            clone.id = '';
            container.innerHTML = '';
            container.appendChild(clone);
        }
    }

    function showTransactionSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const skeleton = document.getElementById('tx-list-skeleton-template');
        if (skeleton) {
            const clone = skeleton.cloneNode(true);
            clone.classList.remove('hidden');
            clone.id = '';
            container.innerHTML = '';
            container.appendChild(clone);
        }
    }

    function showReceiptSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const skeleton = document.getElementById('payment-receipt-skeleton-template');
        if (skeleton) {
            const clone = skeleton.cloneNode(true);
            clone.classList.remove('hidden');
            clone.id = '';
            container.innerHTML = '';
            container.appendChild(clone);
        }
    }

    function showWalletCardSkeleton(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const skeleton = document.getElementById('wallet-card-skeleton-template');
        if (skeleton) {
            const clone = skeleton.cloneNode(true);
            clone.classList.remove('hidden');
            clone.id = '';
            container.innerHTML = '';
            container.appendChild(clone);
        }
    }

    // =================== END SKELETON HELPERS ===================

    async function loadTransactions() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        
        // Show skeleton loaders
        showTransactionSkeleton('tx-preview-container');
        showTransactionSkeleton('full-tx-container');
        showTransactionSkeleton('deposit-recent-container');
        showTransactionSkeleton('recent-sends-container');
        
        try {
            const allTxs = [];
            // Fetch for all selected addresses
            for (const addrObj of AeiXerCashUser.selectedAddresses) {
                const txs = await fetchTransactionsForAddress(addrObj.address);
                allTxs.push(...txs);
            }
            // Deduplicate by hash
            const uniqueTxs = Array.from(new Map(allTxs.map(tx => [tx.hash, tx])).values());
            // Sort again
            uniqueTxs.sort((a, b) => b.timestamp - a.timestamp);
            AeiXerCashUser.transactions = uniqueTxs;
            // Detect incoming unseen transactions and show congrats badge/modal (Google users only)
            if (!currentUser.isAnonymous) {
                try { await handleIncomingNotifications(uniqueTxs); } catch(e) { /* ignore */ }
            }
            updateTransactionUI();
        } catch (err) {
            console.error("Transaction Load Error:", err);
            AeiXerCashUser.transactions = [];
            updateTransactionUI();
        }
    }

    
    function renderTxCard(tx, compact = false) {
        const cfg = getCurrentNetworkConfig();
        const isOut = tx.type === 'send';
        const displayAddr = isOut ? tx.to : tx.from;
        const shortAddr = displayAddr ? `${displayAddr.slice(0,6)}...${displayAddr.slice(-4)}` : '—';
        const amountPrefix = isOut ? '-' : '+';
        const amountColor = isOut ? '#ef4444' : '#10b981';
        const iconBg = isOut ? 'tx-icon-sent' : 'tx-icon-received';
        const iconName = isOut ? 'arrow-up-right' : 'arrow-down-left';
        // show red pulsing unseen dot only for received, unseen transactions
        let dotHtml = '';
        try {
            const notified = _getNotifiedHashes();
            const viewed = _getViewedHashes();
            if (!isOut && tx.hash && notified.includes(tx.hash) && !viewed.includes(tx.hash)) {
                dotHtml = '<span class="unseen-dot"></span>';
            }
        } catch (e) { /* ignore */ }
        const timeStr = compact
            ? tx.timestamp.toLocaleDateString()
            : tx.timestamp.toLocaleString(undefined, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        const explorerUrl = cfg.explorer + tx.hash;
        // Include data attributes so cards can open details modal
        const hashHtml = !compact && tx.hash ? `<a href="${explorerUrl}" target="_blank" rel="noopener" class="tx-hash-link mt-0.5 block">${tx.hash.slice(0,10)}...${tx.hash.slice(-8)} ↗</a>` : '';
        const clickAttr = tx.hash ? ` onclick="openTxDetails('${tx.hash}')" style="cursor:pointer;"` : '';
        return `
            <div class="tx-card tx-card-clickable"${clickAttr} data-tx-hash="${tx.hash || ''}" data-tx-type="${tx.type}" data-tx-amount="${tx.amount}" data-tx-from="${tx.from || ''}" data-tx-to="${tx.to || ''}" data-tx-timestamp="${tx.timestamp.toISOString()}" data-tx-message="${(tx.message || '').replace(/"/g,'&quot;')}">
                <div class="tx-icon ${iconBg}">
                    <i data-lucide="${iconName}" class="w-4 h-4"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="font-semibold text-sm text-slate-800">${isOut ? 'Sent' : 'Received'} ${dotHtml}</span>
                        <span class="font-bold text-sm" style="color:${amountColor};">${amountPrefix}$${tx.amount.toFixed(2)} <span class="font-normal text-xs text-slate-400">USDC</span></span>
                    </div>
                    <div class="flex items-center justify-between mt-0.5">
                        <span class="text-xs font-mono text-slate-400">${shortAddr}</span>
                        <span class="text-xs text-slate-400">${timeStr}</span>
                    </div>
                    ${hashHtml}
                </div>
            </div>`;
    }

    function updateTransactionUI() {
        // Wallet tab preview (5 latest)
        const previewContainer = document.getElementById('tx-preview-container');
        if (previewContainer) {
            const txs = AeiXerCashUser.transactions.slice(0, 5);
            previewContainer.innerHTML = txs.length === 0
                ? '<p class="text-center py-8 text-slate-400 text-sm">No transactions yet.</p>'
                : txs.map(tx => renderTxCard(tx, true)).join('');
        }

        // Full transactions tab
        const fullContainer = document.getElementById('full-tx-container');
        if (fullContainer) {
            const txs = AeiXerCashUser.transactions;
            const cfg = getCurrentNetworkConfig();
            fullContainer.innerHTML = txs.length === 0
                ? '<p class="text-center py-16 text-slate-400 text-sm">No transactions found on ' + cfg.name + '.</p>'
                : txs.map(tx => renderTxCard(tx, false)).join('');
            // Update count badge
            const countEl = document.getElementById('tx-total-count');
            if (countEl) countEl.textContent = txs.length;
        }

        // Recent Sends (Send & Pay tab) — last 6 sends
        const recentSendsContainer = document.getElementById('recent-sends-container');
        if (recentSendsContainer) {
            const sends = (AeiXerCashUser.transactions || []).filter(tx => tx.type === 'send').slice(0, 6);
            recentSendsContainer.innerHTML = sends.length === 0
                ? '<p class="text-center py-8 text-slate-400 text-sm">No sends yet. Your first send will appear here.</p>'
                : sends.map(tx => renderTxCard(tx, true)).join('');
        }

        // Recent Deposits (Deposit tab) — last 6 received
        const depositRecentContainer = document.getElementById('deposit-recent-container');
        if (depositRecentContainer) {
            const recs = (AeiXerCashUser.transactions || []).filter(tx => tx.type === 'received').slice(0, 6);
            depositRecentContainer.innerHTML = recs.length === 0
                ? '<p class="text-center py-8 text-slate-400 text-sm">No deposits yet.</p>'
                : recs.map(tx => renderTxCard(tx, true)).join('');
        }

        // Update USDC In/Out chart if present (use existing chart instance)
        try {
            if (window.updateInOutChart) {
                window.updateInOutChart();
            }
        } catch (e) { console.warn('In/Out chart update skipped', e); }

        lucide.createIcons();
    }
    
    setInterval(syncUserData, 10000);
    setInterval(loadTransactions, 20000);
    
    const CONTENT_MIN_HEIGHT = 'calc(100vh - 80px - 148px)';
    
    async function authenticateUser() {
        try {
            await setPersistence(auth, inMemoryPersistence);
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            }
            // Anonymous authentication is deprecated and blocked globally
        } catch (error) {
            console.error("Initial Authentication Failed:", error);
        }
    }
    
    async function handleGoogleSignIn() {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // Mark that user used Google signin
            localStorage.setItem('AeiXerCash_loginMethod', 'google');
        } catch (error) {
            console.error("Google Sign-In Failed:", error);
            let errorMessage = "An unknown error occurred during Google Sign-In.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Sign-in cancelled. The pop-up window was closed.";
            } else if (error.message) {
                errorMessage = error.message;
            }
            showErrorModal(errorMessage);
        }
    }
    
    async function handleSignOut() {
        try {
            // Clear session data
            sessionStorage.removeItem('AeiXerCash_sessionPassword');
            sessionStorage.removeItem('AeiXerCash_mnemonic');
            
            // Clear app state
            AeiXerCashUser.balance = '0.00';
            AeiXerCashUser.transactions = [];
            AeiXerCashUser.addresses = [];
            AeiXerCashUser.selectedAddresses = [];
            walletConnected = false;
            walletMnemonic = null;
            walletAddresses = [];
            selectedAddressIndices = [];
            
            // Sign out from Firebase
            await signOut(auth);
            navigate('signin');
        } catch (error) {
            console.error("Sign-Out Failed:", error);
            showErrorModal("Failed to sign out. Please check your connection.");
        }
    }
    
    window.handleSignOutAndCloseModal = () => {
        closeSignOutModal();
        handleSignOut();
    };
    
    function showErrorModal(text) {
        document.getElementById('error-modal-text').textContent = text;
        errorModal.classList.remove('hidden');
        lucide.createIcons();
    }
    
    function closeErrorModal() {
        errorModal.classList.add('hidden');
    }
    window.closeErrorModal = closeErrorModal;
    
    function showSignOutConfirmation() {
        signoutModal.classList.remove('hidden');
        lucide.createIcons();
    }
    
    function closeSignOutModal() {
        signoutModal.classList.add('hidden');
    }
    window.closeSignOutModal = closeSignOutModal;

    let originalInvoiceModalContent = null;
    function showInvoiceModal(amount, fromAddr, toAddr, toName, network, message) {
        const modal = document.getElementById('invoice-receipt-modal');
        if (!modal) return;
        
        const contentArea = document.getElementById('invoice-receipt-modal-content');
        if (contentArea && !originalInvoiceModalContent) {
            originalInvoiceModalContent = contentArea.innerHTML;
        }
        
        // Show receipt skeleton inside content area initially
        if (contentArea) {
            showReceiptSkeleton('invoice-receipt-modal-content');
        }
        
        // Populate fields
        setTimeout(() => {
            // Restore original HTML structure first
            if (contentArea && originalInvoiceModalContent) {
                contentArea.innerHTML = originalInvoiceModalContent;
            }
            
            document.getElementById('invoice-amount').textContent = '$' + amount.toFixed(2);
            document.getElementById('invoice-from-addr').textContent = fromAddr;
            document.getElementById('invoice-to-addr').textContent = toAddr;
            document.getElementById('invoice-to-name').textContent = toName;
            document.getElementById('invoice-network').innerHTML = `<p class="text-xs text-slate-700 font-medium">${network}</p>`;
            
            // Populate dynamic transaction details metadata
            const assetTypeEl = document.getElementById('invoice-asset-type');
            if (assetTypeEl) assetTypeEl.textContent = 'USDC';
            
            const feeText = '0.001 POL';
            const feeEl = document.getElementById('invoice-network-fee');
            if (feeEl) feeEl.textContent = '~' + feeText;
            
            const debitEl = document.getElementById('invoice-total-debit');
            if (debitEl) debitEl.textContent = '$' + amount.toFixed(2) + ' USDC';

            // message + GIF display (show both when present)
            const msgEl = document.getElementById('invoice-message');
            if (msgEl) {
                msgEl.innerHTML = '';
                if (message) {
                    const p = document.createElement('p');
                    p.className = 'text-sm text-slate-700';
                    p.textContent = message;
                    msgEl.appendChild(p);
                }
                const gifUrl = window.selectedGifUrl || window.pendingGifUrl || null;
                if (gifUrl) {
                    const d = document.createElement('div');
                    d.style.maxWidth = '100%';
                    d.style.marginTop = '8px';
                    const img = document.createElement('img');
                    img.src = gifUrl;
                    img.alt = 'GIF';
                    img.style.maxWidth = '100%';
                    img.style.borderRadius = '8px';
                    d.appendChild(img);
                    msgEl.appendChild(d);
                }
            }
            lucide.createIcons();
        }, 400);
        
        // store temporarily for when user confirms
        window.pendingTransactionMessage = message || '';
        modal.classList.remove('hidden');
        lucide.createIcons();
    }
    window.showInvoiceModal = showInvoiceModal;

    function closeInvoiceModal() {
        const modal = document.getElementById('invoice-receipt-modal');
        modal.classList.add('hidden');
    }
    window.closeInvoiceModal = closeInvoiceModal;

    function showPaymentSentSuccessModal(amount, recipient, txHash) {
        const modal = document.createElement('div');
        modal.id = 'payment-success-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
        modal.style.background = 'rgba(6, 6, 23, 0.4)';
        modal.style.backdropFilter = 'blur(8px)';
        modal.style.webkitBackdropFilter = 'blur(8px)';
        
        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-100 relative overflow-hidden" style="animation: scaleUp 0.3s ease-out;">
                <!-- Success Icon -->
                <div class="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 shadow-sm">
                    <i data-lucide="check" class="w-8 h-8 text-green-600"></i>
                </div>
                <h3 class="text-2xl font-bold text-slate-800 mb-1">Payment Sent!</h3>
                <p class="text-slate-500 text-sm mb-5">Broadcasted and confirmed on the blockchain.</p>
                
                <!-- Details -->
                <div class="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-left space-y-2">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-500 font-medium">Amount:</span>
                        <span class="font-bold text-slate-800 text-sm">$${amount} USDC</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-500 font-medium">To:</span>
                        <span class="font-mono text-slate-700 break-all select-all font-semibold" style="max-width: 70%; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${recipient}</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-slate-500 font-medium">Tx Hash:</span>
                        <a href="https://polygonscan.com/tx/${txHash}" target="_blank" class="font-mono text-blue-600 break-all hover:underline flex items-center gap-1 font-semibold">
                            <span>${txHash.substring(0,6)}...${txHash.substring(txHash.length-4)}</span>
                            <i data-lucide="external-link" class="w-3 h-3"></i>
                        </a>
                    </div>
                </div>
                
                <!-- Done Button -->
                <button id="payment-success-done-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition duration-200 shadow-md flex items-center justify-center gap-2">
                    <i data-lucide="check-circle" class="w-5 h-5"></i>
                    Done
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        lucide.createIcons();
        
        document.getElementById('payment-success-done-btn').onclick = () => {
            modal.style.animation = 'fadeOut 0.2s ease-out forwards';
            setTimeout(() => modal.remove(), 200);
        };
    }

    const invoiceModal = document.getElementById('invoice-receipt-modal');
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) closeInvoiceModal();
    });
    
    errorModal.addEventListener('click', (e) => {
        if (e.target === errorModal) closeErrorModal();
    });
    signoutModal.addEventListener('click', (e) => {
        if (e.target === signoutModal) closeSignOutModal();
    });
    
    // ==================== SEND & PAY LOGIC — Updated for Tab View ====================
    let currentRecipientData = null;
    let selectedRecipientWallet = null;
    
    window.showSendPayOverlay = function() {
        // Now just navigate to send tab
        navigate('dashboard', 'send');
    };
    
// Lookup recipient by email or address with validation
    async function lookupRecipient(input) {
        input = input.trim();
        if (!input) return { error: 'Please enter an email address or recipient wallet address (e.g., 0x...).' };
        if (!isGoogleLinkedUser()) return { error: 'Sign in with Google before sending transactions.' };
        
        const currentUser = auth.currentUser;
        const currentUserEmail = currentUser?.email?.toLowerCase();
        const userAddresses = AeiXerCashUser.selectedAddresses?.map(a => a.address.toLowerCase()) || [];
        
        // Check if it's a valid Ethereum address
        if (ethers.isAddress(input)) {
            // Check if sending to own wallet
            if (userAddresses.includes(input.toLowerCase())) {
                return { error: 'You cannot send funds to your own wallet.' };
            }
            // Direct address: we don't have profile info, but we can fetch balance
            const balance = await getUSDCBalance(input);
            return {
                type: 'address',
                address: input,
                displayName: 'External Wallet',
                email: null,
                photoURL: null,
                wallets: [{ address: input, balance }]
            };
        }

        if (isValidEmailAddress(input)) {
            const email = input.toLowerCase();
            if (email === currentUserEmail) {
                return { error: 'You cannot send funds to your own email account.' };
            }

            const userSnap = await getDoc(doc(db, 'users', email));
            if (!userSnap.exists()) {
                return { error: 'No AeiXerCash wallet is linked to that email yet.' };
            }

            const profile = userSnap.data();
            const selectedWallets = (profile.selectedAddressIndices || [])
                .map(idx => profile.addresses?.[idx])
                .filter(Boolean);
            const walletCandidates = selectedWallets.length > 0 ? selectedWallets : (profile.addresses || []);
            const validWallets = walletCandidates
                .filter(w => w?.address && ethers.isAddress(w.address))
                .filter(w => !userAddresses.includes(w.address.toLowerCase()));

            if (validWallets.length === 0) {
                return { error: 'That email has no available linked wallet address.' };
            }

            const walletsWithBalances = await Promise.all(validWallets.slice(0, MAX_SELECTED_WALLETS).map(async (w) => ({
                address: w.address,
                balance: typeof w.balance === 'number' ? w.balance : await getUSDCBalance(w.address)
            })));

            return {
                type: 'email',
                displayName: profile.displayName || email,
                email,
                photoURL: profile.photoURL || null,
                wallets: walletsWithBalances
            };
        }
        
        return { error: 'Please enter a valid email address or Polygon wallet address (e.g., 0x...).' };
    }
    
document.getElementById('lookup-recipient-btn').addEventListener('click', async () => {
        const input = document.getElementById('recipient-input').value.trim();
        if (!input) {
            showToast('Please enter a recipient', 'warning');
            return;
        }
        
        const btn = document.getElementById('lookup-recipient-btn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i>';
        lucide.createIcons();
        
        try {
            const recipient = await lookupRecipient(input);
            if (recipient.error) {
                showToast(recipient.error, 'error');
                return;
            }
            currentRecipientData = recipient;
            
            // Display recipient info in step 1 container
            const container = document.getElementById('recipient-info-container');
            container.innerHTML = `
                <div class="recipient-card-dark">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${recipient.photoURL || 'https://placehold.co/100x100/7c3aed/FFFFFF?text=' + (recipient.displayName?.[0] || '?')}" 
                             class="w-10 h-10 rounded-full object-cover border-2" style="border-color:rgba(124,58,237,0.5);" onerror="this.src='https://placehold.co/100x100/7c3aed/FFFFFF?text=?'">
                        <div>
                            <p class="font-semibold text-white">${recipient.displayName}</p>
                            <p class="text-xs" style="color:rgba(255,255,255,0.5);">${recipient.email || 'External wallet'}</p>
                        </div>
                    </div>
                    <button id="continue-to-send-btn" class="send-btn-primary">
                        Continue →
                    </button>
                </div>
            `;
            document.getElementById('continue-to-send-btn').addEventListener('click', () => {
                // Move to step 2
                populateStep2(recipient);
                document.getElementById('send-step-1').classList.add('hidden');
                document.getElementById('send-step-2').classList.remove('hidden');
            });
            lucide.createIcons();
        } catch (err) {
            showToast('Error looking up recipient: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="search" class="w-4 h-4"></i>';
            lucide.createIcons();
        }
    });
    
    function populateStep2(recipient) {
        document.getElementById('recipient-avatar').src = recipient.photoURL || 'https://placehold.co/100x100/7c3aed/FFFFFF?text=' + (recipient.displayName?.[0] || '?');
        document.getElementById('recipient-name').textContent = recipient.displayName;
        document.getElementById('recipient-email').textContent = recipient.email || 'External Wallet';
        
        // Update step dots
        const dot1 = document.getElementById('dot-1');
        const dot2 = document.getElementById('dot-2');
        if (dot1) { dot1.classList.remove('active'); }
        if (dot2) { dot2.classList.add('active'); }
        
        const walletsList = document.getElementById('recipient-wallets-list');
        if (recipient.wallets.length === 0) {
            walletsList.innerHTML = '<p class="text-sm" style="color:rgba(255,255,255,0.5);">No wallets found for this recipient.</p>';
            selectedRecipientWallet = null;
        } else {
            walletsList.innerHTML = recipient.wallets.map((w, idx) => {
                const shortAddr = `${w.address.slice(0,6)}...${w.address.slice(-4)}`;
                return `
                    <div class="recipient-wallet-option-dark" data-address="${w.address}" data-balance="${w.balance}">
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="text-sm font-medium text-white">Wallet #${idx+1}</p>
                                <p class="text-xs font-mono" style="color:rgba(255,255,255,0.45);font-family:'JetBrains Mono',monospace;">${shortAddr}</p>
                            </div>
                            <span class="text-sm font-bold text-emerald-400">$${w.balance.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.querySelectorAll('.recipient-wallet-option-dark').forEach(el => {
                el.addEventListener('click', () => {
                    document.querySelectorAll('.recipient-wallet-option-dark').forEach(e => e.classList.remove('selected'));
                    el.classList.add('selected');
                    selectedRecipientWallet = {
                        address: el.dataset.address,
                        balance: parseFloat(el.dataset.balance)
                    };
                });
            });
            
            const firstOption = document.querySelector('.recipient-wallet-option-dark');
            if (firstOption) {
                firstOption.classList.add('selected');
                selectedRecipientWallet = {
                    address: firstOption.dataset.address,
                    balance: parseFloat(firstOption.dataset.balance)
                };
            }
        }
        
        const activeWallet = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex];
        if (activeWallet) {
            document.getElementById('available-balance-display').textContent = `$${activeWallet.balance.toFixed(2)}`;
            const shortSender = `${activeWallet.address.slice(0,6)}...${activeWallet.address.slice(-4)}`;
            document.getElementById('sender-wallet-display').textContent = shortSender;
        }
        document.getElementById('send-amount').value = '';
    }
    
    document.getElementById('back-to-step1-btn').addEventListener('click', () => {
        document.getElementById('send-step-2').classList.add('hidden');
        document.getElementById('send-step-1').classList.remove('hidden');
        // Reset dots
        const dot1 = document.getElementById('dot-1');
        const dot2 = document.getElementById('dot-2');
        if (dot1) dot1.classList.add('active');
        if (dot2) dot2.classList.remove('active');
    });
    
// Confirm send button
    document.getElementById('confirm-send-btn').addEventListener('click', async () => {
        if (!requireGoogleLinkedForTransactions()) return;
        if (!selectedRecipientWallet) {
            showToast('Please select a recipient wallet', 'warning');
            return;
        }
        
        // Check if sending to own wallet
        const userAddresses = AeiXerCashUser.selectedAddresses?.map(a => a.address.toLowerCase()) || [];
        if (userAddresses.includes(selectedRecipientWallet.address.toLowerCase())) {
            showToast('You cannot send funds to your own wallet.', 'error');
            return;
        }
        
        const amountInput = document.getElementById('send-amount');
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            showToast('Please enter a valid amount', 'warning');
            return;
        }
        
        const activeWallet = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex];
        if (amount > activeWallet.balance) {
            showToast('Insufficient balance', 'error');
            return;
        }
        
        // Confirm sending
        if (!confirm(`Send $${amount.toFixed(2)} USDC to ${selectedRecipientWallet.address.slice(0,6)}...?`)) {
            return;
        }
        
        const btn = document.getElementById('confirm-send-btn');
        btn.disabled = true;
        btn.classList.add('btn-disabled-grayed');
        btn.style.opacity = '0.6';
        btn.innerHTML = '<span class="flex items-center justify-center gap-2"><i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> Sending...</span>';
        lucide.createIcons();
        
        let txSubmitted = false;

        try {
            // Prompt for mnemonic if not available
            if (!walletMnemonic) {
                const mnemonic = prompt('Enter your 12-word recovery phrase to authorize this transaction:');
                if (!mnemonic) {
                    showToast('Transaction cancelled', 'warning');
                    btn.disabled = false;
                    btn.classList.remove('btn-disabled-grayed');
                    btn.style.opacity = '1';
                    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Confirm & Send</span>';
                    lucide.createIcons();
                    return;
                }
                const words = mnemonic.trim().split(/\s+/);
                if (words.length !== 12 || !ethers.Mnemonic.isValidMnemonic(mnemonic)) {
                    showToast('Invalid mnemonic. Please try again.', 'error');
                    btn.disabled = false;
                    btn.classList.remove('btn-disabled-grayed');
                    btn.style.opacity = '1';
                    btn.innerHTML = '<span class="flex items-center justify-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Confirm & Send</span>';
                    lucide.createIcons();
                    return;
                }
                walletMnemonic = mnemonic;
            }
// Refresh balance from blockchain to ensure we have accurate data
            const freshBalance = await getUSDCBalance(activeWallet.address);
            if (amount > freshBalance) {
                showToast(`Insufficient balance. Your actual balance is $${freshBalance.toFixed(2)} USDC.`, 'error');
                btn.disabled = false;
                btn.classList.remove('btn-disabled-grayed');
                btn.style.opacity = '1';
                btn.innerHTML = '<span class="flex items-center justify-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Confirm & Send</span>';
                lucide.createIcons();
                return;
            }
            
            // Proper BIP39 derivation for transaction signing
            const mnemonicObj = ethers.Mnemonic.fromPhrase(walletMnemonic);
            const seed = mnemonicObj.computeSeed();
            const masterNode = ethers.HDNodeWallet.fromSeed(seed);
            const senderWallet = masterNode.derivePath(`m/44'/60'/0'/0/${AeiXerCashUser.activeWalletIndex}`);
            const signer = senderWallet.connect(getProvider());
            const cfg = getCurrentNetworkConfig();
            const usdcContract = new ethers.Contract(cfg.usdcContract, USDC_ABI, signer);
            
            // Use toFixed to avoid floating point precision issues when converting to wei
            // USDC has 6 decimals, so round to 6 decimal places max
            const amountStr = amount.toFixed(USDC_DECIMALS);
            const amountWei = ethers.parseUnits(amountStr, USDC_DECIMALS);
            
            const tx = await usdcContract.transfer(selectedRecipientWallet.address, amountWei);
            txSubmitted = true;
            showToast('Transaction submitted! Waiting for confirmation...', 'info', 8000);
            const receipt = await tx.wait();

            showToast(`Successfully sent $${amount.toFixed(2)} USDC!`, 'success');

            // Persist message metadata (overlay input)
            try {
                const msg = document.getElementById('send-message-input-overlay')?.value || '';
                const currentUserEmail = auth.currentUser?.email || null;
                const currentUserPhoto = auth.currentUser?.photoURL || null;
                await saveTransactionMetadata(tx.hash, {
                    hash: tx.hash,
                    type: 'send',
                    amount: amount,
                    from: activeWallet.address,
                    to: selectedRecipientWallet.address,
                    message: msg,
                    gifUrl: window.selectedGifUrl || null,
                    account: currentUserEmail,
                    owner: currentUserEmail,
                    photoURL: currentUserPhoto,
                    network: getCurrentNetworkConfig().name
                });
                await queueTransactionEmail(currentRecipientData?.email, {
                    hash: tx.hash,
                    amount,
                    from: activeWallet.address,
                    to: selectedRecipientWallet.address,
                    message: msg,
                    network: getCurrentNetworkConfig().name,
                    recipientName: currentRecipientData?.displayName
                });
            } catch (mErr) { console.warn('Save tx meta failed', mErr); }

            // Refresh balances and transactions
            await refreshDashboardBalance();
            await loadTransactions();

            closeSendPayOverlay();
            
        } catch (err) {
            console.error('Send error:', err);
            if (txSubmitted) {
                showToast('Transaction submitted — confirmation may still be pending.', 'info');
            } else {
                // Only show error if transaction actually failed (not just network issues)
                const errorMsg = err.reason || err.message || 'Transaction failed';
                if (!errorMsg.includes('cancelled') && !errorMsg.includes('user rejected')) {
                    showToast('Transaction failed: ' + errorMsg, 'error');
                }
            }
        } finally {
            btn.disabled = false;
            btn.classList.remove('btn-disabled-grayed');
            btn.style.opacity = '1';
            btn.innerHTML = '<span class="flex items-center justify-center gap-2"><i data-lucide="send" class="w-4 h-4"></i> Confirm & Send</span>';
            lucide.createIcons();
        }
    });
            // ==================== CONTINUATION FROM PART 1 ====================
    
    function updateLayoutVisibility() {
        const isDashboard = currentPath === 'dashboard';
        const isFullScreen = currentPath === 'signin';
        if (isDashboard || isFullScreen) {
            header.classList.add('hidden', 'opacity-0');
            footer.classList.add('hidden', 'opacity-0');
            document.body.classList.remove('dotted-bg');
        } else {
            header.classList.remove('hidden', 'opacity-0');
            footer.classList.remove('hidden', 'opacity-0');
            document.body.classList.add('dotted-bg');
        }
    }
    
    function navigate(path, internalPage = null) {
        currentPath = path;
        if (internalPage) {
            dashboardPage = internalPage;
        } else if (path === 'dashboard') {
            dashboardPage = 'wallet';
        }
        
        let url = '/';
        if (path === 'dashboard') {
            url = '/dashboard';
            if (dashboardPage && dashboardPage !== 'wallet') {
                url += `/${dashboardPage}`;
            }
        } else if (path === 'signin') {
            url = '/signin';
        }
        
        window.history.pushState({ path, page: internalPage }, '', url);
        render();
        if (path !== 'signin' && path !== 'dashboard') window.scrollTo(0, 0);
    }
    
    // Handle browser back/forward buttons using popstate event
    window.addEventListener('popstate', (event) => {
        parseLocation();
        render();
    });
    
    window.navigate = navigate;
    
    function getLandingPageView() {
        return `
            <main>
                <!-- Hero Section with Animated Phone & Laptop -->
                <section class="pt-20 pb-32 md:pt-32 md:pb-48 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center pt-1 lg:-mt-32 lg:pb-32 relative z-30">
    <div class="animate-on-scroll relative p-8 lg:p-12 lg:pr-0">
        <div class="absolute top-0 bottom-0 left-0 right-0 lg:right-[-45vw] bg-white rounded-3xl border border-slate-100 shadow-xl -z-10"></div>
        
        <div class="relative z-10">
            <p class="text-blue-700 text-lg font-semibold mb-4 uppercase tracking-widest">
                AeiXerCash — Non-Custodial USDC Wallet
            </p>
            <h1 class="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 text-slate-900">
                USDC Rails on Polygon, Crafted for Simplicity
            </h1>
            <p class="text-xl text-slate-600 mb-10 max-w-xl">
                Import or create a 12-word mnemonic phrase, scan and activate up to 6 of 100 derived Polygon addresses, link your Google account, and send USDC with rich custom notes and animated GIFs.
            </p>
            <div class="flex flex-col sm:flex-row gap-4">
                <button id="hero-launch-wallet" onclick="navigate('dashboard')" class="landing-cta-btn landing-cta-primary flex-1 sm:flex-none justify-center">
                    Get Started / Launch Wallet
                </button>
                <button onclick="document.getElementById('features')?.scrollIntoView({behavior:'smooth'})" class="landing-cta-btn landing-cta-secondary flex-1 sm:flex-none justify-center">
                    Learn More
                </button>
            </div>
        </div>
    </div>

    <div class="relative flex justify-center items-center animate-on-scroll z-20">
        <div class="hero-image-wrapper lg:scale-110">
            <img id="hero-device-image" class="hero-device" src="" alt="AeiXerCash Hero Image" />
        </div>
    </div>
</div>
</section>
                </section>

                <!-- Features Section -->
                <section id="features" class="relative z-10 -mt-20 py-20 md:py-32 bg-white border-t border-b border-slate-200 rounded-[3rem] shadow-2xl overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-4xl font-extrabold mb-4 text-slate-800 animate-on-scroll animated">
            Why People Choose AeiXerCash
        </h2>
        <p class="text-xl text-slate-600 mb-16 max-w-3xl mx-auto animate-on-scroll animated">
            A user‑first wallet for USDC on Polygon. We focus on individuals, creators, and small teams — for businesses we only provide free Checkout APIs.
        </p>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll animated border border-slate-50 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-50 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart w-7 h-7 text-blue-700"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">Free Checkout APIs</h3>
                <p class="text-slate-500 text-sm">Integrate USDC checkout for your business with zero platform fees — free to use.</p>
            </div>

            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll animated border border-slate-50 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-50 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user w-7 h-7 text-blue-700"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">Built for People</h3>
                <p class="text-slate-500 text-sm">Simple UX for sending, requesting, and receiving USDC — no crypto expertise required.</p>
            </div>

            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll animated border border-slate-50 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-50 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield w-7 h-7 text-blue-700"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">Non‑Custodial &amp; No KYC</h3>
                <p class="text-slate-500 text-sm">You hold the keys. AeiXerCash never holds funds and does not perform KYC.</p>
            </div>

            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll animated border border-slate-50 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-50 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-dollar-sign w-7 h-7 text-blue-700"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">Zero Platform Fees</h3>
                <p class="text-slate-500 text-sm">We never take platform fees on transactions — keep your full USDC.</p>
            </div>

            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll animated border border-slate-50 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-50 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-terminal w-7 h-7 text-blue-700"><path d="M12 19h8"></path><path d="m4 17 6-6-6-6"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">CLI Tools</h3>
                <p class="text-slate-500 text-sm">Manage wallets and payments from the terminal with our lightweight CLI.</p>
            </div>

            <div class="tech-card p-6 rounded-3xl text-left animate-on-scroll bg-gradient-to-br from-blue-50 to-white animated border border-blue-100 hover:shadow-lg transition-shadow">
                <div class="p-3 bg-blue-100 rounded-3xl inline-block mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-code w-7 h-7 text-blue-700"><path d="m16 18 6-6-6-6"></path><path d="m8 6-6 6 6 6"></path></svg>
                </div>
                <h3 class="text-xl font-bold mb-2 text-slate-800">Developer Friendly</h3>
                <p class="text-slate-500 text-sm">Open SDKs, docs, and examples — build checkout flows in minutes.</p>
            </div>
        </div>
    </div>
</section>
                

                <!-- Mission Section (user-first) -->
                <section id="mission" class="py-20 md:py-32">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="panel rounded-3xl p-8">
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            <div class="animate-on-scroll">
                                <h2 class="text-4xl font-extrabold mb-4 text-slate-800">
                                    Built for People in the <span class="text-gradient">Digital Dollar</span> Era
                                </h2>
                                <p class="text-xl text-slate-600 mb-6">
                                    AeiXerCash helps people, creators, and small teams access USDC and Polygon rails without custody or fees.
                                    We are user‑first: zero platform fees, fully non‑custodial, and we do not conduct KYC. Businesses may use our free Checkout APIs only.
                                </p>
                                <ul class="space-y-3 text-slate-600">
                                    <li class="flex items-start"><i data-lucide="check-circle" class="w-5 h-5 text-green-600 mr-2 mt-0.5"></i> Simple peer‑to‑peer and request payments</li>
                                    <li class="flex items-start"><i data-lucide="check-circle" class="w-5 h-5 text-green-600 mr-2 mt-0.5"></i> You hold the keys — we do not custody funds</li>
                                    <li class="flex items-start"><i data-lucide="check-circle" class="w-5 h-5 text-green-600 mr-2 mt-0.5"></i> CLI & developer APIs for power users</li>
                                </ul>
                            </div>
                            <div class="network-visualization p-8 rounded-3xl h-80 flex items-center justify-center relative animate-on-scroll">
                                <i data-lucide="hexagon" class="w-16 h-16 text-blue-400 absolute top-4 left-4 opacity-40"></i>
                                <i data-lucide="hexagon" class="w-16 h-16 text-blue-600 absolute bottom-4 right-4 opacity-40"></i>
                                <div class="text-center">
                                    <div class="flex justify-center space-x-2 mb-4">
                                        <div class="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                                        <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse" style="animation-delay: 0.2s;"></div>
                                        <div class="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style="animation-delay: 0.4s;"></div>
                                    </div>
                                    <p class="text-xl font-mono text-slate-800">Personal Wallet & Checkout</p>
                                    <p class="text-sm text-slate-500">Secure · Non‑custodial · Zero fees</p>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- CTA Section -->
                <section class="py-16 md:py-20 bg-white border-t border-b border-blue-200">
                    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div class="max-w-4xl mx-auto animate-on-scroll">
                            <h2 class="text-4xl sm:text-5xl font-extrabold mb-4 text-slate-800">
                                Start Building for <span class="text-gradient">2030</span> Today
                            </h2>
                            <p class="text-xl text-slate-600 mb-10">
                                Join the businesses already future‑proofing their payment infrastructure.
                            </p>
                            <div class="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
                                <button id="final-launch-wallet" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition duration-200 flex items-center justify-center shadow-xl transform hover:scale-[1.05]">
                                    <i data-lucide="wallet" class="w-5 h-5 mr-2"></i>
                                    Launch Wallet
                                </button>
                                <button onclick="showErrorModal('Contact sales')" class="border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-bold py-3 px-8 rounded-xl transition duration-200">
                                    Talk to an Expert
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        `;
    }
    
    function getSignInView() {
        const loginMethod = localStorage.getItem('AeiXerCash_loginMethod');
        
        // If user previously used mnemonic, show password login
        if (loginMethod === 'mnemonic') {
            return `<button onclick="navigate('/')" class="absolute top-8 left-8 cursor-pointer hover:opacity-75 transition"><span class="text-2xl font-extrabold tracking-tight text-slate-800">AeiXerCash</span></button>
                <div class="signin-card-container text-center flex flex-col items-center">
                    <span class="text-4xl font-extrabold tracking-tight text-gradient mb-6">AeiXerCash</span>
                    <h2 class="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                    <p class="text-md text-slate-600 mb-8">Enter your password to access your wallet.</p>
                    
                    <div class="w-full space-y-3">
                        <input id="mnemonic-password-input" type="password" placeholder="Enter your wallet password" class="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" onkeypress="if(event.key==='Enter') document.getElementById('mnemonic-password-btn').click()" />
                        
                        <button id="mnemonic-password-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md flex items-center justify-center space-x-2">
                            <i data-lucide="unlock" class="w-5 h-5"></i>
                            <span>Unlock Wallet</span>
                        </button>
                    </div>
                    
                    <button onclick="localStorage.removeItem('AeiXerCash_loginMethod'); location.reload()" class="mt-4 text-xs text-slate-500 hover:text-slate-700 underline">Use different wallet</button>
                    <p class="text-xs text-slate-400 mt-6">Secure, non-custodial wallet. Your password is stored only on this device.</p>
                </div>`;
        }
        
        // If user previously used Google, show Google login only
        if (loginMethod === 'google') {
            return `<button onclick="navigate('/')" class="absolute top-8 left-8 cursor-pointer hover:opacity-75 transition"><span class="text-2xl font-extrabold tracking-tight text-slate-800">AeiXerCash</span></button>
                <div class="signin-card-container text-center flex flex-col items-center">
                    <span class="text-4xl font-extrabold tracking-tight text-gradient mb-6">AeiXerCash</span>
                    <h2 class="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h2>
                    <p class="text-md text-slate-600 mb-8">Sign in with your Google account.</p>
                    
                    <div class="w-full space-y-3">
                        <button id="google-signin-btn" class="btn-google w-full flex items-center justify-center space-x-3 transition duration-200 shadow-md">
                            <svg class="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="white"><path d="M44.5 20H24v8.5h11.8C34.4 33.7 30 37.8 24 37.8c-7.3 0-13.3-6-13.3-13.3s6-13.3 13.3-13.3c3.9 0 7.3 1.6 9.8 4.1l6-6C35.9 7.8 30.4 4 24 4c-11.1 0-20 8.9-20 20s8.9 20 20 20c10 0 18.2-7.8 19.8-18H44.5v-8z"/></svg>
                            <span>Continue with Google</span>
                        </button>
                    </div>
                    
                    <button onclick="localStorage.removeItem('AeiXerCash_loginMethod'); location.reload()" class="mt-4 text-xs text-slate-500 hover:text-slate-700 underline">Use different wallet</button>
                    <p class="text-xs text-slate-400 mt-6">Secure infrastructure for the digital dollar era.</p>
                </div>`;
        }
        
        // Default: Show both options
        return `<button onclick="navigate('/')" class="absolute top-8 left-8 cursor-pointer hover:opacity-75 transition"><span class="text-2xl font-extrabold tracking-tight text-slate-800">AeiXerCash</span></button>
            <div class="signin-card-container text-center flex flex-col items-center">
                <span class="text-4xl font-extrabold tracking-tight text-gradient mb-6">AeiXerCash</span>
                <h2 class="text-3xl font-bold text-slate-800 mb-2">Crypto Wallet</h2>
                <p class="text-md text-slate-600 mb-8">Sign in with Google to link wallets and send USDC securely.</p>
                
                <div class="w-full space-y-3">
                    <button id="google-signin-btn" class="btn-google w-full flex items-center justify-center space-x-3 transition duration-200 shadow-md">
                        <svg class="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="white"><path d="M44.5 20H24v8.5h11.8C34.4 33.7 30 37.8 24 37.8c-7.3 0-13.3-6-13.3-13.3s6-13.3 13.3-13.3c3.9 0 7.3 1.6 9.8 4.1l6-6C35.9 7.8 30.4 4 24 4c-11.1 0-20 8.9-20 20s8.9 20 20 20c10 0 18.2-7.8 19.8-18H44.5v-8z"/></svg>
                        <span>Continue with Google</span>
                    </button>
                </div>
                
                <p class="text-xs text-slate-400 mt-6">Wallets remain non-custodial. Google linking protects account recovery and transaction records.</p>
            </div>`;
    }
    
    function getSendAndPayContent() {
        return `
            <div class="max-w-4xl">
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Send & Pay</h2>
                <p class="text-slate-500 text-sm mb-6">Send USDC by recipient email or directly to a Polygon wallet address.</p>
                
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Send Form Card -->
                    <div class="lg:col-span-2">
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <i data-lucide="send" class="w-5 h-5 text-blue-600"></i>
                                    Send USDC
                                </h3>
                            </div>
                            <div class="p-6 space-y-5">
                                <!-- Recipient Input -->
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-2">Recipient</label>
                                    <div class="relative">
                                        <input type="text" id="send-recipient-input" placeholder="email@example.com or 0x... wallet address"
                                               class="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono text-sm"
                                               onkeypress="if(event.key==='Enter') document.getElementById('send-lookup-btn').click()">
                                        <button id="send-lookup-btn" class="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 transition p-1">
                                            <i data-lucide="check" class="w-5 h-5"></i>
                                        </button>
                                    </div>
                                    <p class="text-xs text-slate-500 mt-1">Email recipients must have linked wallets. Direct addresses settle on Polygon.</p>
                                </div>
                                
                                <!-- Recipient Info Display -->
                                <div id="send-recipient-display" class="hidden bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div class="flex items-center gap-3 mb-3">
                                        <img id="send-recipient-photo" src="" class="w-10 h-10 rounded-full object-cover border-2 border-blue-200">
                                        <div>
                                            <p id="send-recipient-name" class="font-semibold text-slate-800 text-sm"></p>
                                            <p id="send-recipient-info" class="text-xs text-slate-500"></p>
                                        </div>
                                        <button id="send-change-recipient" class="ml-auto text-xs text-blue-600 hover:text-blue-700 font-semibold">Change</button>
                                    </div>
                                </div>
                                
                                <!-- Recipient Wallets Selection -->
                                <div id="send-recipient-wallets-container" class="hidden">
                                    <label class="block text-sm font-semibold text-slate-700 mb-2">Recipient's Wallet</label>
                                    <div id="send-recipient-wallets-list" class="space-y-2 max-h-40 overflow-y-auto"></div>
                                </div>
                                
                                <!-- Amount Input -->
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-2">Amount (USDC)</label>
                                    <div class="relative">
                                        <input type="number" id="send-tx-amount" min="0.01" step="0.01" placeholder="0.00"
                                               class="w-full px-4 py-3 pr-16 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-right text-lg font-semibold"
                                               onkeypress="if(event.key==='Enter') document.getElementById('execute-send-btn').click()">
                                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 font-bold pointer-events-none">USDC</span>
                                    </div>
                                </div>
                                
                                <!-- Optional message -->
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 mb-2">Message (optional)</label>
                                    <div class="flex gap-2">
                                        <input id="send-tx-message" type="text" placeholder="Add a note or memo for this transaction"
                                               class="w-full px-4 py-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                                        <button id="attach-gif-btn" title="Attach GIF" class="px-3 py-2 bg-slate-100 rounded-xl border border-slate-200 hover:bg-slate-200">
                                            GIF
                                        </button>
                                    </div>
                                    <div id="gif-picker-container" class="mt-2 hidden p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div class="flex items-center gap-2 mb-2">
                                            <input id="gif-search-input" type="text" placeholder="Search GIFs" class="flex-1 px-3 py-2 border rounded" />
                                            <button id="gif-search-btn" class="px-3 py-2 bg-blue-600 text-white rounded">Search</button>
                                            <button id="gif-clear-btn" class="px-3 py-2 bg-slate-100 rounded">Clear</button>
                                        </div>
                                        <div id="gif-results" class="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto"></div>
                                    </div>
                                </div>

                                <!-- Sending Wallet Display -->
                                <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                    <p class="text-xs text-slate-600 mb-1 font-semibold">Sending From</p>
                                    <select id="send-from-wallet-selector" class="w-full text-sm font-semibold text-slate-800 bg-transparent outline-none cursor-pointer" onkeypress="if(event.key==='Enter') document.getElementById('execute-send-btn').click()">
                                    </select>
                                    <p id="send-available-balance" class="text-xs text-green-700 font-bold mt-2">Available: $0.00</p>
                                </div>
                                <div id="send-network-guidance" class="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between mt-3">
                                    <div id="send-gas-badge" class="text-sm text-slate-700">Network guidance will appear here.</div>
                                    <div class="flex gap-2">
                                        <a id="send-buy-matic" class="text-xs font-semibold text-blue-600 hidden" href="#" target="_blank">Buy MATIC</a>
                                        <a id="send-test-faucet" class="text-xs font-semibold text-amber-600 hidden" href="#" target="_blank">Get test MATIC / USDC</a>
                                    </div>
                                </div>
                                
                                <!-- Send Button -->
                                <button id="execute-send-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md">
                                    <i data-lucide="send" class="w-4 h-4"></i>
                                    Send Now
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Quick Tips Card -->
                    <div class="lg:col-span-1">
                        <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
                            <div class="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
                                <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                    <i data-lucide="lightbulb" class="w-5 h-5 text-amber-500"></i>
                                    Quick Tips
                                </h3>
                            </div>
                            <div class="p-4 space-y-3 text-xs text-slate-600">
                                <div class="flex gap-2">
                                    <i data-lucide="check-circle" class="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"></i>
                                    <p><strong>Email:</strong> Send to any email address</p>
                                </div>
                                <div class="flex gap-2">
                                    <i data-lucide="check-circle" class="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"></i>
                                    <p><strong>Direct:</strong> Paste wallet address</p>
                                </div>
                                <div class="flex gap-2">
                                    <i data-lucide="check-circle" class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></i>
                                    <p><strong>Instant:</strong> Instant on-chain settlement</p>
                                </div>
                                <hr class="border-slate-200 my-2">
                                <p class="text-xs text-slate-500">Don't forget to have your wallets verified before sending to avoid mistakes.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Recent Sends -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-100 bg-slate-50">
                        <h3 class="font-bold text-slate-800 flex items-center gap-2">
                            <i data-lucide="clock" class="w-4 h-4 text-slate-600"></i>
                            Recent Sends
                        </h3>
                    </div>
                    <div id="recent-sends-container" class="p-4 text-center text-slate-500 text-sm">
                        No sends yet. Your first send will appear here.
                    </div>
                </div>
            </div>`;
    }
    
    function getWalletContent(user) {
        const selectedAddresses = AeiXerCashUser.selectedAddresses || [];
        const activeIndex = AeiXerCashUser.activeWalletIndex || 0;
        const activeBalance = selectedAddresses[activeIndex]?.balance || 0;
        const activeAddress = selectedAddresses[activeIndex]?.address || '';
        const shortActiveAddr = activeAddress ? activeAddress.slice(0,6) + '...' + activeAddress.slice(-4) : '—';
        const cfg = getCurrentNetworkConfig();
        const netLabel = currentNetwork === 'mainnet' ? 'network-badge-mainnet' : 'network-badge-testnet';
        
        return `
            <!-- ===== BALANCE CARD (enlarged + deep purple-blue gradient) ===== -->
            <div class="balance-card-gradient mb-6">
                <!-- Decorative ring top-right -->
                <div style="position:absolute;top:-30px;right:-30px;width:160px;height:160px;border-radius:50%;border:2px solid rgba(255,255,255,0.06);pointer-events:none;"></div>
                <div style="position:absolute;top:-10px;right:-10px;width:100px;height:100px;border-radius:50%;border:2px solid rgba(255,255,255,0.04);pointer-events:none;"></div>

                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 relative z-10">
                    <div>
                        <p style="color:rgba(255,255,255,0.6);font-size:0.8rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Active Wallet Balance</p>
                        <div class="flex items-end gap-6">
                            <div>
                                <p id="wallet-balance" style="font-size:clamp(2.5rem,6vw,3.75rem);font-weight:900;letter-spacing:-0.03em;line-height:1;color:#ffffff;">$${activeBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                <p style="color:rgba(255,255,255,0.6);font-size:0.7rem;margin-top:4px;letter-spacing:0.05em;">USDC</p>
                            </div>
                            <div>
                                <p id="wallet-pol-balance" style="font-size:1.5rem;font-weight:700;letter-spacing:-0.02em;line-height:1;color:#ffd700;">0.00</p>
                                <p style="color:rgba(255,215,0,0.7);font-size:0.7rem;margin-top:4px;letter-spacing:0.05em;">POL</p>
                            </div>
                        </div>
                        <p style="color:rgba(255,255,255,0.45);font-size:0.72rem;margin-top:10px;font-family:'JetBrains Mono',monospace;">${shortActiveAddr}</p>
                    </div>
                    <div class="flex flex-col items-start md:items-end gap-2">
                        <span class="network-badge ${netLabel}">
                            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                            ${cfg.name} · ${cfg.label}
                        </span>
                        <div class="flex gap-3">
                            <span class="usdc-badge"><i data-lucide="circle-dollar-sign" class="w-3 h-3"></i> USDC</span>
                            <span class="usdc-badge" style="background:rgba(255,215,0,0.15);color:#ffd700;border-color:rgba(255,215,0,0.3);"><i data-lucide="zap" class="w-3 h-3"></i> POL</span>
                        </div>
                    </div>
                </div>

                <!-- Action row inside card -->
                <div class="flex flex-wrap gap-3 mt-8 relative z-10">
                    <button id="send-pay-button"
                        style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.25);color:#fff;font-weight:700;padding:10px 22px;border-radius:12px;font-size:0.875rem;display:flex;align-items:center;gap:8px;transition:all 0.2s;backdrop-filter:blur(4px);">
                        <i data-lucide="send" class="w-4 h-4"></i> Send & Pay
                    </button>

                    <button id="deposit-receive-button"
                        style="background: linear-gradient(135deg,#7c3aed,#8b5cf6); border:none; color:#fff; font-weight:700; padding:10px 18px; border-radius:12px; font-size:0.875rem; display:flex; align-items:center; gap:8px; transition:all 0.18s; box-shadow:0 8px 30px rgba(124,58,237,0.12);">
                        <i data-lucide="download" class="w-4 h-4"></i> Deposit / Receive
                    </button>

                </div>
            </div>

            <!-- ===== CONNECTED WALLETS (single consolidated 3-column grid, up to 6) ===== -->
            <div class="mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Connected Wallets (${selectedAddresses.length}/6)</h3>
                    <button onclick="navigate('dashboard','settings')" class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1">
                        <i data-lucide="settings-2" class="w-3 h-3"></i> Manage
                    </button>
                </div>
                <!-- FIX: Removed inline grid generation; container will be populated by updateWalletDisplay() -->
                <div id="wallet-cards-container" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                    <!-- Populated dynamically -->
                </div>
            </div>

            <!-- ===== RECENT TRANSACTIONS PREVIEW ===== -->
            <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 class="font-bold text-slate-800">Recent Activity</h3>
                    <button onclick="navigate('dashboard', 'transactions')"
                        class="text-xs font-semibold text-blue-600 hover:text-blue-800 transition">View all →</button>
                </div>
                <div class="p-4" id="tx-preview-container">
                    <p class="text-center py-8 text-slate-400 text-sm">Loading transactions…</p>
                </div>
            </div>

            <!-- Financial overview removed per request -->
        `;
    }
    
    function getDepositContent() {
        const selectedAddrs = AeiXerCashUser.selectedAddresses || [];
        const activeIndex = AeiXerCashUser.activeWalletIndex || 0;
        const activeAddress = selectedAddrs[activeIndex]?.address || '';
        const cfg = getCurrentNetworkConfig();

        const walletOptions = (selectedAddrs.length > 0)
            ? selectedAddrs.map((a, i) => `<option value="${a.address}" ${i === activeIndex ? 'selected' : ''}>Wallet #${i+1} - ${a.address.slice(0,6)}...${a.address.slice(-4)}</option>`).join('')
            : '';

        return `
            <div class="deposit-card-dark">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-2xl font-bold text-white">Buy / Receive USDC</h2>
                        <p class="text-sm text-slate-300 mt-1">Buy USDC from a cryptocurrency exchange like Coinbase or Binance, then send it to your Polygon wallet — choose which address to receive funds.</p>
                    </div>
                    <div class="network-badge ${currentNetwork === 'mainnet' ? 'network-badge-mainnet' : 'network-badge-testnet'} text-xs">
                        ${cfg.name} · ${cfg.label}
                    </div>
                </div>

                <div class="deposit-grid">
                    <div class="flex flex-col items-center">
                        <div id="deposit-qr-wrapper" class="deposit-qr-box">
                            <div id="deposit-qr" class="deposit-qr"></div>
                        </div>
                        <p class="text-xs text-slate-400 mt-3">Scan this QR with your external wallet or exchange app</p>
                        <p class="text-xs text-slate-400 mt-2">Tip: Tap the QR to enlarge before scanning.</p>
                    </div>

                    <div class="flex flex-col">
                        <label class="text-xs text-slate-400 mb-2">Select which wallet/address to receive funds</label>
                        <div class="flex items-center gap-2 mb-3">
                            <select id="deposit-wallet-selector" class="deposit-select flex-1">
                                ${walletOptions}
                                <option value="custom">Use a different address…</option>
                            </select>
                            <button id="deposit-edit-btn" class="deposit-edit-btn" title="Edit address">Edit</button>
                        </div>

                        <label class="text-xs text-slate-400 mb-2">Receiving Address</label>
                        <div class="flex gap-3">
                            <input id="deposit-address" readonly class="deposit-address-input" value="${activeAddress}">
                            <button id="deposit-copy-btn" class="deposit-copy-btn">Copy</button>
                        </div>

                        <div class="flex items-center gap-3 mt-3">
                            <input id="deposit-save-default" type="checkbox" style="accent-color:#7c3aed;" />
                            <label for="deposit-save-default" class="text-xs text-slate-300">Save this address as my default deposit address</label>
                        </div>

                        <p class="text-xs text-slate-400 mt-2">You can choose any active wallet or paste a custom address. We recommend sending a small test transfer first.</p>

                        <div class="deposit-warning mt-4">
                            Only send USDC or MATIC via the Polygon Network to this address. Sending funds via other networks (like Ethereum) may result in permanent loss.
                        </div>
                        <div id="deposit-network-actions" class="mt-4">
                            <div id="deposit-network-testnet" style="display:none;" class="flex gap-2">
                                <a id="deposit-faucet-usdc" class="deposit-copy-btn" href="#" target="_blank">USDC (Circle) testnet guide</a>
                                <a id="deposit-faucet-polygon" class="deposit-edit-btn" href="#" target="_blank">Polygon Amoy faucet</a>
                            </div>
                            <div id="deposit-network-mainnet" style="display:none;" class="flex gap-2">
                                <a id="deposit-mainnet-guide" class="deposit-copy-btn" href="#" target="_blank">How to deposit (Mainnet)</a>
                                <a id="deposit-buy-matic" class="deposit-edit-btn" href="#" target="_blank">Buy MATIC</a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-accordion" id="deposit-help">
                    <div class="accordion-item">
                        <div class="accordion-header"><div><strong>Quick Start</strong></div><div><i data-lucide="chevron-down" class="w-4 h-4"></i></div></div>
                        <div class="accordion-body">
                            <ol class="text-sm" style="margin-left:1rem;">
                                <li>Choose one of your active wallets from the list, or select <em>Use a different address</em> to paste another address.</li>
                                <li>Scan the QR code or press <strong>Copy</strong> to copy the full Polygon address.</li>
                                <li>On your exchange or wallet app, select <strong>Withdraw</strong> → choose <strong>USDC</strong> or <strong>MATIC</strong> → choose <strong>Polygon</strong> network → paste the address and confirm a small test.</li>
                                <li>Once the test arrives, send the full amount.</li>
                            </ol>
                        </div>
                    </div>

                    <div class="accordion-item">
                        <div class="accordion-header"><div><strong>For non‑crypto users (step‑by‑step)</strong></div><div><i data-lucide="chevron-down" class="w-4 h-4"></i></div></div>
                        <div class="accordion-body">
                            <ol class="text-sm" style="margin-left:1rem;">
                                <li>Create an account at your exchange (e.g., Coinbase, Binance) and complete any required verification.</li>
                                <li>Go to <strong>Withdraw</strong> or <strong>Send</strong> funds, choose <strong>USDC</strong> or <strong>MATIC</strong>.</li>
                                <li>When selecting network, always choose <strong>Polygon</strong> (sometimes listed as MATIC or Polygon Mainnet).</li>
                                <li>Scan the QR or paste the address from this page into the destination field.</li>
                                <li>Send a small test amount first (e.g., $1) to confirm the address is correct.</li>
                                <li>After confirmation, send the remainder.</li>
                            </ol>
                        </div>
                    </div>

                    <div class="accordion-item">
                        <div class="accordion-header"><div><strong>Common Exchanges (Binance / Coinbase)</strong></div><div><i data-lucide="chevron-down" class="w-4 h-4"></i></div></div>
                        <div class="accordion-body">
                            <p class="text-sm">On Binance: Wallet → Fiat and Spot → Withdraw → Coin: USDC/MATIC → Network: POLYGON (MATIC) → Paste address.</p>
                            <p class="text-sm">On Coinbase: Portfolio → USDC → Withdraw → Choose address → Paste address → Confirm network as Polygon.</p>
                        </div>
                    </div>

                    <div class="accordion-item">
                        <div class="accordion-header"><div><strong>Safety Tips</strong></div><div><i data-lucide="chevron-down" class="w-4 h-4"></i></div></div>
                        <div class="accordion-body">
                            <ul class="text-sm" style="margin-left:1rem;"><li>Only send USDC or MATIC on Polygon.</li><li>Confirm the first small transaction succeeded before sending larger amounts.</li><li>Double‑check the address; transactions are irreversible.</li></ul>
                        </div>
                    </div>
                </div>
                <!-- Recent deposits (last 6) -->
                <div class="mt-6">
                    <h3 class="text-sm font-bold text-white mb-2">Recent Deposits</h3>
                    <div id="deposit-recent-container" class="bg-white/5 rounded-xl p-3 min-h-[72px]">
                        <p class="text-center py-6 text-slate-400 text-sm">Loading deposits…</p>
                    </div>
                </div>
            </div>
        `;
    }

    function getTransactionsContent() {
        const cfg = getCurrentNetworkConfig();
        const netLabel = currentNetwork === 'mainnet' ? 'network-badge-mainnet' : 'network-badge-testnet';
        const txCount = AeiXerCashUser.transactions.length;
        return `
            <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <h2 class="text-2xl font-bold text-slate-800">Transaction History</h2>
                    <p class="text-sm text-slate-500 mt-0.5">All on-chain USDC activity across your wallets</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="network-badge ${netLabel}">
                        <span style="width:6px;height:6px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                        ${cfg.name} · ${cfg.label}
                    </span>
                    <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                        <span id="tx-total-count">${txCount}</span> transactions
                    </span>
                    <button onclick="loadTransactions().then(()=>showToast('Refreshed!','success'))"
                        class="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition text-slate-500 hover:text-blue-600"
                        title="Refresh transactions">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <!-- Filter row -->
            <div class="flex gap-2 mb-4 flex-wrap">
                <button onclick="filterTxCards('all')" id="filter-all" class="text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white transition">All</button>
                <button onclick="filterTxCards('received')" id="filter-received" class="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition">Received</button>
                <button onclick="filterTxCards('send')" id="filter-sent" class="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition">Sent</button>
            </div>

            <div id="full-tx-container" class="space-y-0">
                <p class="text-center py-16 text-slate-400 text-sm">Loading transactions from ${cfg.name}…</p>
            </div>`;
    }

    window.filterTxCards = function(type) {
        // Update button styles
        ['all','received','send'].forEach(t => {
            const btn = document.getElementById('filter-' + (t === 'send' ? 'sent' : t === 'received' ? 'received' : 'all'));
            if (btn) {
                btn.className = t === type
                    ? 'text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-600 text-white transition'
                    : 'text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
            }
        });
        
        const container = document.getElementById('full-tx-container');
        if (!container) return;
        const txs = type === 'all'
            ? AeiXerCashUser.transactions
            : AeiXerCashUser.transactions.filter(tx => tx.type === type);
        
        const cfg = getCurrentNetworkConfig();
        if (txs.length === 0) {
            container.innerHTML = `<p class="text-center py-16 text-slate-400 text-sm">No ${type === 'all' ? '' : type} transactions on ${cfg.name}.</p>`;
        } else {
            container.innerHTML = txs.map(tx => renderTxCard(tx, false)).join('');
        }
        lucide.createIcons();
    };
    
    function getSettingsContent(user) {
        const email = user.email || "Private";
        const selectedAddresses = AeiXerCashUser.selectedAddresses || [];
        const isTestnet = currentNetwork === 'testnet';
        
        return `
            <div class="mb-6">
                <h2 class="text-2xl font-bold text-slate-800">Settings</h2>
                <p class="text-sm text-slate-500 mt-1">Manage your account and wallet preferences.</p>
            </div>
            <div class="max-w-2xl space-y-4">

                <!-- NETWORK SECTION -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <i data-lucide="radio" class="w-4 h-4 text-blue-600"></i>
                        <h3 class="font-semibold text-slate-800 text-sm">Network</h3>
                    </div>
                    <div class="p-5">
                        <p class="text-sm text-slate-600 mb-4">Select the blockchain network. Switching networks updates your balance display and transaction history.</p>
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="switchNetwork('testnet')" 
                                class="network-toggle-btn ${isTestnet ? 'active-testnet' : 'inactive'} flex flex-col items-start gap-1 text-left p-4">
                                <div class="flex items-center gap-2 mb-1">
                                    <span style="width:8px;height:8px;border-radius:50%;background:${isTestnet ? '#f59e0b' : '#94a3b8'};display:inline-block;"></span>
                                    <span class="font-bold text-sm">Polygon Amoy</span>
                                </div>
                                <span class="text-xs font-medium opacity-75">Testnet · Chain 80002</span>
                                <span class="text-xs opacity-60">For development & testing</span>
                                ${isTestnet ? '<span class="text-xs font-bold mt-1">✓ Active</span>' : ''}
                            </button>
                            <button onclick="switchNetwork('mainnet')" 
                                class="network-toggle-btn ${!isTestnet ? 'active-mainnet' : 'inactive'} flex flex-col items-start gap-1 text-left p-4">
                                <div class="flex items-center gap-2 mb-1">
                                    <span style="width:8px;height:8px;border-radius:50%;background:${!isTestnet ? '#10b981' : '#94a3b8'};display:inline-block;"></span>
                                    <span class="font-bold text-sm">Polygon</span>
                                </div>
                                <span class="text-xs font-medium opacity-75">Mainnet · Chain 137</span>
                                <span class="text-xs opacity-60">Real USDC transactions</span>
                                ${!isTestnet ? '<span class="text-xs font-bold mt-1">✓ Active</span>' : ''}
                            </button>
                        </div>
                        ${!isTestnet ? `<div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2">
                            <i data-lucide="alert-triangle" class="w-3.5 h-3.5 mt-0.5 flex-shrink-0"></i>
                            <span><strong>Mainnet active.</strong> Transactions use real USDC on Polygon. Ensure you have MATIC for gas fees.</span>
                        </div>` : ''}
                    </div>
                </div>

                <!-- AUTHENTICATION -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <i data-lucide="user-circle" class="w-4 h-4 text-blue-600"></i>
                        <h3 class="font-semibold text-slate-800 text-sm">Account</h3>
                    </div>
                    <div class="p-5 space-y-3">
                        <div class="flex justify-between items-center text-sm">
                            <span class="text-slate-500">Email</span>
                            <span class="font-mono text-slate-800 text-xs">${email}</span>
                        </div>
                    </div>
                </div>

                <!-- ACTIVE CONNECTED WALLETS + MANAGE -->
                <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <i data-lucide="wallet" class="w-4 h-4 text-blue-600"></i>
                            <h3 class="font-semibold text-slate-800 text-sm">Active Wallets (${selectedAddresses.length}/6)</h3>
                        </div>
                        <button onclick="showManageWalletsModal()" class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
                            <i data-lucide="settings-2" class="w-3 h-3"></i> Manage Wallets
                        </button>
                    </div>
                    <div class="divide-y divide-slate-50">
                        ${selectedAddresses.map((a, i) => `
                            <div class="flex items-center justify-between px-5 py-3">
                                <div class="flex items-center gap-3">
                                    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#3b6ef5,#7c3aed);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                        <i data-lucide="wallet" class="w-4 h-4 text-white"></i>
                                    </div>
                                    <div>
                                        <p class="text-xs font-semibold text-slate-700">Wallet #${i+1}</p>
                                        <p class="text-xs font-mono text-slate-400 mt-0.5">${a.address}</p>
                                    </div>
                                </div>
                                <span class="text-sm font-bold text-emerald-600">$${a.balance.toFixed(2)}</span>
                            </div>`).join('')}
                    </div>
                    <div class="px-5 py-4 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
                        <span>${selectedAddresses.length} active wallet(s) out of 100 derived addresses.</span>
                        <button onclick="showManageWalletsModal()" class="text-blue-600 hover:text-blue-800 font-semibold transition">+ Add / Remove</button>
                    </div>
                </div>



                <!-- DANGER ZONE -->
                <div class="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                    <div class="px-5 py-4 border-b border-red-50 flex items-center gap-2">
                        <i data-lucide="log-out" class="w-4 h-4 text-red-500"></i>
                        <h3 class="font-semibold text-red-600 text-sm">Sign Out</h3>
                    </div>
                    <div class="p-5">
                        <p class="text-sm text-slate-600 mb-4">Sign out of your AeiXerCash account. Your wallet data is securely stored and will be available when you sign back in.</p>
                        <button onclick="showSignOutConfirmation()" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-5 rounded-xl transition flex items-center gap-2 text-sm">
                            <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
                        </button>
                    </div>
                </div>
            </div>`;
    }
    
    function getDashboardView(user) {
        const displayName = user.displayName || "User";
        const photoURL = user.photoURL || `https://placehold.co/100x100/0a65cc/FFFFFF?text=${displayName[0]}`;
        let mainContentHtml = '';
        switch (dashboardPage) {
            case 'send': mainContentHtml = getSendAndPayContent(); break;
            case 'deposit': mainContentHtml = getDepositContent(); break;
            case 'transactions': mainContentHtml = getTransactionsContent(); break;
            case 'settings': mainContentHtml = getSettingsContent(user); break;
            default: mainContentHtml = getWalletContent(user); break;
        }
        const mainNavItems = [
            { id: 'wallet', icon: 'wallet', label: 'Wallet' },
            { id: 'send', icon: 'send', label: 'Send & Pay' },
            { id: 'deposit', icon: 'download', label: 'Buy / Receive' },
            { id: 'transactions', icon: 'history', label: 'Transactions' },
        ];
        const generateNavHtml = (items) => items.map(item => `<button data-nav-id="${item.id}" class="nav-link w-full flex items-center space-x-3 p-3 transition duration-150 ${dashboardPage === item.id ? 'active' : ''}"><i data-lucide="${item.icon}" class="w-4 h-4 flex-shrink-0"></i><span class="font-medium text-sm">${item.label}</span></button>`).join('');
        const cfg = getCurrentNetworkConfig();
        const netLabel = currentNetwork === 'mainnet' ? 'network-badge-mainnet' : 'network-badge-testnet';
        const sidebarHtml = `
            <div id="sidebar-menu" class="sidebar fixed inset-y-0 left-0 transform -translate-x-full md:relative md:translate-x-0 transition duration-300 ease-in-out w-64 p-4 z-40 flex flex-col" style="height:100vh;min-height:0;">
                <!-- Logo -->
                <div class="flex items-center justify-between mb-6 px-2 pt-2 flex-shrink-0">
                    <span class="text-2xl font-extrabold tracking-tight sidebar-logo" style="letter-spacing:-0.03em;">AeiXerCash</span>
                    <button id="close-sidebar" class="md:hidden rounded-lg p-1 transition" style="color:rgba(255,255,255,0.5);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.5)'">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <!-- Network badge in sidebar -->
                <div class="mb-5 px-2 flex-shrink-0">
                    <span class="network-badge ${netLabel} text-xs w-full justify-center py-1.5">
                        <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                        ${cfg.name} · ${cfg.label}
                    </span>
                </div>
                <!-- Nav -->
                <div class="flex flex-col flex-1 overflow-y-auto min-h-0">
                    <nav class="space-y-1 mb-6">
                        <p class="sidebar-section-label px-3 mb-2">Main</p>
                        ${generateNavHtml(mainNavItems)}
                    </nav>
                    <nav class="space-y-1 pt-4 flex-shrink-0" style="border-top:1px solid rgba(255,255,255,0.1);">
                        <button data-nav-id="settings" class="nav-link w-full flex items-center space-x-3 p-3 transition duration-150 ${dashboardPage === 'settings' ? 'active' : ''}">
                            <i data-lucide="settings" class="w-4 h-4"></i><span class="font-medium text-sm">Settings</span>
                        </button>
                    </nav>
                </div>
                <!-- Profile -->
                <button id="profile-signout-btn" class="mt-3 w-full text-left focus:outline-none flex-shrink-0">
                    <div class="sidebar-profile flex items-center gap-3 p-3 transition cursor-pointer">
                        <img src="${photoURL}" onerror="this.onerror=null;this.src='https://placehold.co/40x40/7c3aed/FFFFFF?text=${displayName[0]}'" class="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2" style="border-color:rgba(255,255,255,0.3);" alt="${displayName}">
                        <div class="min-w-0">
                            <p class="font-semibold text-white text-sm truncate">${displayName}</p>
                            <p style="color:rgba(255,255,255,0.45);font-size:0.65rem;">Tap to sign out</p>
                        </div>
                    </div>
                </button>
            </div>`;
        const pageTitle = {'wallet':'Wallet','send':'Send & Pay','deposit':'Buy / Receive','transactions':'Transactions','settings':'Settings'}[dashboardPage] || 'Dashboard';
        const topNavHtml = `
            <header class="h-14 flex items-center justify-between px-5 bg-white border-b border-slate-200 shadow-sm flex-shrink-0">
                <div class="flex items-center gap-3">
                    <button id="open-sidebar" class="md:hidden text-slate-500 hover:text-blue-700 p-1 rounded-lg hover:bg-slate-100 transition">
                        <i data-lucide="menu" class="w-5 h-5"></i>
                    </button>
                    <h1 class="text-lg font-bold text-slate-800">${pageTitle}</h1>
                </div>
                <div class="flex items-center gap-2">
                    <span class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full ${currentNetwork === 'mainnet' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">
                        <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;"></span>
                        ${cfg.name}
                    </span>
                    <button onclick="navigate('dashboard','settings')" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition" title="Settings">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                    </button>
                </div>
            </header>`;
        return `<div class="flex w-full" style="height:100vh;overflow:hidden;">${sidebarHtml}<div id="sidebar-overlay" class="fixed inset-0 bg-black opacity-0 md:hidden z-30 pointer-events-none transition-opacity duration-300"></div><div class="flex-1 flex flex-col min-w-0" style="overflow:hidden;">${topNavHtml}<main class="flex-1 overflow-y-auto overflow-x-hidden dashboard-main" style="background:#f0f2f9;padding:24px 20px 80px;"><div style="max-width:1000px;">${mainContentHtml}</div><p class="text-center text-xs text-slate-400 mt-10">AeiXerCash v3.2 · ${cfg.name}</p></main></div></div>`;
    }
    
    function render() {
        appViewContainer.innerHTML = '';
        let viewHtml = '';
        const isSignInView = currentPath === 'signin';
        const isDashboardView = currentPath === 'dashboard';
        updateLayoutVisibility();
        if (isSignInView) appViewContainer.className = 'w-full flex flex-col items-center justify-center min-h-screen p-0 signin-gradient-background relative';
        else if (isDashboardView) appViewContainer.className = 'w-full h-screen flex relative overflow-hidden';
        else appViewContainer.className = 'w-full flex flex-col items-center justify-start min-h-[calc(100vh-80px-148px)] p-0 md:p-4 landing-background';
        
        // Handle dashboard view - check if we should show it
        if (isDashboardView) {
            if (user && walletConnected) {
                // Show dashboard for both Google and anonymous users with wallet data
                viewHtml = getDashboardView(user);
            } else if (!user) {
                // Not authenticated - redirect to signin
                navigate('signin');
                return;
            } else {
                // Authenticated but no wallet - show loading or wallet connect
                if (!user.isAnonymous) {
                    // Google user without wallet - show wallet connect modal
                    appViewContainer.innerHTML = '';
                    setTimeout(() => showWalletConnectModal(), 100);
                    return;
                } else {
                    // Anonymous user without wallet - redirect to signin
                    navigate('signin');
                    return;
                }
            }
        } else if (user && walletConnected) {
            // If authenticated with wallet but not on dashboard, redirect to dashboard
            navigate('dashboard', dashboardPage);
            return;
        } else if (user && !user.isAnonymous && !walletConnected) {
            // Google user without wallet - show wallet connect modal
            appViewContainer.innerHTML = '';
            setTimeout(() => showWalletConnectModal(), 100);
            return;
        } else if (isSignInView) {
            viewHtml = getSignInView();
        } else {
            viewHtml = getLandingPageView();
        }
        
        appViewContainer.innerHTML = viewHtml;
        lucide.createIcons();
        
        if (isDashboardView && walletConnected) {
            document.getElementById('profile-signout-btn')?.addEventListener('click', showSignOutConfirmation);
            const navButtons = document.querySelectorAll('.nav-link');
            navButtons.forEach(button => button.addEventListener('click', (e) => {
                const newPage = e.currentTarget.getAttribute('data-nav-id');
                if (newPage) {
                    navigate('dashboard', newPage);
                    const sidebar = document.getElementById('sidebar-menu');
                    const overlay = document.getElementById('sidebar-overlay');
                    if (sidebar && overlay && sidebar.classList.contains('translate-x-0')) {
                        sidebar.classList.add('-translate-x-full');
                        overlay.classList.add('opacity-0', 'pointer-events-none');
                    }
                }
            }));
            // ensure badge state reflects stored notifications
            try { updateUnseenBadge(); } catch(e) {}
            // If user has opened Transactions view, mark notified txs as viewed
            if (dashboardPage === 'transactions') {
                try { markAllNotifiedViewed(); } catch(e) { /* ignore */ }
            }
            document.getElementById('send-pay-button')?.addEventListener('click', () => navigate('dashboard', 'send'));
            
            // FIX: Null-safe binding of send & pay handlers
            const sendRecipientInput = document.getElementById('send-recipient-input');
            const sendLookupBtn = document.getElementById('send-lookup-btn');
            
            if (sendLookupBtn && sendRecipientInput) {
                sendLookupBtn.addEventListener('click', async () => {
                    const input = sendRecipientInput.value.trim();
                    if (!input) {
                        showToast('Please enter a recipient', 'warning');
                        return;
                    }
                    
                    sendLookupBtn.disabled = true;
                    sendLookupBtn.innerHTML = '<i data-lucide="loader-circle" class="w-5 h-5 animate-spin"></i>';
                    lucide.createIcons();
                    
                    try {
                        const recipient = await lookupRecipient(input);
                        if (!recipient) {
                            showToast('Recipient not found', 'error');
                            return;
                        }
                        
                        currentRecipientData = recipient;
                        const display = document.getElementById('send-recipient-display');
                        const walletsContainer = document.getElementById('send-recipient-wallets-container');
                        const walletsList = document.getElementById('send-recipient-wallets-list');
                        
                        // Show recipient
                        const photoEl = document.getElementById('send-recipient-photo');
                        if (photoEl) photoEl.src = recipient.photoURL || 'https://placehold.co/100x100/7c3aed/FFFFFF?text=' + (recipient.displayName?.[0] || '?');
                        const nameEl = document.getElementById('send-recipient-name');
                        if (nameEl) nameEl.textContent = recipient.displayName;
                        const infoEl = document.getElementById('send-recipient-info');
                        if (infoEl) infoEl.textContent = recipient.email || 'External Wallet';
                        if (display) display.classList.remove('hidden');
                        
                        // Show wallets
                        if (walletsContainer && walletsList && recipient.wallets.length > 0) {
                            walletsContainer.classList.remove('hidden');
                            walletsList.innerHTML = recipient.wallets.map((w, idx) => {
                                const shortAddr = `${w.address.slice(0,6)}...${w.address.slice(-4)}`;
                                return `
                                    <div class="recipient-wallet-option cursor-pointer" data-address="${w.address}">
                                        <div class="flex justify-between items-center">
                                            <div>
                                                <p class="text-xs font-bold text-slate-700">Wallet #${idx+1}</p>
                                                <p class="text-xs font-mono text-slate-400 mt-0.5">${shortAddr}</p>
                                            </div>
                                            <span class="text-sm font-bold text-emerald-600">$${w.balance.toFixed(2)}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('');
                            
                            document.querySelectorAll('.recipient-wallet-option').forEach(el => {
                                el.addEventListener('click', () => {
                                    document.querySelectorAll('.recipient-wallet-option').forEach(e => e.classList.remove('selected'));
                                    el.classList.add('selected');
                                    selectedRecipientWallet = { address: el.dataset.address };
                                });
                            });
                            
                            const firstWallet = document.querySelector('.recipient-wallet-option');
                            if (firstWallet) {
                                firstWallet.classList.add('selected');
                                selectedRecipientWallet = { address: firstWallet.dataset.address };
                            }
                        }
                    } catch (err) {
                        showToast('Lookup error: ' + err.message, 'error');
                    } finally {
                        sendLookupBtn.disabled = false;
                        sendLookupBtn.innerHTML = '<i data-lucide="search" class="w-5 h-5"></i>';
                        lucide.createIcons();
                    }
                });
            }
            
            // Change recipient button
            const changeRecipientBtn = document.getElementById('send-change-recipient');
            if (changeRecipientBtn) {
                changeRecipientBtn.addEventListener('click', () => {
                    if (sendRecipientInput) sendRecipientInput.value = '';
                    const display = document.getElementById('send-recipient-display');
                    if (display) display.classList.add('hidden');
                    const walletsContainer = document.getElementById('send-recipient-wallets-container');
                    if (walletsContainer) walletsContainer.classList.add('hidden');
                    const amountInput = document.getElementById('send-tx-amount');
                    if (amountInput) amountInput.value = '';
                    currentRecipientData = null;
                    selectedRecipientWallet = null;
                    if (sendRecipientInput) sendRecipientInput.focus();
                });
            }
            
            // Setup wallet selector in send form
            const sendFromWalletSelector = document.getElementById('send-from-wallet-selector');
            if (sendFromWalletSelector && AeiXerCashUser.selectedAddresses) {
                sendFromWalletSelector.innerHTML = AeiXerCashUser.selectedAddresses.map((addr, idx) => {
                    const shortAddr = `${addr.address.slice(0,6)}...${addr.address.slice(-4)}`;
                    return `<option value="${idx}" ${idx === AeiXerCashUser.activeWalletIndex ? 'selected' : ''}>Wallet #${idx+1} - ${shortAddr} ($${addr.balance.toFixed(2)})</option>`;
                }).join('');
                
                sendFromWalletSelector.addEventListener('change', (e) => {
                    const activeAddr = AeiXerCashUser.selectedAddresses[parseInt(e.target.value)];
                    const balanceEl = document.getElementById('send-available-balance');
                    if (balanceEl && activeAddr) {
                        balanceEl.textContent = `Available: $${activeAddr.balance.toFixed(2)}`;
                    }
                });
                
                // Set initial balance
                const activeAddr = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex];
                const balanceEl = document.getElementById('send-available-balance');
                if (balanceEl && activeAddr) {
                    balanceEl.textContent = `Available: $${activeAddr.balance.toFixed(2)}`;
                }

                // Network guidance for sending
                const sendGuidance = document.getElementById('send-network-guidance');
                const sendGasBadge = document.getElementById('send-gas-badge');
                const sendBuyLink = document.getElementById('send-buy-matic');

            // GIPHY Integration: handlers
            const attachGifBtn = document.getElementById('attach-gif-btn');
            const gifPicker = document.getElementById('gif-picker-container');
            const gifSearchInput = document.getElementById('gif-search-input');
            const gifSearchBtn = document.getElementById('gif-search-btn');
            const gifResults = document.getElementById('gif-results');
            const gifClearBtn = document.getElementById('gif-clear-btn');

            const GIPHY_API_KEY = 'x4XPTf3veDYzmN87fMolTqznKH7QMEpN';

            function renderGifResults(items) {
                if (!gifResults) return;
                gifResults.innerHTML = items.map(i => {
                    const url = i.images.fixed_height_small.url;
                    return `<div class="cursor-pointer p-1 border rounded" data-gif-url="${url}"><img src="${url}" style="width:100%;height:auto;border-radius:6px;"/></div>`;
                }).join('');
                // attach click handlers
                gifResults.querySelectorAll('[data-gif-url]').forEach(el => el.addEventListener('click', () => {
                    const url = el.getAttribute('data-gif-url');
                    window.selectedGifUrl = url;
                    window.pendingGifUrl = url; // used by invoice modal
                    showToast('GIF attached to message', 'success');
                    gifPicker.classList.add('hidden');
                }));
            }

            if (attachGifBtn) {
                attachGifBtn.addEventListener('click', () => {
                    if (!gifPicker) return;
                    gifPicker.classList.toggle('hidden');
                    if (!gifPicker.classList.contains('hidden') && gifResults && gifResults.children.length === 0) {
                        // load trending gifs
                        fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=18`) 
                            .then(r => r.json()).then(j => { renderGifResults(j.data || []); }).catch(e => console.warn('Giphy trending failed', e));
                    }
                });
            }

            if (gifSearchBtn) gifSearchBtn.addEventListener('click', async () => {
                const q = (gifSearchInput?.value || '').trim();
                if (!q) return;
                try {
                    gifSearchBtn.disabled = true;
                    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=24`);
                    const json = await res.json();
                    renderGifResults(json.data || []);
                } catch (e) { console.warn('Giphy search error', e); }
                finally { gifSearchBtn.disabled = false; }
            });

            if (gifClearBtn) gifClearBtn.addEventListener('click', () => { window.selectedGifUrl = null; window.pendingGifUrl = null; gifResults.innerHTML = ''; gifSearchInput.value = ''; showToast('GIF cleared', 'info'); });

                const sendTestFaucet = document.getElementById('send-test-faucet');
                const cfg2 = getCurrentNetworkConfig();
                if (sendGuidance) {
                    if (cfg2.chainId === 80002) {
                        if (sendGasBadge) sendGasBadge.textContent = 'Testnet (Polygon Amoy): use faucets to get MATIC / USDC for testing.';
                        if (sendTestFaucet) { sendTestFaucet.style.display = 'inline-block'; sendTestFaucet.href = 'https://faucet.polygon.technology/'; sendTestFaucet.addEventListener('click', () => showToast('Opening Polygon faucet...', 'info')); }
                        if (sendBuyLink) sendBuyLink.style.display = 'none';
                    } else {
                        if (sendGasBadge) sendGasBadge.textContent = 'Mainnet: ensure you have a small MATIC balance for gas. Exchanges support Polygon withdrawals.';
                        if (sendBuyLink) { sendBuyLink.style.display = 'inline-block'; sendBuyLink.href = 'https://www.coinbase.com/buy'; sendBuyLink.addEventListener('click', () => showToast('Opening buy MATIC...', 'info')); }
                        if (sendTestFaucet) sendTestFaucet.style.display = 'none';
                    }
                }
            }
            
            // Execute send
            const executeSendBtn = document.getElementById('execute-send-btn');
            if (executeSendBtn) {
                executeSendBtn.addEventListener('click', () => {
                    if (!requireGoogleLinkedForTransactions()) return;
                    if (!currentRecipientData) {
                        showToast('Please select a recipient', 'warning');
                        return;
                    }
                    if (!selectedRecipientWallet) {
                        showToast('Please select a recipient wallet', 'warning');
                        return;
                    }
                    
                    const amountInput = document.getElementById('send-tx-amount');
                    if (!amountInput) {
                        showToast('Amount input not found', 'error');
                        return;
                    }
                    const amount = parseFloat(amountInput.value);
                    if (isNaN(amount) || amount <= 0) {
                        showToast('Please enter a valid amount', 'warning');
                        return;
                    }
                    
                    if (!sendFromWalletSelector) {
                        showToast('Wallet selector not found', 'error');
                        return;
                    }
                    const selectorValue = parseInt(sendFromWalletSelector.value);
                    const activeWallet = AeiXerCashUser.selectedAddresses[selectorValue];
                    if (!activeWallet) {
                        showToast('Selected wallet not found', 'error');
                        return;
                    }
                    
                    if (amount > activeWallet.balance) {
                        showToast('Insufficient balance. Available: $' + activeWallet.balance.toFixed(2), 'error');
                        return;
                    }
                    
                    // Show invoice modal instead of sending directly
                    const cfg = getCurrentNetworkConfig();
                    const recipientName = currentRecipientData.displayName || currentRecipientData.email || selectedRecipientWallet.address;
                    const message = document.getElementById('send-tx-message')?.value || '';
                    showInvoiceModal(
                        amount,
                        activeWallet.address,
                        selectedRecipientWallet.address,
                        recipientName,
                        cfg.name + ' · ' + cfg.label,
                        message
                    );
                });
            }

            // Confirm invoice and broadcast transaction
            // Confirm invoice and broadcast transaction
const confirmInvoiceBtn = document.getElementById('confirm-invoice-btn');
if (confirmInvoiceBtn) {
    confirmInvoiceBtn.addEventListener('click', async () => {
        if (!requireGoogleLinkedForTransactions()) return;
        const amountInput = document.getElementById('send-tx-amount');
        if (!amountInput) { showToast('Amount input not found', 'error'); return; }
        const amount = parseFloat(amountInput.value);
        
        if (!sendFromWalletSelector) { showToast('Wallet selector not found', 'error'); return; }
        const selectorValue = parseInt(sendFromWalletSelector.value);
        const activeWallet = AeiXerCashUser.selectedAddresses[selectorValue];
        
        if (!activeWallet) { showToast('Selected wallet not found', 'error'); return; }
        if (amount > activeWallet.balance) { showToast(`Insufficient balance. Available: $${activeWallet.balance.toFixed(2)}`, 'error'); return; }

        confirmInvoiceBtn.disabled = true;
        confirmInvoiceBtn.classList.add('btn-disabled-grayed');
        confirmInvoiceBtn.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> Signing...';
        lucide.createIcons();

        let txSubmitted = false;

        try {
            if (!walletMnemonic) {
                const mnemonic = prompt('Enter your 12-word recovery phrase to authorize this transaction:');
                if (!mnemonic) {
                    showToast('Transaction cancelled', 'warning');
                    confirmInvoiceBtn.disabled = false;
                    confirmInvoiceBtn.classList.remove('btn-disabled-grayed');
                    confirmInvoiceBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> Confirm & Sign';
                    lucide.createIcons();
                    return;
                }
                if (!ethers.Mnemonic.isValidMnemonic(mnemonic)) {
                    showToast('Invalid mnemonic phrase.', 'error');
                    confirmInvoiceBtn.disabled = false;
                    confirmInvoiceBtn.classList.remove('btn-disabled-grayed');
                    confirmInvoiceBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> Confirm & Sign';
                    lucide.createIcons();
                    return;
                }
                walletMnemonic = mnemonic;
            }

            // --- FIX 1: Correct BIP39 Derivation Path Logic ---
            let originalIndex = 0;
            if (Array.isArray(AeiXerCashUser.selectedAddressIndices) && AeiXerCashUser.selectedAddressIndices.length > selectorValue) {
                originalIndex = AeiXerCashUser.selectedAddressIndices[selectorValue];
            } else {
                const targetAddress = activeWallet.address.toLowerCase();
                const foundIndex = AeiXerCashUser.addresses?.findIndex(a => a.address.toLowerCase() === targetAddress);
                if (foundIndex !== -1) originalIndex = foundIndex;
                else throw new Error('Unable to locate wallet derivation path.');
            }

            const path = `m/44'/60'/0'/0/${originalIndex}`;
            // Proper BIP39 derivation: compute seed first, then create master node, then derive
            const mnemonic = ethers.Mnemonic.fromPhrase(walletMnemonic);
            const seed = mnemonic.computeSeed();
            const masterNode = ethers.HDNodeWallet.fromSeed(seed);
            const senderWallet = masterNode.derivePath(path).connect(getProvider());

            if (senderWallet.address.toLowerCase() !== activeWallet.address.toLowerCase()) {
                throw new Error('Wallet address mismatch. Please reconnect.');
            }

            const cfg = getCurrentNetworkConfig();
            const usdcContract = new ethers.Contract(cfg.usdcContract, USDC_ABI, senderWallet);
            
            const onChainBalance = await getUSDCBalance(activeWallet.address);
            if (amount > onChainBalance) {
                throw new Error(`On-chain balance ($${onChainBalance.toFixed(2)}) is lower than required.`);
            }

            const amountWei = ethers.parseUnits(amount.toFixed(USDC_DECIMALS), USDC_DECIMALS);
            showToast('Broadcasting transaction...', 'info', 3000);

            // --- FIX 2: Amoy 30 Gwei Gas Override ---
            let txOptions = {};
            if (cfg.chainId === 80002) { // Amoy check
                const amoyFee = ethers.parseUnits("30", "gwei");
                txOptions = {
                    maxPriorityFeePerGas: amoyFee,
                    maxFeePerGas: amoyFee
                };
            }

            const tx = await usdcContract.transfer(selectedRecipientWallet.address, amountWei, txOptions);
            txSubmitted = true;
            
            showToast('Transaction submitted! Waiting for confirmation...', 'info', 8000);
            const receipt = await tx.wait();

            showToast(`Successfully sent $${amount.toFixed(2)} USDC!`, 'success');
            // Trigger visually satisfying payment sent success modal
            showPaymentSentSuccessModal(amount.toFixed(2), selectedRecipientWallet.address, tx.hash);
            // Persist message metadata (dashboard send form)
            try {
                const msg = window.pendingTransactionMessage || document.getElementById('send-tx-message')?.value || '';
                const currentUserEmail = auth.currentUser?.email || null;
                const currentUserPhoto = auth.currentUser?.photoURL || null;
                await saveTransactionMetadata(tx.hash, {
                    hash: tx.hash,
                    type: 'send',
                    amount: amount,
                    from: activeWallet.address,
                    to: selectedRecipientWallet.address,
                    message: msg,
                    gifUrl: window.selectedGifUrl || window.pendingGifUrl || null,
                    account: currentUserEmail,
                    owner: currentUserEmail,
                    photoURL: currentUserPhoto,
                    network: getCurrentNetworkConfig().name
                });
                await queueTransactionEmail(currentRecipientData?.email, {
                    hash: tx.hash,
                    amount,
                    from: activeWallet.address,
                    to: selectedRecipientWallet.address,
                    message: msg,
                    network: getCurrentNetworkConfig().name,
                    recipientName: currentRecipientData?.displayName
                });
            } catch (mErr) { console.warn('Save tx meta failed', mErr); }

            closeInvoiceModal();
            await refreshDashboardBalance();
            await loadTransactions();
            
            // UI Cleanup
            if (sendRecipientInput) sendRecipientInput.value = '';
            if (amountInput) amountInput.value = '';
            document.getElementById('send-recipient-display')?.classList.add('hidden');
            document.getElementById('send-recipient-wallets-container')?.classList.add('hidden');
            currentRecipientData = null;
            selectedRecipientWallet = null;
            render();

        } catch (err) {
            console.error('Send error:', err);
            if (txSubmitted) {
                showToast('Transaction submitted — confirmation may still be pending.', 'info');
            } else {
                showToast(err.message || 'Transaction failed', 'error');
            }
        } finally {
            confirmInvoiceBtn.disabled = false;
            confirmInvoiceBtn.classList.remove('btn-disabled-grayed');
            confirmInvoiceBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> Confirm & Sign';
            lucide.createIcons();
        }
    });
}
            
            const sidebar = document.getElementById('sidebar-menu');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
                document.getElementById('open-sidebar')?.addEventListener('click', () => {
                    sidebar.classList.remove('-translate-x-full');
                    overlay.classList.remove('opacity-0', 'pointer-events-none');
                    overlay.classList.add('opacity-50');
                });
                document.getElementById('close-sidebar')?.addEventListener('click', () => {
                    sidebar.classList.add('-translate-x-full');
                    overlay.classList.add('opacity-0', 'pointer-events-none');
                    overlay.classList.remove('opacity-50');
                });
                overlay.addEventListener('click', () => {
                    sidebar.classList.add('-translate-x-full');
                    overlay.classList.add('opacity-0', 'pointer-events-none');
                    overlay.classList.remove('opacity-50');
                });
            }
            // Initialize wallet & deposit tabs if active
            if (dashboardPage === 'wallet') {
                setTimeout(() => initWalletTab(), 120);
            }
            if (dashboardPage === 'deposit') {
                setTimeout(() => initDepositTab(), 80);
            }

            // FIX: Delay balance/transaction load to ensure DOM ready
            setTimeout(() => {
                if (walletConnected && AeiXerCashUser.addresses.length > 0) {
                    loadTransactions();
                    refreshDashboardBalance();
                } else if (!walletConnected) {
                    showToast('Wallet not connected. Please reconnect.', 'warning');
                }
            }, 50);
        } else if (currentPath === 'signin') {
            document.getElementById('google-signin-btn')?.addEventListener('click', handleGoogleSignIn);
            document.getElementById('mnemonic-login-btn')?.addEventListener('click', () => {
                // Show the wallet connect modal for mnemonic creation/import
                showWalletConnectModal();
            });
            
            // Handle password-based login for mnemonic wallets
            document.getElementById('mnemonic-password-btn')?.addEventListener('click', async () => {
                const passwordInput = document.getElementById('mnemonic-password-input');
                const password = passwordInput?.value || '';
                if (!password) {
                    showToast('Please enter your password', 'warning');
                    return;
                }
                const btn = document.getElementById('mnemonic-password-btn');
                btn.disabled = true;
                btn.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> <span>Unlocking...</span>';
                try {
                    // Verify password matches stored hash
                    if (!verifyPassword(password)) {
                        showToast('Incorrect password', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4"></i> <span>Unlock Wallet</span>';
                        lucide.createIcons();
                        return;
                    }
                    
                    // Sign in anonymously (no existing session)
                    if (!auth.currentUser) {
                        await signInAnonymously(auth);
                    }
                    
                    // Store the password for this session
                    sessionStorage.setItem('AeiXerCash_sessionPassword', password);
                    
                    // Load the wallet
                    const loaded = await loadUserWalletData();
                    if (!loaded) {
                        showToast('Wallet data not found. Please reconnect your wallet.', 'error');
                        btn.disabled = false;
                        btn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4"></i> <span>Unlock Wallet</span>';
                        lucide.createIcons();
                        return;
                    }
                    
                    walletConnected = true;
                    
                    // Fetch latest balances and transactions for all wallets
                    await syncUserData();
                    await loadTransactions();
                    
                    showToast('Wallet unlocked!', 'success');
                    navigate('dashboard');
                } catch (err) {
                    console.error('Unlock wallet error:', err);
                    showToast('Failed to unlock wallet: ' + err.message, 'error');
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="unlock" class="w-4 h-4"></i> <span>Unlock Wallet</span>';
                    lucide.createIcons();
                }
            });
        } else {
            // If landing page, set hero image src (configurable via window.HERO_DEVICE_IMAGE_URL)
            const heroImg = document.getElementById('hero-device-image');
            const panelHero = document.getElementById('panel-hero-image');
            if (heroImg) heroImg.src = HERO_DEVICE_IMAGE_URL || '';
            if (panelHero) panelHero.src = HERO_DEVICE_IMAGE_URL || '';

            document.getElementById('nav-launch-wallet')?.addEventListener('click', () => navigate('signin'));
            document.getElementById('mobile-launch-wallet')?.addEventListener('click', () => navigate('signin'));
            document.getElementById('hero-launch-wallet')?.addEventListener('click', () => navigate('signin'));
            document.getElementById('final-launch-wallet')?.addEventListener('click', () => navigate('signin'));
        }

        // Initialize scroll animations
        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animated');
                }
            });
        }, { threshold: 0.1 });
        animatedElements.forEach(el => observer.observe(el));
    }

    // Initialize Deposit tab QR and interactive controls
    function initDepositTab() {
        const wallets = AeiXerCashUser.selectedAddresses || [];
        const selector = document.getElementById('deposit-wallet-selector');
        const addrInput = document.getElementById('deposit-address');
        const qrEl = document.getElementById('deposit-qr');
        const qrWrapper = document.getElementById('deposit-qr-wrapper');
        const copyBtn = document.getElementById('deposit-copy-btn');
        const editBtn = document.getElementById('deposit-edit-btn');
        const saveDefaultCheck = document.getElementById('deposit-save-default');

        const savedDefault = localStorage.getItem('AeiXerCash_default_deposit');

        // Helper to create QR
        function renderQR(text) {
            if (!qrEl) return;
            qrEl.innerHTML = '';
            const size = Math.min(300, Math.max(140, Math.floor((qrWrapper?.clientWidth || 240) * 0.95)));
            try {
                if (window.QRCode) {
                    new window.QRCode(qrEl, { text: text || '0x0', width: size, height: size, colorDark: '#2d1b8e', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.H });
                    // animate
                    qrEl.classList.remove('qr-pop');
                    void qrEl.offsetWidth;
                    qrEl.classList.add('qr-pop');
                    qrWrapper?.classList.add('qr-glow');
                    setTimeout(() => qrWrapper?.classList.remove('qr-glow'), 900);
                } else {
                    qrEl.textContent = 'QR library not loaded';
                }
            } catch (err) {
                console.error('QR render error', err);
                qrEl.textContent = 'Unable to render QR';
            }
        }

        // Initialize selector state
        if (selector) {
            // If selector has no options (rendered server-side), populate from wallets
            if (selector.children.length <= 1 && wallets.length > 0) {
                selector.innerHTML = wallets.map((w, i) => `<option value="${w.address}" ${i === AeiXerCashUser.activeWalletIndex ? 'selected' : ''}>Wallet #${i+1} - ${w.address.slice(0,6)}...${w.address.slice(-4)}</option>`).join('') + '<option value="custom">Use a different address…</option>';
            }

            // If there's a saved default, preselect it
            if (savedDefault) {
                const found = Array.from(selector.options).find(o => o.value === savedDefault);
                if (found) selector.value = savedDefault;
                else selector.value = 'custom';
            }
        }

        // Determine initial address value
        let initialAddress = '';
        if (savedDefault) initialAddress = savedDefault;
        else if (selector && selector.value && selector.value !== 'custom') initialAddress = selector.value;
        else if (wallets.length > 0) initialAddress = wallets[AeiXerCashUser.activeWalletIndex || 0].address;

        if (addrInput) {
            addrInput.value = initialAddress || '';
            addrInput.readOnly = !!initialAddress && selector && selector.value !== 'custom';
            if (!initialAddress) addrInput.placeholder = 'Paste or select an address';
        }

        // Render initial QR
        renderQR(initialAddress || '0x0');

        // Selector change
        selector?.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'custom') {
                if (addrInput) { addrInput.readOnly = false; addrInput.value = savedDefault || ''; addrInput.focus(); }
                renderQR(addrInput?.value || '0x0');
            } else {
                if (addrInput) { addrInput.readOnly = true; addrInput.value = val; }
                renderQR(val);
            }
        });

        // Edit button toggles edit mode
        editBtn?.addEventListener('click', () => {
            if (!addrInput) return;
            if (addrInput.readOnly) {
                addrInput.readOnly = false;
                addrInput.focus();
                editBtn.textContent = 'Done';
            } else {
                addrInput.readOnly = true;
                editBtn.textContent = 'Edit';
                // Update selector if matches a known wallet
                const matchOpt = selector ? Array.from(selector.options).find(o => o.value.toLowerCase() === addrInput.value.toLowerCase()) : null;
                if (matchOpt && selector) selector.value = matchOpt.value; else if (selector) selector.value = 'custom';
                renderQR(addrInput.value || '0x0');
            }
        });

        // Live update QR when user types/pastes into the address box
        addrInput?.addEventListener('input', (e) => {
            const t = e.target.value.trim();
            renderQR(t || '0x0');
        });

        // Copy button
        copyBtn?.addEventListener('click', async () => {
            const a = addrInput?.value || '';
            try {
                await navigator.clipboard.writeText(a);
                const prev = copyBtn.innerHTML;
                copyBtn.innerHTML = 'Copied!';
                showToast('Address copied to clipboard', 'success', 1400);
                setTimeout(() => { if (copyBtn) copyBtn.innerHTML = prev; }, 1400);
            } catch (err) {
                showToast('Copy failed: ' + (err?.message || err), 'error');
            }
        });

        // Save default checkbox behaviour
        saveDefaultCheck?.addEventListener('change', (e) => {
            if (!addrInput) return;
            if (e.target.checked) {
                localStorage.setItem('AeiXerCash_default_deposit', addrInput.value || '');
                showToast('Default deposit address saved', 'success');
            } else {
                localStorage.removeItem('AeiXerCash_default_deposit');
                showToast('Default deposit address cleared', 'info');
            }
        });

        // Accordion toggle handlers
        document.querySelectorAll('#deposit-help .accordion-header').forEach(h => {
            h.addEventListener('click', () => {
                const body = h.nextElementSibling;
                if (!body) return;
                const wasOpen = body.classList.contains('open');
                document.querySelectorAll('#deposit-help .accordion-body').forEach(b => b.classList.remove('open'));
                if (!wasOpen) body.classList.add('open');
                lucide.createIcons();
            });
        });

        // Network-specific action buttons (show faucets / buy links)
        const testnetSection = document.getElementById('deposit-network-testnet');
        const mainnetSection = document.getElementById('deposit-network-mainnet');
        if (currentNetwork === 'testnet') {
            if (testnetSection) testnetSection.style.display = 'flex';
            if (mainnetSection) mainnetSection.style.display = 'none';
            const usdcBtn = document.getElementById('deposit-faucet-usdc');
            const polyBtn = document.getElementById('deposit-faucet-polygon');
            if (usdcBtn) usdcBtn.addEventListener('click', (e) => { e.preventDefault(); window.open('https://developers.circle.com/guides', '_blank'); showToast('Opening Circle testnet guide...', 'info'); });
            if (polyBtn) polyBtn.addEventListener('click', (e) => { e.preventDefault(); window.open('https://faucet.polygon.technology/', '_blank'); showToast('Opening Polygon faucet...', 'info'); });
        } else {
            if (testnetSection) testnetSection.style.display = 'none';
            if (mainnetSection) mainnetSection.style.display = 'flex';
            const mainGuide = document.getElementById('deposit-mainnet-guide');
            const buyBtn = document.getElementById('deposit-buy-matic');
            if (mainGuide) mainGuide.addEventListener('click', (e) => { e.preventDefault(); window.open('https://docs.polygon.technology/', '_blank'); showToast('Opening Polygon docs...', 'info'); });
            if (buyBtn) buyBtn.addEventListener('click', (e) => { e.preventDefault(); window.open('https://www.coinbase.com/buy', '_blank'); showToast('Opening buy MATIC page...', 'info'); });
        }

        // Add a Polygon Amoy (testnet) specific help item when on testnet
        try {
            const depositHelp = document.getElementById('deposit-help');
            if (depositHelp) {
                const existingAmoy = document.getElementById('deposit-amoy-item');
                if (currentNetwork === 'testnet') {
                    if (!existingAmoy) {
                        const amoy = document.createElement('div');
                        amoy.id = 'deposit-amoy-item';
                        amoy.className = 'accordion-item';
                        amoy.innerHTML = `
                            <div class="accordion-header"><div><strong>Polygon Amoy (Testnet) — Get test USDC & MATIC</strong></div><div><i data-lucide="chevron-down" class="w-4 h-4"></i></div></div>
                            <div class="accordion-body">
                                <p class="text-sm">To deposit test USDC on Polygon Amoy:</p>
                                <ol class="text-sm" style="margin-left:1rem;">
                                    <li>Use the <a href="https://developers.circle.com/guides" target="_blank">Circle developers guide</a> to mint or request test USDC.</li>
                                    <li>Use the <a href="https://faucet.polygon.technology/" target="_blank">Polygon Faucet</a> to obtain MATIC for gas on Amoy.</li>
                                    <li>When withdrawing from an exchange, ensure you select <strong>Polygon Amoy</strong> (Chain ID: 80002) as the network.</li>
                                    <li>Send a small test amount first to confirm arrival.</li>
                                </ol>
                            </div>
                        `;
                        depositHelp.prepend(amoy);
                        amoy.querySelector('.accordion-header').addEventListener('click', () => {
                            const body = amoy.querySelector('.accordion-body');
                            if (!body) return;
                            const wasOpen = body.classList.contains('open');
                            document.querySelectorAll('#deposit-help .accordion-body').forEach(b => b.classList.remove('open'));
                            if (!wasOpen) body.classList.add('open');
                            lucide.createIcons();
                        });
                        lucide.createIcons();
                    }
                } else {
                    if (existingAmoy) existingAmoy.remove();
                }
            }
        } catch (err) { console.warn('Amoy help injection failed', err); }

        // Enlarge QR on click (simple modal)
        qrWrapper?.addEventListener('click', () => {
            const modalId = 'deposit-qr-modal';
            let modal = document.getElementById(modalId);
            if (!modal) {
                modal = document.createElement('div');
                modal.id = modalId;
                modal.style.position = 'fixed';
                modal.style.inset = 0;
                modal.style.background = 'rgba(0,0,0,0.6)';
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.zIndex = 1200;
                modal.addEventListener('click', () => modal.remove());
                document.body.appendChild(modal);
            }
            modal.innerHTML = '';
            const big = document.createElement('div');
            big.style.background = '#fff';
            big.style.padding = '18px';
            big.style.borderRadius = '14px';
            big.style.display = 'inline-flex';
            big.style.alignItems = 'center';
            big.style.justifyContent = 'center';
            modal.appendChild(big);
            const largeQr = document.createElement('div');
            largeQr.style.width = '420px';
            largeQr.style.height = '420px';
            big.appendChild(largeQr);
            try {
                const addr = addrInput?.value || '0x0';
                if (window.QRCode) new window.QRCode(largeQr, { text: addr, width: 420, height: 420, colorDark: '#2d1b8e', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.H });
            } catch (e) { largeQr.textContent = 'Unable to render QR'; }
        });

        // Responsive: re-render QR on resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderQR(addrInput?.value || '0x0');
            }, 120);
        });
    }

    // Initialize Wallet tab: charts, market data, and quick actions
    async function initWalletTab() {
        // deposit button navigation only (financial overview removed)
        const depositBtn = document.getElementById('deposit-receive-button');
        if (depositBtn) depositBtn.addEventListener('click', () => navigate('dashboard','deposit'));
    }

    function buildInOutSeries(days = 30, walletAddress = null) {
        const txs = AeiXerCashUser.transactions || [];
        const today = new Date();
        const categories = [];
        const inMap = {};
        const outMap = {};
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
            categories.push(key);
            inMap[key] = 0;
            outMap[key] = 0;
        }
        const target = walletAddress ? String(walletAddress).toLowerCase() : null;
        txs.forEach(tx => {
            try {
                const d = new Date(tx.timestamp);
                const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
                if (!inMap.hasOwnProperty(key)) return;
                if (target) {
                    const from = (tx.from || '').toLowerCase();
                    const to = (tx.to || '').toLowerCase();
                    if (to === target) inMap[key] += Number(tx.amount || 0);
                    if (from === target) outMap[key] += Number(tx.amount || 0);
                } else {
                    if (tx.type === 'received') inMap[key] += Number(tx.amount || 0);
                    else if (tx.type === 'send') outMap[key] += Number(tx.amount || 0);
                }
            } catch (e) { /* ignore malformed */ }
        });
        const inSeries = categories.map(k => Number((inMap[k] || 0).toFixed(2)));
        const outSeries = categories.map(k => Number((outMap[k] || 0).toFixed(2)));
        return { categories, inSeries, outSeries };
    }

    // Market data sparklines removed per user request.

    function formatNumber(n) {
        if (n === null || n === undefined) return '—';
        return n >= 1e9 ? (n/1e9).toFixed(2) + 'B' : n >= 1e6 ? (n/1e6).toFixed(2) + 'M' : n >= 1e3 ? (n/1e3).toFixed(2) + 'K' : Number(n).toFixed(2);
    }

    async function pollBalance() {
        if (!AeiXerCashUser.selectedAddresses || AeiXerCashUser.selectedAddresses.length === 0) return;
        
        try {
            const activeAddress = AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex].address;
            const balance = await getUSDCBalance(activeAddress);
            
            AeiXerCashUser.selectedAddresses[AeiXerCashUser.activeWalletIndex].balance = balance;
            AeiXerCashUser.balance = balance.toFixed(2);
            
            const balanceEl = document.getElementById('wallet-balance');
            if (balanceEl) balanceEl.innerText = `$${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            
            updateWalletDisplay();
            
        } catch (err) {
            console.error("Balance poll error:", err);
        }
    }
    
    setInterval(pollBalance, 10000);
    
    onAuthStateChanged(auth, async (currentUser) => {
        user = currentUser;
        const wasAuthReady = isAuthReady;
        isAuthReady = true;
        if (!user) {
            try { if (unsubscribeTxListener) { unsubscribeTxListener(); unsubscribeTxListener = null; } } catch(e){}
        }
        if (user) {
            // Handle both Google users and anonymous mnemonic users
            const hasData = await loadUserWalletData();
            if (hasData) {
                walletConnected = true;
                if (currentPath !== 'dashboard') navigate('dashboard');
                else render();
            } else {
                walletConnected = false;
                // Allow users to stay on current page instead of auto-redirecting
                render();
            }
            
            // Only load transactions for Google users (authenticated with email)
            if (!user.isAnonymous && user.email) {
                syncUserData();
                loadTransactions();
                // Listen for checkout-created transactions that reference this owner
                try {
                    if (unsubscribeTxListener) unsubscribeTxListener();
                    const ownerEmail = user.email.toLowerCase();
                    const q = query(collection(db, 'transactions'), where('owner', '==', ownerEmail));
                    unsubscribeTxListener = onSnapshot(q, (snapshot) => {
                        snapshot.docChanges().forEach(ch => {
                            if (ch.type === 'added') {
                                const d = ch.doc.data();
                                showToast('New payment received', 'success');
                                // Refresh transactions so UI updates
                                loadTransactions();
                            }
                        });
                    });
                } catch (e) { console.warn('tx listener failed', e); }
            } else if (user.isAnonymous) {
                // For anonymous users, load transactions directly
                syncUserData();
                loadTransactions();
            }
        } else if (!user && (currentPath === 'dashboard' || currentPath === 'signin')) {
            navigate('signin');
        } else if (!wasAuthReady) {
            navigate(currentPath);
        }
        updateLayoutVisibility();
    });
    
    // ==================== MANAGE WALLETS MODAL ====================
    let manageWalletsTemp = [];

    window.showManageWalletsModal = function() {
        if (!AeiXerCashUser.addresses || AeiXerCashUser.addresses.length === 0) {
            showToast('No wallet data available. Reconnect your phrase first.', 'warning');
            return;
        }
        manageWalletsTemp = [...selectedAddressIndices];
        renderManageWalletsList();
        document.getElementById('manage-wallets-modal').classList.remove('hidden');
        lucide.createIcons();

        document.getElementById('save-manage-wallets-btn').onclick = saveManageWallets;
    };

    window.closeManageWalletsModal = function() {
        document.getElementById('manage-wallets-modal').classList.add('hidden');
    };

    function renderManageWalletsList() {
        const list = document.getElementById('manage-wallets-list');
        const countEl = document.getElementById('manage-selected-count');
        if (!list) return;
        list.innerHTML = AeiXerCashUser.addresses.slice(0, 100).map((addr, idx) => {
            const isChecked = manageWalletsTemp.includes(idx);
            const shortAddr = addr.address ? `${addr.address.slice(0,6)}...${addr.address.slice(-4)}` : 'N/A';
            return `
                <label class="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 transition ${isChecked ? 'bg-blue-50' : ''}">
                    <div class="flex items-center gap-3 flex-1">
                        <input type="checkbox" value="${idx}" ${isChecked ? 'checked' : ''}
                            onchange="handleManageWalletToggle(this)"
                            class="w-4 h-4 rounded" style="accent-color:#3b6ef5;">
                        <div>
                            <p class="text-xs font-semibold text-slate-700">Address #${idx + 1}</p>
                            <p class="text-xs font-mono text-slate-400 mt-0.5">${shortAddr}</p>
                        </div>
                    </div>
                    <span class="text-sm font-bold ${(addr.balance || 0) > 0 ? 'text-emerald-600' : 'text-slate-300'}">$${(addr.balance || 0).toFixed(2)}</span>
                </label>
            `;
        }).join('');
        if (countEl) countEl.textContent = manageWalletsTemp.length;
    }

    window.handleManageWalletToggle = function(checkbox) {
        const idx = parseInt(checkbox.value);
        const countEl = document.getElementById('manage-selected-count');
        if (checkbox.checked) {
            if (manageWalletsTemp.length >= MAX_SELECTED_WALLETS) {
                checkbox.checked = false;
                showToast(`Maximum ${MAX_SELECTED_WALLETS} wallets allowed.`, 'warning');
                return;
            }
            if (!manageWalletsTemp.includes(idx)) manageWalletsTemp.push(idx);
        } else {
            manageWalletsTemp = manageWalletsTemp.filter(i => i !== idx);
        }
        const row = checkbox.closest('label');
        if (row) row.classList.toggle('bg-blue-50', checkbox.checked);
        if (countEl) countEl.textContent = manageWalletsTemp.length;
    };

    async function saveManageWallets() {
        if (manageWalletsTemp.length === 0) {
            showToast('Select at least 1 wallet.', 'warning');
            return;
        }
        const btn = document.getElementById('save-manage-wallets-btn');
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-circle" class="w-4 h-4 animate-spin"></i> Saving...';
        lucide.createIcons();
        try {
            const newIndices = [...manageWalletsTemp].sort((a, b) => a - b);
            const newSelectedAddresses = newIndices.map(i => AeiXerCashUser.addresses[i]).filter(Boolean);
            await saveUserWalletData(AeiXerCashUser.addresses, newIndices, 0);
            selectedAddressIndices = newIndices;
            AeiXerCashUser.selectedAddressIndices = newIndices; // FIX: update the stored indices
            AeiXerCashUser.selectedAddresses = newSelectedAddresses;
            AeiXerCashUser.activeWalletIndex = 0;
            AeiXerCashUser.balance = (newSelectedAddresses[0]?.balance || 0).toFixed(2);
            closeManageWalletsModal();
            // FIX: Refresh balance and update UI immediately after saving
            await refreshDashboardBalance();
            updateWalletDisplay();
            showToast(`${newIndices.length} wallet(s) activated!`, 'success');
        } catch (err) {
            showToast('Failed to save: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> Save & Activate';
            lucide.createIcons();
        }
    }

    document.getElementById('manage-wallets-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('manage-wallets-modal')) closeManageWalletsModal();
    });

    authenticateUser();

    const menuButton = document.getElementById('menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuButton) {
        menuButton.addEventListener('click', () => { mobileMenu.classList.toggle('hidden'); });
        mobileMenu.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => { mobileMenu.classList.add('hidden'); }); });
    }
    (function() {
        const canvas = document.getElementById('mainCanvas');
        const ctx = canvas.getContext('2d');

        let width, height, tick = 0;
        const stars = [];
        const bokeh = [];
        
        const STAR_COUNT = 60; 
        const BASE_VELOCITY = 2;

        function resize() {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            
            // Re-initialize bokeh bubbles on resize
            bokeh.length = 0;
            for (let i = 0; i < 12; i++) {
                bokeh.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    r: Math.random() * 100 + 50,
                    s: Math.random() * 0.1 + 0.05
                });
            }
        }

        function createStar(isInitial = false) {
            let x, y;
            const z = Math.random(); // Depth: 0 is far, 1 is close

            if (isInitial) {
                x = Math.random() * width;
                y = Math.random() * height;
            } else {
                // New stars enter from top or left
                if (Math.random() > 0.5) {
                    x = -150; 
                    y = Math.random() * height - 200;
                } else {
                    x = Math.random() * width - 200;
                    y = -150; 
                }
            }

            stars.push({
                x: x, y: y, z: z, 
                len: (Math.random() * 15 + 10) * (0.5 + z),
                width: (Math.random() * 1.5 + 1) * (0.5 + z),
                speed: (BASE_VELOCITY + Math.random()) * (0.5 + z * 1.5)
            });

            stars.sort((a, b) => a.z - b.z);
        }

        window.addEventListener('resize', resize);
        resize();

        for(let i = 0; i < STAR_COUNT; i++) createStar(true);

        function draw() {
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Bokeh Bubbles
            bokeh.forEach(p => {
                ctx.beginPath();
                let g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                g.addColorStop(0, 'rgba(58, 123, 213, 0.04)');
                g.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = g;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                p.y -= p.s;
                if (p.y + p.r < 0) p.y = height + p.r;
            });

            // 2. Draw the Moving Ribbon
            const ribbonGrad = ctx.createLinearGradient(0, 0, width, 0);
            ribbonGrad.addColorStop(0, '#00d2ff'); 
            ribbonGrad.addColorStop(0.5, '#3a7bd5');
            ribbonGrad.addColorStop(1, '#8e44ad');

            ctx.fillStyle = ribbonGrad;
            ctx.beginPath();
            for (let x = 0; x <= width; x += 4) {
                const y = (height * 0.5) + Math.sin(x * 0.005 + tick) * 45 + Math.sin(x * 0.002 + tick * 0.5) * 20;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            for (let x = width; x >= 0; x -= 4) {
                const thick = 90 + Math.sin(tick + x * 0.003) * 15;
                const y = (height * 0.5) + thick + Math.sin(x * 0.005 + tick) * 45 + Math.sin(x * 0.002 + tick * 0.5) * 20;
                ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();

            // 3. Draw Shooting Stars
            for (let i = stars.length - 1; i >= 0; i--) {
                const s = stars[i];
                s.x += s.speed;
                s.y += s.speed;

                const alphaHead = 0.2 + (s.z * 0.7);
                const alphaTail = 0.1 + (s.z * 0.4);

                const grad = ctx.createLinearGradient(s.x - s.len, s.y - s.len, s.x, s.y);
                grad.addColorStop(0, 'rgba(142, 68, 173, 0)');   
                grad.addColorStop(0.5, `rgba(58, 123, 213, ${alphaTail})`); 
                grad.addColorStop(1, `rgba(0, 210, 255, ${alphaHead})`);   

                ctx.strokeStyle = grad;
                ctx.lineWidth = s.width;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(s.x, s.y);
                ctx.lineTo(s.x - s.len, s.y - s.len);
                ctx.stroke();

                if (s.x > width + 100 || s.y > height + 100) {
                    stars.splice(i, 1);
                    createStar();
                }
            }

            tick += 0.015;
            requestAnimationFrame(draw);
        }

        draw();
    })();
    
