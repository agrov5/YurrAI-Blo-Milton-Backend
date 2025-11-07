// TypeScript interfaces for Credit Card API response

export interface Country {
  ID: number;
  Name: string;
}

export interface Address {
  Street1: string;
  Street2: string;
  City: string;
  State: string;
  Zip: string;
  Country: Country;
}

export interface CreditCardType {
  ID: number;
  Name: string;
}

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

export interface ArgumentError {
  ArgumentName: string;
  ErrorMessage: string;
}

export interface CreditCardResponse {
  CreditCards: CreditCardRecord[];
  IsSuccess: boolean;
  ErrorCode: number;
  ErrorMessage: string;
  ArgumentErrors: ArgumentError[];
}
