/**
 * Transaction Validation Utility
 * Ensures all transactions require mandatory Google authentication
 */

export interface TransactionValidationRequest {
  senderAddress: string;
  recipientEmail?: string;
  recipientAddress?: string;
  amount: string;
  userGoogleId: string | null;
  userGoogleLinked: boolean;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  requiresGoogleAuth?: boolean;
  message?: string;
}

/**
 * Validates a transaction before execution
 * Mandatory checks:
 * 1. User must have Google account linked
 * 2. Valid recipient (email or address)
 * 3. Valid amount (> 0)
 * 4. Sufficient balance (checked separately)
 */
export function validateTransaction(
  request: TransactionValidationRequest
): ValidationResult {
  // Check 1: Google account must be linked
  if (!request.userGoogleLinked || !request.userGoogleId) {
    return {
      isValid: false,
      requiresGoogleAuth: true,
      error: 'Google account linking is mandatory for transactions',
      message: 'Please link your Google account to continue with transactions',
    };
  }

  // Check 2: Valid recipient
  if (!request.recipientEmail && !request.recipientAddress) {
    return {
      isValid: false,
      error: 'Either email address or wallet address must be provided',
    };
  }

  // Check 3: Validate email format
  if (request.recipientEmail && !isValidEmail(request.recipientEmail)) {
    return {
      isValid: false,
      error: 'Invalid email address format',
    };
  }

  // Check 4: Validate wallet address
  if (request.recipientAddress && !isValidAddress(request.recipientAddress)) {
    return {
      isValid: false,
      error: 'Invalid wallet address format',
    };
  }

  // Check 5: Valid sender address
  if (!isValidAddress(request.senderAddress)) {
    return {
      isValid: false,
      error: 'Invalid sender wallet address',
    };
  }

  // Check 6: Valid amount
  const amountNum = parseFloat(request.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than 0',
    };
  }

  // Check 7: Minimum amount (0.01 USDC)
  if (amountNum < 0.01) {
    return {
      isValid: false,
      error: 'Minimum transaction amount is 0.01 USDC',
    };
  }

  // Check 8: No self-transfer via address
  if (
    request.recipientAddress &&
    request.recipientAddress.toLowerCase() === request.senderAddress.toLowerCase()
  ) {
    return {
      isValid: false,
      error: 'Cannot send to the same address',
    };
  }

  return {
    isValid: true,
    message: 'Transaction validation passed',
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidAddress(address: string): boolean {
  // Ethereum/Polygon address validation
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Creates an audit log entry for transaction validation
 * Useful for security and compliance
 */
export function createTransactionAuditLog(
  request: TransactionValidationRequest,
  result: ValidationResult,
  timestamp: string
): string {
  return JSON.stringify(
    {
      timestamp,
      googleUserId: request.userGoogleId,
      senderAddress: request.senderAddress,
      recipientEmail: request.recipientEmail ? hashString(request.recipientEmail) : null,
      recipientAddress: request.recipientAddress ? request.recipientAddress.substring(0, 10) + '...' : null,
      amount: request.amount,
      validated: result.isValid,
      error: result.error,
    },
    null,
    2
  );
}

function hashString(str: string): string {
  // Simple hash for privacy - in production use proper hashing
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 8);
}

export default {
  validateTransaction,
  isValidEmail,
  isValidAddress,
  createTransactionAuditLog,
};
