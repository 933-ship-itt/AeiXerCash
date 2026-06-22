'use client';

import { useSyncExternalStore } from "react";
import Script from "next/script";
import "../styles/aeixercash.css";

export default function Home() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "AeiXerCash",
            "description": "Non-custodial USDC wallet for Polygon blockchain. Send, receive, and manage crypto payments.",
            "url": "https://aeixercash.app",
            "applicationCategory": "FinanceApplication",
            "operatingSystem": "Web",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150"
            }
          }),
        }}
      />

      {/* External Library Scripts */}
      <Script src="https://cdn.jsdelivr.net/npm/ethers@6.11.0/dist/ethers.umd.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/lucide@latest" strategy="beforeInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/apexcharts" strategy="beforeInteractive" />

            {/* Main UI Containers injected directly */}
      {/* Main UI Containers injected directly */}
      {mounted ? (
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
    <canvas id="mainCanvas"></canvas>


    <div id="toast-container" class="toast-container"></div>

    <!-- Error Modal -->
    <div id="error-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden">
        <div class="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-sm mx-4 border-2 border-red-400 transform transition-all scale-100 duration-300 ease-out">
            <div class="flex items-center space-x-3 mb-4">
                <i data-lucide="alert-triangle" class="w-6 h-6 text-red-500"></i>
                <h3 class="text-xl font-bold text-slate-800">Error</h3>
            </div>
            <p id="error-modal-text" class="text-slate-600 mb-6"></p>
            <button onclick="closeErrorModal()" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md">
                Dismiss
            </button>
        </div>
    </div>
    
    <!-- Sign Out Modal -->
    <div id="signout-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden">
        <div class="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-sm mx-4 border-2 border-blue-500 transform transition-all scale-100 duration-300 ease-out">
            <div class="flex items-center space-x-3 mb-4">
                <i data-lucide="log-out" class="w-6 h-6 text-blue-600"></i>
                <h3 class="text-xl font-bold text-slate-800">Sign Out Confirmation</h3>
            </div>
            <p class="text-slate-600 mb-6">Are you sure you want to sign out of your AeiXerCash Wallet?</p>
            <div class="flex space-x-4">
                <button onclick="closeSignOutModal()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-lg transition">Cancel</button>
                <button onclick="handleSignOutAndCloseModal()" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition">Sign Out</button>
            </div>
        </div>
    </div>

<!-- Invoice Receipt Modal -->
    <div id="invoice-receipt-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden p-2 sm:p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all scale-100 duration-300 ease-out my-2 max-h-[95vh] flex flex-col">
            <!-- Header -->
            <div class="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="receipt" class="w-5 h-5 text-green-600"></i>
                    Transaction Receipt
                </h3>
                <button onclick="closeInvoiceModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <!-- Content - Scrollable -->
            <div id="invoice-receipt-modal-content" class="px-4 py-4 space-y-3 overflow-y-auto flex-1">
                <!-- Amount -->
                <div class="text-center pb-3 border-b border-slate-200">
                    <p class="text-xs text-slate-500 uppercase tracking-widest mb-1">Amount to Send</p>
                    <p id="invoice-amount" class="text-2xl font-bold text-slate-800">$0.00</p>
                    <p class="text-xs text-slate-500">USDC</p>
                </div>
                
                <!-- From -->
                <div>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">From</p>
                    <div class="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p id="invoice-from-addr" class="font-mono text-xs text-slate-700 break-all"></p>
                    </div>
                </div>
                
                <!-- To -->
                <div>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">To</p>
                    <div class="bg-blue-50 rounded-lg p-2 border border-blue-200">
                        <p id="invoice-to-name" class="font-semibold text-slate-800 text-xs mb-0.5"></p>
                        <p id="invoice-to-addr" class="font-mono text-xs text-slate-600 break-all"></p>
                    </div>
                </div>
                
                <!-- Network -->
                <div>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Network</p>
                    <div id="invoice-network" class="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p class="text-xs text-slate-700 font-medium"></p>
                    </div>
                </div>
                
                <!-- Transaction Details Block -->
                <div class="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Asset Type</p>
                        <p id="invoice-asset-type" class="text-xs font-bold text-slate-800">USDC</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Network Fee</p>
                        <p id="invoice-network-fee" class="text-xs font-bold text-slate-800">~0.001 POL</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Total Debit</p>
                        <p id="invoice-total-debit" class="text-xs font-bold text-blue-700">$0.00</p>
                    </div>
                </div>
                
                <!-- Message -->
                <div>
                    <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Message</p>
                    <div class="bg-slate-50 rounded-lg p-2 border border-slate-200">
                        <p id="invoice-message" class="text-sm text-slate-700"></p>
                    </div>
                </div>
                
                <!-- Warning -->
                <div class="bg-amber-50 rounded-lg p-2 border border-amber-200 flex gap-2">
                    <i data-lucide="alert-circle" class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
                    <p class="text-xs text-amber-800"><strong>Important:</strong> Review address carefully. Transactions cannot be reversed.</p>
                </div>
            </div>
            
            <!-- Footer - Fixed at bottom -->
            <div class="px-4 py-3 bg-slate-50 rounded-b-2xl flex gap-2 border-t border-slate-200 flex-shrink-0">
                <button onclick="closeInvoiceModal()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-lg transition text-sm">
                    Cancel
                </button>
                <button id="confirm-invoice-btn" class="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1 text-sm">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    Confirm
                </button>
            </div>
        </div>
    </div>

    <!-- Manage Wallets Modal -->
    <div id="manage-wallets-modal" class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-40 hidden p-4">
        <div class="wallet-connect-modal rounded-2xl shadow-2xl max-w-2xl w-full p-0 bg-white flex flex-col" style="max-height:90vh;">
            <div class="flex justify-between items-center p-6 border-b border-slate-200">
                <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="settings-2" class="w-5 h-5 text-blue-600"></i>
                    Manage Wallets
                </h3>
                <button onclick="closeManageWalletsModal()" class="text-slate-400 hover:text-slate-600 transition">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
                <p class="text-xs text-blue-700">Select up to 6 wallets from your 100 derived addresses.</p>
                <span class="text-xs font-bold text-blue-700">Selected: <span id="manage-selected-count">0</span>/6</span>
            </div>
            <div id="manage-wallets-list" class="flex-1 overflow-y-auto divide-y divide-slate-100" style="max-height: calc(100vh - 400px); min-height: 200px;"></div>
            <div class="p-5 bg-slate-50 border-t border-slate-200 flex gap-3">
                <button onclick="closeManageWalletsModal()" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 rounded-xl transition text-sm">Cancel</button>
                <button id="save-manage-wallets-btn" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> Save & Activate
                </button>
            </div>
        </div>
    </div>

    <!-- Wallet Connect Modal (user flows: enter OR create mnemonic) -->
    <div id="wallet-connect-modal" class="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-40 hidden p-4">
        <div class="wallet-connect-modal rounded-2xl shadow-2xl max-w-2xl w-full text-center p-8 bg-white">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <i data-lucide="wallet" class="w-6 h-6 text-blue-600"></i>
                    Connect Your Wallets
                </h3>
                <button onclick="cancelWalletConnect()" class="text-slate-400 hover:text-slate-600 transition">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            
            <div id="wallet-step-1">
                <p class="text-slate-600 mb-4">Enter your 12‑word recovery phrase to link your wallets, or create a new wallet below.</p>
                <textarea id="mnemonic-input" rows="3" placeholder="e.g. abandon abandon abandon ..." 
                    class="w-full px-4 py-3 bg-slate-50 text-slate-800 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition duration-150 font-mono text-sm"></textarea>
                
                <div class="flex justify-between items-center mt-2 text-sm">
                    <span class="text-slate-500">Word count: <span id="word-count">0</span>/12</span>
                    <span id="word-validation-icon" class="text-amber-600">
                        <i data-lucide="info" class="w-4 h-4"></i>
                    </span>
                </div>
                
                <div id="word-chips" class="flex flex-wrap gap-2 mt-4 justify-center max-h-24 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50"></div>
                
                <button id="verify-mnemonic-btn" disabled
                    class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md opacity-50 cursor-not-allowed">
                    <i data-lucide="shield" class="w-5 h-5 inline mr-2"></i>
                    Verify & Continue
                </button>

                <button id="create-wallet-btn" class="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-3 rounded-lg transition">
                    I don't have a wallet — create one for me
                </button>
                
                <p class="text-xs text-slate-400 mt-4">Your phrase is never stored unless you choose to link derived addresses to your account. You remain in control.</p>
            </div>
            
            <div id="wallet-step-2" class="hidden">
                <h4 class="text-lg font-bold text-slate-800 mb-3">Select up to 6 wallets to connect</h4>
                <p class="text-xs text-slate-500 mb-3">Derived from Polygon Mainnet. We found the first 100 addresses under this phrase. Check the boxes for wallets you want to add (max 6).</p>
                
                <div id="address-list-container" class="address-list mb-4 max-h-96 border-slate-200 overflow-y-auto" style="max-height: calc(100vh - 500px); min-height: 200px;">
                    <div class="text-center py-4 text-slate-500">Loading addresses...</div>
                </div>
                <div class="text-xs text-slate-500 mb-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    Showing first 100 derived addresses. Scroll to explore more wallets and select your favorites.
                </div>
                
                <div class="flex items-center justify-between mb-4">
                    <div><span class="text-sm text-slate-500">Selected: <span id="selected-count">0</span>/6</span></div>
                    <span class="text-sm text-slate-500">Total USDC: <span id="total-usdc-balance">0.00</span></span>
                </div>
                
                <button id="finalize-wallet-connection" disabled class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md opacity-50 cursor-not-allowed">
                    <i data-lucide="check-circle" class="w-5 h-5 inline mr-2"></i>
                    Continue & Link Selected Wallets
                </button>
            </div>
            
            <p class="text-xs text-slate-400 mt-6">
                Your phrase is never stored. It is used only to derive your wallet addresses. You are in control of your keys.
            </p>
        </div>
    </div>

    <!-- Mnemonic Education Modal -->
    <div id="mnemonic-education-modal" class="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900 bg-opacity-60 hidden p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-bold">Keep your recovery phrase safe</h3>
                <button onclick="document.getElementById('mnemonic-education-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <p class="text-sm text-slate-600">A recovery phrase (mnemonic) is the only key to your funds. AeiXerCash does not store this phrase. If you lose it you lose access.</p>
            <ul class="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-2">
                <li>Write the 12 words on paper and store them securely; do not take photos or store in plain cloud notes.</li>
                <li>Never share your phrase with anyone — AeiXerCash will never ask for it.</li>
                <li>USDC on Polygon is used for payments; keep a small MATIC balance for gas when sending transactions.</li>
                <li>We are fully non‑custodial and do not perform KYC — you control keys and custody.</li>
            </ul>
            <div class="mt-5 flex gap-3 justify-end">
                <button id="education-cancel-btn" class="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Cancel</button>
                <button id="education-understood-btn" class="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Understood — Create my wallet</button>
            </div>
        </div>
    </div>

    <!-- Generated Mnemonic Modal -->
    <div id="generated-mnemonic-modal" class="fixed inset-0 z-[80] flex items-center justify-center bg-gray-900 bg-opacity-60 hidden p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6">
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-lg font-bold">Your new recovery phrase</h3>
                <button onclick="document.getElementById('generated-mnemonic-modal').classList.add('hidden')" class="text-slate-400 hover:text-slate-600"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            <p class="text-sm text-amber-700">Important: write these words down and store them in a safe place. Do not share them with anyone.</p>
            <div id="generated-mnemonic-display" class="mt-4 grid grid-cols-3 gap-2 font-mono text-sm"></div>
            <div class="mt-4 flex gap-3 justify-end">
                <button id="generated-copy-btn" class="px-3 py-2 rounded-lg border border-slate-200">Copy</button>
                <button id="generated-regenerate-btn" class="px-3 py-2 rounded-lg border border-slate-200">Regenerate</button>
                <button id="generated-confirm-btn" class="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold">I saved it securely — Link wallet</button>
            </div>
        </div>
    </div>

    <!-- Password Setup Modal for Mnemonic Wallets -->
    <div id="password-setup-modal" class="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900 bg-opacity-60 hidden p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-2xl font-bold text-slate-800 mb-2">Set Your Wallet Password</h3>
            <p class="text-sm text-slate-600 mb-4">Protect this wallet with a strong password. This password is stored only on this device, not on our servers.</p>
            
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                    <input id="password-input" type="password" placeholder="Enter a strong password" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                
                <div>
                    <label class="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
                    <input id="password-confirm-input" type="password" placeholder="Confirm your password" class="w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" />
                </div>
                
                <div class="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-700">
                    <strong>Security Note:</strong> Use a strong, unique password. We cannot recover lost passwords.
                </div>
            </div>
            
            <div class="flex gap-3 mt-5">
                <button id="cancel-password-btn" class="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition">Cancel</button>
                <button id="confirm-password-btn" class="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">Save Password</button>
            </div>
        </div>
    </div>

    <!-- =================== SKELETON LOADING TEMPLATES =================== -->
    
    <!-- Balance Card Skeleton -->
    <div id="balance-card-skeleton-template" class="balance-card-skeleton hidden">
        <div class="relative z-10">
            <div class="balance-skeleton-label"></div>
            <div class="balance-skeleton-value"></div>
            <div class="balance-skeleton-label" style="width: 30%; margin-top: 16px;"></div>
        </div>
    </div>

    <!-- Transaction List Skeleton (3 items) -->
    <div id="tx-list-skeleton-template" class="hidden space-y-2">
        <div class="tx-card-skeleton">
            <div class="tx-icon-skeleton"></div>
            <div class="tx-details-skeleton flex-1">
                <div class="tx-name-skeleton"></div>
                <div class="tx-amount-skeleton"></div>
            </div>
            <div class="tx-time-skeleton"></div>
        </div>
        <div class="tx-card-skeleton">
            <div class="tx-icon-skeleton"></div>
            <div class="tx-details-skeleton flex-1">
                <div class="tx-name-skeleton"></div>
                <div class="tx-amount-skeleton"></div>
            </div>
            <div class="tx-time-skeleton"></div>
        </div>
        <div class="tx-card-skeleton">
            <div class="tx-icon-skeleton"></div>
            <div class="tx-details-skeleton flex-1">
                <div class="tx-name-skeleton"></div>
                <div class="tx-amount-skeleton"></div>
            </div>
            <div class="tx-time-skeleton"></div>
        </div>
    </div>

    <!-- Payment Receipt Skeleton -->
    <div id="payment-receipt-skeleton-template" class="hidden px-4 py-4 space-y-3">
        <!-- Amount skeleton -->
        <div class="text-center pb-3 border-b border-slate-200">
            <div class="receipt-skeleton-line short mx-auto" style="width: 120px; height: 10px; margin-bottom: 8px;"></div>
            <div class="receipt-skeleton-line medium mx-auto" style="height: 20px; width: 160px;"></div>
            <div class="receipt-skeleton-line short mx-auto" style="width: 80px; height: 10px;"></div>
        </div>

        <!-- From skeleton -->
        <div>
            <div class="receipt-skeleton-line short" style="width: 80px; margin-bottom: 8px;"></div>
            <div class="receipt-skeleton-box">
                <div class="receipt-skeleton-line long"></div>
                <div class="receipt-skeleton-line medium"></div>
            </div>
        </div>

        <!-- To skeleton -->
        <div>
            <div class="receipt-skeleton-line short" style="width: 60px; margin-bottom: 8px;"></div>
            <div class="receipt-skeleton-box">
                <div class="receipt-skeleton-line medium"></div>
                <div class="receipt-skeleton-line long"></div>
            </div>
        </div>

        <!-- Network skeleton -->
        <div>
            <div class="receipt-skeleton-line short" style="width: 80px; margin-bottom: 8px;"></div>
            <div class="receipt-skeleton-box">
                <div class="receipt-skeleton-line medium"></div>
            </div>
        </div>

        <!-- Message skeleton -->
        <div>
            <div class="receipt-skeleton-line short" style="width: 80px; margin-bottom: 8px;"></div>
            <div class="receipt-skeleton-box">
                <div class="receipt-skeleton-line long"></div>
            </div>
        </div>
    </div>

    <!-- Wallet Card Skeleton -->
    <div id="wallet-card-skeleton-template" class="hidden">
        <div class="wallet-card-skeleton">
            <div class="wallet-address-skeleton"></div>
            <div class="wallet-balance-skeleton"></div>
        </div>
    </div>

    <!-- =================== END SKELETON TEMPLATES =================== -->

    <!-- Send & Pay Overlay — fullscreen dark -->
    <div id="send-pay-overlay" class="fixed inset-0 z-50 flex items-center justify-center send-overlay-background hidden">
        <!-- Animated orbs in background -->
        <div style="position:absolute;top:10%;left:15%;width:300px;height:300px;background:radial-gradient(circle,rgba(124,58,237,0.2),transparent);border-radius:50%;filter:blur(40px);pointer-events:none;"></div>
        <div style="position:absolute;bottom:15%;right:10%;width:250px;height:250px;background:radial-gradient(circle,rgba(59,110,245,0.2),transparent);border-radius:50%;filter:blur(40px);pointer-events:none;"></div>

        <div class="send-overlay-card w-full max-w-md mx-4 flex flex-col" style="max-height:92vh;overflow:hidden;">
            <!-- Header -->
            <div class="flex items-center justify-between p-5 flex-shrink-0" style="border-bottom:1px solid rgba(255,255,255,0.08);">
                <button onclick="closeSendPayOverlay()" class="flex items-center gap-2 text-sm font-medium transition-all" style="color:rgba(255,255,255,0.6);" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
                </button>
                <h2 class="text-white font-semibold text-lg">Send & Pay</h2>
                <div class="send-step-indicator" id="send-step-indicator">
                    <div class="send-step-dot active" id="dot-1"></div>
                    <div class="send-step-dot" id="dot-2"></div>
                </div>
            </div>

            <!-- Scrollable content -->
            <div class="flex-1 overflow-y-auto p-6">
                <!-- Step 1: Recipient -->
                <div id="send-step-1">
                    <p class="text-sm font-medium mb-3" style="color:rgba(255,255,255,0.55);">Who are you sending to?</p>
                    <div class="relative mb-2">
                        <input type="text" id="recipient-input" placeholder="Email or wallet address"
                               class="send-input pr-14">
                        <button id="lookup-recipient-btn" class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-xl transition-all" style="background:rgba(124,58,237,0.7);" onmouseover="this.style.background='rgba(124,58,237,1)'" onmouseout="this.style.background='rgba(124,58,237,0.7)'">
                            <i data-lucide="search" class="w-4 h-4 text-white"></i>
                        </button>
                    </div>
                    <p class="text-xs mb-4" style="color:rgba(255,255,255,0.35);">Enter an email with linked wallets or a Polygon address</p>
                    <div id="recipient-info-container" class="mt-2"></div>
                </div>

                <!-- Step 2: Amount + Confirm -->
                <div id="send-step-2" class="hidden">
                    <div class="recipient-card-dark mb-5">
                        <div class="flex items-center gap-3">
                            <img id="recipient-avatar" src="" class="w-11 h-11 rounded-full object-cover border-2" style="border-color:rgba(124,58,237,0.5);" onerror="this.src='https://placehold.co/100x100/7c3aed/FFFFFF?text=?'">
                            <div>
                                <p id="recipient-name" class="font-semibold text-white text-sm"></p>
                                <p id="recipient-email" class="text-xs" style="color:rgba(255,255,255,0.5);"></p>
                            </div>
                        </div>
                    </div>

                    <p class="text-sm font-medium mb-3" style="color:rgba(255,255,255,0.55);">Select recipient wallet</p>
                    <div id="recipient-wallets-list" class="max-h-40 overflow-y-auto mb-5 space-y-2"></div>

                    <p class="text-sm font-medium mb-2" style="color:rgba(255,255,255,0.55);">Amount (USDC)</p>
                    <div class="relative mb-4">
                        <input type="number" id="send-amount" min="0.01" step="0.01" placeholder="0.00"
                               class="send-input pr-20" style="font-size:1.5rem;font-weight:700;letter-spacing:-0.02em;">
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style="color:rgba(255,255,255,0.45);">USDC</span>
                    </div>

                    <div class="rounded-xl p-3 mb-5 text-xs" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);">
                        <div class="flex justify-between mb-1">
                            <span style="color:rgba(255,255,255,0.5);">Sending from</span>
                            <span class="font-mono text-white" id="sender-wallet-display" style="font-size:0.7rem;"></span>
                        </div>
                        <div class="flex justify-between">
                            <span style="color:rgba(255,255,255,0.5);">Available</span>
                            <span class="font-bold text-emerald-400" id="available-balance-display">$0.00</span>
                        </div>
                    </div>

                    <div class="mt-3">
                        <label class="text-xs text-white mb-2 block">Add a note (optional)</label>
                        <input id="send-message-input-overlay" type="text" placeholder="Add a message to the transaction"
                               class="send-input" />
                    </div>

                    <button id="confirm-send-btn" class="send-btn-primary mb-3">
                        <span class="flex items-center justify-center gap-2">
                            <i data-lucide="send" class="w-4 h-4"></i> Confirm & Send
                        </span>
                    </button>
                    <div class="text-center">
                        <button id="back-to-step1-btn" class="send-btn-secondary">
                            ← Change recipient
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Header (unchanged) -->
    <header id="main-header" class="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-slate-200 transition-opacity duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
                <div class="flex items-center"><span class="text-2xl font-extrabold tracking-tight text-gradient">AeiXerCash</span></div>
                <nav class="hidden md:flex space-x-8">
                    <a href="#features" class="text-slate-600 hover:text-blue-700 font-medium transition duration-150 border-b-2 border-transparent hover:border-blue-600">Features</a>
                    <a href="#mission" class="text-slate-600 hover:text-blue-700 font-medium transition duration-150 border-b-2 border-transparent hover:border-blue-600">Mission</a>
                    <a href="#" class="text-slate-600 hover:text-blue-700 font-medium transition duration-150 border-b-2 border-transparent hover:border-blue-600">Developers</a>
                </nav>
                <div><button id="nav-launch-wallet" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 shadow-md">Launch <span class="text-white">Wallet</span></button></div>
                <button id="menu-button" class="md:hidden text-slate-600 hover:text-blue-700"><i data-lucide="menu" class="w-6 h-6"></i></button>
            </div>
        </div>
        <div id="mobile-menu" class="hidden md:hidden px-4 pt-2 pb-4 space-y-2 border-t border-slate-200 bg-white">
            <a href="#features" class="block text-slate-600 hover:text-blue-700 font-medium transition duration-150">Features</a>
            <a href="#mission" class="block text-slate-600 hover:text-blue-700 font-medium transition duration-150">Mission</a>
            <a href="#" class="block text-slate-600 hover:text-blue-700 font-medium transition duration-150">Legal</a>
            
            <button id="mobile-launch-wallet" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 mt-2 shadow-md">Launch Wallet</button>
        </div>
    </header>
    
    <div id="app-view-container"></div>

    <footer id="main-footer" class="py-12 bg-white border-t border-slate-200 transition-opacity duration-300">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-2 md:grid-cols-5 gap-8 border-b border-slate-200 pb-8 mb-8">
                <div class="col-span-2 md:col-span-1"><div class="flex items-center mb-3"><span class="text-xl font-extrabold tracking-tight text-gradient">AeiXerCash</span></div><p class="text-sm text-slate-500 mt-2">User‑first USDC wallet • Free Checkout APIs for businesses</p></div>
                <div><h4 class="text-lg font-bold mb-4 text-slate-800">Products</h4><ul class="space-y-3 text-slate-500 text-sm"><li><a href="#" class="hover:text-blue-700 transition">Checkout (Free)</a></li><li><a href="#" class="hover:text-blue-700 transition">CLI</a></li><li><a href="#" class="hover:text-blue-700 transition">Developer Docs</a></li></ul></div>
                <div><h4 class="text-lg font-bold mb-4 text-slate-800">Resources</h4><ul class="space-y-3 text-slate-500 text-sm"><li><a href="#" class="hover:text-blue-700 transition">Whitepaper</a></li><li><a href="#" class="hover:text-blue-700 transition">Careers</a></li><li><a href="#" class="hover:text-blue-700 transition">Contact</a></li></ul></div>
                <div><h4 class="text-lg font-bold mb-4 text-slate-800">Legal</h4><ul class="space-y-3 text-slate-500 text-sm"><li><a href="#" class="hover:text-blue-700 transition">Terms of Service</a></li><li><a href="#" class="hover:text-blue-700 transition">Privacy Policy</a></li><li><a href="#" class="hover:text-blue-700 transition">Security Policy</a></li></ul></div>
                <div><h4 class="text-lg font-bold mb-4 text-slate-800">Community</h4><ul class="flex space-x-4 text-slate-500"><li><a href="#" aria-label="Twitter" class="hover:text-blue-700 transition"><i data-lucide="send" class="w-5 h-5"></i></a></li><li><a href="#" aria-label="Telegram" class="hover:text-blue-700 transition"><i data-lucide="send" class="w-5 h-5"></i></a></li><li><a href="#" aria-label="GitHub" class="hover:text-blue-700 transition"><i data-lucide="send" class="w-5 h-5"></i></a></li></ul></div>
            </div>
            <div class="flex flex-col md:flex-row justify-between items-center text-sm text-slate-500"><p>&copy; 2026 AeiXerCash. All rights reserved. Built for the future of digital currency.</p><p class="mt-2 md:mt-0">Secure · Fast · Business‑Ready</p></div>
        </div>
    </footer>

    <!-- Transaction Details Modal -->
    <div id="tx-details-modal" class="fixed inset-0 z-60 flex items-center justify-center bg-gray-900 bg-opacity-50 hidden p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <img id="tx-details-photo" src="https://placehold.co/56" alt="avatar" class="tx-details-photo">
                    <div>
                        <h3 id="tx-details-title" class="text-lg font-bold">Transaction</h3>
                        <p id="tx-details-account" class="text-sm text-slate-500"></p>
                    </div>
                </div>
                <div class="text-right">
                    <div id="tx-details-amount-big" class="tx-details-amount">0.00</div>
                    <div class="text-xs text-slate-400">USDC</div>
                </div>
            </div>
            <div id="tx-details-content" class="text-sm text-slate-700 space-y-3">
                <div><strong>Date:</strong> <span id="tx-details-date"></span></div>
                <div><strong>From:</strong> <span id="tx-details-from" class="font-mono break-all"></span></div>
                <div><strong>To:</strong> <span id="tx-details-to" class="font-mono break-all"></span></div>
                <div><strong>Message:</strong>
                    <div id="tx-details-message" class="mt-1 p-2 bg-slate-50 rounded text-slate-600"></div>
                </div>
                <div><strong>Tx Hash:</strong>
                    <div class="flex items-center gap-2 mt-1 w-full">
                        <a id="tx-details-link" href="#" target="_blank" class="text-blue-600 hover:underline font-mono tx-details-link flex-1"></a>
                        <button id="tx-copy-hash" class="ml-2 bg-slate-100 px-2 py-1 rounded">Copy</button>
                    </div>
                </div>
            </div>
            <div class="mt-4 flex justify-end gap-2">
                <button onclick="closeTxDetails()" class="px-4 py-2 rounded bg-slate-100">Close</button>
                <button id="tx-view-explorer" onclick="(function(){ const href = document.getElementById('tx-details-link')?.href; if(href) window.open(href,'_blank'); })()" class="px-4 py-2 rounded bg-blue-600 text-white">View on Explorer</button>
            </div>
        </div>
    </div>
          `,
        }}
      />
      ) : null}

      {/* Core Legacy JS Logic */}
      {mounted ? <Script src="/js/aeixercash.js" strategy="afterInteractive" type="module" /> : null}
    </>
  );
}
