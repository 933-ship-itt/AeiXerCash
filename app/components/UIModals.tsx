'use client';

import { useEffect, type MouseEvent } from 'react';

declare global {
  interface Window {
    lucide?: {
      createIcons: () => void;
    };
  }
}

function closeClosestModal(event: MouseEvent<HTMLButtonElement>, selector: string) {
  event.currentTarget.closest(selector)?.classList.add('hidden');
}

/**
 * UIModals Component - Renders all modal templates without dangerouslySetInnerHTML
 * This fixes the hydration mismatch error by using proper React elements
 */
export function UIModals() {
  useEffect(() => {
    // Initialize lucide icons after mount
    window.lucide?.createIcons();
  }, []);

  return (
    <>
      {/* Canvas for drawing */}
      <canvas id="mainCanvas" />

      {/* Toast Container */}
      <div id="toast-container" className="toast-container"></div>

      {/* Error Modal */}
      <div id="error-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden">
        <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-sm mx-4 border-2 border-red-400 transform transition-all scale-100 duration-300 ease-out">
          <div className="flex items-center space-x-3 mb-4">
            <i data-lucide="alert-triangle" className="w-6 h-6 text-red-500"></i>
            <h3 className="text-xl font-bold text-slate-800">Error</h3>
          </div>
          <p id="error-modal-text" className="text-slate-600 mb-6"></p>
          <button onClick={(e) => closeClosestModal(e, '#error-modal')} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition duration-200 shadow-md">
            Dismiss
          </button>
        </div>
      </div>

      {/* Sign Out Modal */}
      <div id="signout-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden">
        <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl max-w-sm mx-4 border-2 border-blue-500 transform transition-all scale-100 duration-300 ease-out">
          <div className="flex items-center space-x-3 mb-4">
            <i data-lucide="log-out" className="w-6 h-6 text-blue-600"></i>
            <h3 className="text-xl font-bold text-slate-800">Sign Out Confirmation</h3>
          </div>
          <p className="text-slate-600 mb-6">Are you sure you want to sign out of your AeiXerCash Wallet?</p>
          <div className="flex space-x-4">
            <button onClick={(e) => closeClosestModal(e, '#signout-modal')} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-lg transition">Cancel</button>
            <button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Invoice Receipt Modal */}
      <div id="invoice-receipt-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-40 hidden p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all scale-100 duration-300 ease-out my-2 max-h-[95vh] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i data-lucide="receipt" className="w-5 h-5 text-green-600"></i>
              Transaction Receipt
            </h3>
            <button onClick={(e) => closeClosestModal(e, '#invoice-receipt-modal')} className="text-slate-400 hover:text-slate-600 transition">
              <i data-lucide="x" className="w-5 h-5"></i>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div id="invoice-receipt-modal-content" className="px-4 py-4 space-y-3 overflow-y-auto flex-1">
            {/* Amount */}
            <div className="text-center pb-3 border-b border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Amount to Send</p>
              <p id="invoice-amount" className="text-2xl font-bold text-slate-800">$0.00</p>
              <p className="text-xs text-slate-500">USDC</p>
            </div>

            {/* From */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">From</p>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <p id="invoice-from-addr" className="font-mono text-xs text-slate-700 break-all"></p>
              </div>
            </div>

            {/* To */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">To</p>
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <p id="invoice-to-name" className="font-semibold text-slate-800 text-xs mb-0.5"></p>
                <p id="invoice-to-addr" className="font-mono text-xs text-slate-600 break-all"></p>
              </div>
            </div>

            {/* Network */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Network</p>
              <div id="invoice-network" className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <p className="text-xs text-slate-700 font-medium"></p>
              </div>
            </div>

            {/* Transaction Details Block */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Asset Type</p>
                <p id="invoice-asset-type" className="text-xs font-bold text-slate-800">USDC</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Network Fee</p>
                <p id="invoice-network-fee" className="text-xs font-bold text-slate-800">~0.001 POL</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Total Debit</p>
                <p id="invoice-total-debit" className="text-xs font-bold text-blue-700">$0.00</p>
              </div>
            </div>

            {/* Message */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Message</p>
              <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
                <p id="invoice-message" className="text-sm text-slate-700"></p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 rounded-lg p-2 border border-amber-200 flex gap-2">
              <i data-lucide="alert-circle" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5"></i>
              <p className="text-xs text-amber-800"><strong>Important:</strong> Review address carefully. Transactions cannot be reversed.</p>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="px-4 py-3 bg-slate-50 rounded-b-2xl flex gap-2 border-t border-slate-200 flex-shrink-0">
            <button onClick={(e) => closeClosestModal(e, '#invoice-receipt-modal')} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-lg transition text-sm">
              Cancel
            </button>
            <button id="confirm-invoice-btn" className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-1 text-sm">
              <i data-lucide="check-circle" className="w-4 h-4"></i>
              Confirm
            </button>
          </div>
        </div>
      </div>

      {/* Manage Wallets Modal */}
      <div id="manage-wallets-modal" className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900 bg-opacity-40 hidden p-4">
        <div className="wallet-connect-modal rounded-2xl shadow-2xl max-w-2xl w-full p-0 bg-white flex flex-col" style={{ maxHeight: '90vh' }}>
          <div className="flex justify-between items-center p-6 border-b border-slate-200">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i data-lucide="settings-2" className="w-5 h-5 text-blue-600"></i>
              Manage Wallets
            </h3>
            <button onClick={(e) => closeClosestModal(e, '#manage-wallets-modal')} className="text-slate-400 hover:text-slate-600 transition">
              <i data-lucide="x" className="w-5 h-5"></i>
            </button>
          </div>
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <p className="text-xs text-blue-700">Select up to 6 wallets from your 100 derived addresses.</p>
            <span className="text-xs font-bold text-blue-700">Selected: <span id="manage-selected-count">0</span>/6</span>
          </div>
          <div id="manage-wallets-list" className="flex-1 overflow-y-auto divide-y divide-slate-100" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '200px' }}></div>
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button onClick={(e) => closeClosestModal(e, '#manage-wallets-modal')} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2.5 rounded-xl transition text-sm">Cancel</button>
            <button id="save-manage-wallets-btn" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
              <i data-lucide="check-circle" className="w-4 h-4"></i> Save & Activate
            </button>
          </div>
        </div>
      </div>

      {/* Send & Pay Overlay */}
      <div id="send-pay-overlay" className="fixed inset-0 z-50 flex items-center justify-center send-overlay-background hidden">
        {/* Animated orbs in background */}
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', background: 'radial-gradient(circle,rgba(124,58,237,0.2),transparent)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '250px', height: '250px', background: 'radial-gradient(circle,rgba(59,110,245,0.2),transparent)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}></div>

        <div className="send-overlay-card w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '92vh', overflow: 'hidden' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={() => { const el = document.getElementById('send-pay-overlay'); if (el) el.classList.add('hidden'); }} className="flex items-center gap-2 text-sm font-medium transition-all" style={{ color: 'rgba(255,255,255,0.6)' }}>
              <i data-lucide="arrow-left" className="w-4 h-4"></i> Back
            </button>
            <h2 className="text-white font-semibold text-lg">Send & Pay</h2>
            <div className="send-step-indicator" id="send-step-indicator">
              <div className="send-step-dot active" id="dot-1"></div>
              <div className="send-step-dot" id="dot-2"></div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Recipient */}
            <div id="send-step-1">
              <p className="text-sm font-medium mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Who are you sending to?</p>
              <div className="relative mb-2">
                <input type="text" id="recipient-input" placeholder="Email or wallet address" className="send-input pr-14" />
                <button id="lookup-recipient-btn" className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-xl transition-all" style={{ background: 'rgba(124,58,237,0.7)' }}>
                  <i data-lucide="search" className="w-4 h-4 text-white"></i>
                </button>
              </div>
              <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Enter email or Polygon address</p>
              <div id="recipient-info-container" className="mt-2"></div>
            </div>

            {/* Step 2: Amount + Confirm */}
            <div id="send-step-2" className="hidden">
              <div className="recipient-card-dark mb-5">
                <div className="flex items-center gap-3">
                  <img id="recipient-avatar" src="" alt="" className="w-11 h-11 rounded-full object-cover border-2" style={{ borderColor: 'rgba(124,58,237,0.5)' }} />
                  <div>
                    <p id="recipient-name" className="font-semibold text-white text-sm"></p>
                    <p id="recipient-email" className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}></p>
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>Select recipient wallet</p>
              <div id="recipient-wallets-list" className="max-h-40 overflow-y-auto mb-5 space-y-2"></div>

              <p className="text-sm font-medium mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>Amount (USDC)</p>
              <div className="relative mb-4">
                <input type="number" id="send-amount" min="0.01" step="0.01" placeholder="0.00" className="send-input pr-20" style={{ fontSize: '1.5rem', fontWeight: '700', letterSpacing: '-0.02em' }} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>USDC</span>
              </div>

              <div className="rounded-xl p-3 mb-5 text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sending from</span>
                  <span className="font-mono text-white" id="sender-wallet-display" style={{ fontSize: '0.7rem' }}></span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Available</span>
                  <span className="font-bold text-emerald-400" id="available-balance-display">$0.00</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs text-white mb-2 block">Add a note (optional)</label>
                <input id="send-message-input-overlay" type="text" placeholder="Add a message" className="send-input" />
              </div>

              <button id="confirm-send-btn" className="send-btn-primary mb-3 w-full">
                <span className="flex items-center justify-center gap-2">
                  <i data-lucide="send" className="w-4 h-4"></i> Confirm & Send
                </span>
              </button>
              <div className="text-center">
                <button id="back-to-step1-btn" className="send-btn-secondary">
                  ← Change recipient
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
