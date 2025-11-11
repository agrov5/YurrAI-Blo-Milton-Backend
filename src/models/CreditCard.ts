// TypeScript interfaces for Credit Card API response

import { Country, Address, ArgumentError, LookupOption } from "./Interfaces";

// Re-export common interfaces for convenience
export { Country, Address, ArgumentError };

/**
 * Credit card type lookup
 */
export interface CreditCardType extends LookupOption {}

/**
 * Credit card information
 */
export interface CreditCard {
  Type: CreditCardType;
  Number: string;
  NameOnCard: string;
  ExpirationDate: string;
  ExpirationMonth: number;
  ExpirationYear: number;
  SecurityCode: string;
  iDynamoSwipeData: string;
  Address: Address;
  ExpirationDateOffset: string;
  IsObfuscated: boolean;
  ObfuscationReason: string;
  ObfuscationDate: string;
}

/**
 * Customer credit card record
 */
export interface CreditCardRecord {
  ID: number;
  CustomerID: number;
  SpaID: number;
  CreditCardID: number;
  IsDefault: boolean;
  IsCloverCardReAuthenticated: boolean;
  LastUsedDate: string;
  BPS_PaymentOnFileId: string;
  CreditCard: CreditCard;
}

/**
 * API Response for credit card operations
 */
export interface CreditCardResponse {
  CreditCards: CreditCardRecord[];
  IsSuccess: boolean;
  ErrorCode: number;
  ErrorMessage: string;
  ArgumentErrors: ArgumentError[];
}
