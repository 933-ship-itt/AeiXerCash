/**
 * Email Service Utility
 * Handles sending transactional emails for invoices and confirmations
 */

interface EmailPayload {
  to: string;
  subject: string;
  recipientName?: string;
  senderName?: string;
  amount?: string;
  tokenSymbol?: string;
  walletAddress?: string;
  transactionHash?: string;
  network?: string;
  message?: string;
  explorerUrl?: string;
  timestamp?: string;
}

export async function sendInvoiceEmail(payload: EmailPayload): Promise<void> {
  try {
    // This will be integrated with a service like SendGrid, Resend, or similar
    // For now, we provide the structure
    const emailContent = generateInvoiceHTML(payload);

    // In production, you would call:
    // await fetch('/api/email/send', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ ...payload, html: emailContent })
    // })

    console.log('Invoice email prepared for:', payload.to);
    console.log('Subject:', payload.subject);
  } catch (error) {
    console.error('Failed to send invoice email:', error);
    throw new Error('Email service unavailable');
  }
}

export async function sendTransactionConfirmation(
  email: string,
  transactionData: {
    hash: string;
    amount: string;
    recipient: string;
    network: string;
    timestamp: string;
  }
): Promise<void> {
  const payload: EmailPayload = {
    to: email,
    subject: `Transaction Confirmed: ${transactionData.amount} USDC`,
    amount: transactionData.amount,
    tokenSymbol: 'USDC',
    transactionHash: transactionData.hash,
    walletAddress: transactionData.recipient,
    network: transactionData.network,
    timestamp: transactionData.timestamp,
  };

  await sendInvoiceEmail(payload);
}

function generateInvoiceHTML(data: EmailPayload): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b6ef5 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .amount { font-size: 32px; font-weight: bold; color: #3b6ef5; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-label { font-weight: 600; color: #4b5563; }
          .detail-value { color: #1f2937; word-break: break-all; }
          .button { background: #3b6ef5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Transaction Receipt</h1>
            <p>Your USDC payment has been processed</p>
          </div>
          <div class="content">
            ${data.amount ? `<div class="amount">${data.amount} ${data.tokenSymbol || 'USDC'}</div>` : ''}
            
            <div class="detail-row">
              <span class="detail-label">To:</span>
              <span class="detail-value">${data.recipientName || data.walletAddress || ''}</span>
            </div>
            
            ${data.network ? `
              <div class="detail-row">
                <span class="detail-label">Network:</span>
                <span class="detail-value">${data.network}</span>
              </div>
            ` : ''}
            
            ${data.transactionHash ? `
              <div class="detail-row">
                <span class="detail-label">Transaction Hash:</span>
                <span class="detail-value">${data.transactionHash.substring(0, 10)}...${data.transactionHash.substring(data.transactionHash.length - 10)}</span>
              </div>
            ` : ''}
            
            ${data.message ? `
              <div class="detail-row">
                <span class="detail-label">Message:</span>
                <span class="detail-value">${data.message}</span>
              </div>
            ` : ''}
            
            ${data.timestamp ? `
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${data.timestamp}</span>
              </div>
            ` : ''}
            
            ${data.explorerUrl ? `
              <a href="${data.explorerUrl}" class="button">View on Explorer</a>
            ` : ''}
            
            <div class="footer">
              <p>AeiXerCash • Non-Custodial USDC Wallet on Polygon</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export { generateInvoiceHTML };
