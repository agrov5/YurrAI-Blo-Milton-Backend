/**
 * Common Interfaces
 *
 * This file contains shared TypeScript interfaces used across multiple model files
 * in the SpaBooker API implementation. These interfaces represent common data structures
 * like addresses, money amounts, lookup options, and API response structures.
 *
 * Import these interfaces in your model files instead of redefining them.
 */

// ==================== Base/Common Interfaces ====================

/**
 * Standard lookup option used throughout the API for ID/Name pairs
 * (e.g., Gender, Status, Type, etc.)
 */
export interface LookupOption {
  ID?: number | null;
  Name?: string | null;
}

/**
 * Money/Currency amount representation
 */
export interface Money {
  Amount?: number;
  CurrencyCode?: string;
}

/**
 * Country information
 */
export interface Country {
  ID: number;
  Name: string;
}

/**
 * Address structure - used in multiple contexts
 * Note: There are two variations in the codebase
 */
export interface Address {
  Street1?: string;
  Street2?: string;
  City?: string;
  State?: string;
  Zip?: string;
  Country?: Country | LookupOption;
}

/**
 * ACH (Bank Account) information
 */
export interface ACH {
  BankRoutingNumber?: string;
  BankName?: string;
  CheckingAccountNumber?: string;
}

// ==================== API Response Interfaces ====================

/**
 * Standard error structure for API argument validation errors
 */
export interface ArgumentError {
  ArgumentName?: string;
  ErrorMessage?: string;
}

/**
 * Alternate name used in some endpoints
 */
export interface ArgumentErrors extends ArgumentError {}

/**
 * Standard API Response wrapper - used across multiple endpoints
 */
export interface ApiResponse<T = any> {
  IsSuccess?: boolean;
  ErrorCode?: number;
  ErrorMessage?: string;
  ArgumentErrors?: ArgumentError[];
  Results?: T[];
  TotalResultsCount?: number;
}

// ==================== Date/Time Interfaces ====================

/**
 * Common date fields pattern used across entities
 */
export interface DateAuditFields {
  DateCreated?: string;
  DateCreatedOffset?: string;
  DateLastModified?: string;
  DateLastModifiedOffset?: string;
}

// ==================== Payment Related Interfaces ====================

/**
 * Bank transfer payment information
 */
export interface BankTransfer {
  BankingDetails?: string;
}

/**
 * Cash payment (empty placeholder)
 */
export interface Cash {}

/**
 * Check payment information
 */
export interface Check {
  CheckNumber?: string;
}

/**
 * Gift Certificate payment information
 */
export interface GiftCertificate {
  Type?: LookupOption;
  Number?: string;
  IsGiftCard?: boolean;
  ExpirationDate?: string;
  RemainingBalance?: Money;
  ExpirationDateOffset?: string;
}

/**
 * Groupon payment information
 */
export interface Groupon {
  GrouponVoucher?: string;
}

/**
 * PayPal payment information
 */
export interface PayPal {
  PayPalEmail?: string;
}

/**
 * Rewards points payment
 */
export interface RewardsPoints {
  Points?: number;
}

/**
 * Post to room payment (for hotel/resort bookings)
 */
export interface PostToRoom {
  RoomNumber?: string;
  RoomGuestName?: string;
}

/**
 * Partner payment information
 */
export interface PartnerPayment {
  Logo?: string;
  PaymentReference?: string;
  PaymentBranding?: string;
}

/**
 * External credit card payment details (Clover, Stripe, etc.)
 */
export interface ExternalCreditCardPayment {
  CloverPaymentItemID?: string;
  CloverTransactionNo?: string;
  CardLast4?: string;
  CardType?: string;
  AuthCode?: string;
  Type?: string;
  CloverOrderID?: string;
  Result?: string;
  CloverEmployeeID?: string;
  EntryType?: string;
  TerminalID?: string;
  CvmResult?: string;
  AID?: string;
  PaymentIntentId?: string;
  PaymentIntentClientToken?: string;
  User?: any;
  MindbodyPaymentsChargeId?: string;
  CloverPaymentID?: string;
}

/**
 * Marketing payment (empty placeholder)
 */
export interface MarketingPayment {}

// ==================== Deposit Options ====================

/**
 * Deposit options for services/treatments
 */
export interface DepositOptions {
  HasAmountType?: boolean;
  AmountType?: string;
  Amount?: number;
  Percentage?: number;
  Enabled?: boolean;
}

// ==================== Customer Related Interfaces ====================

/**
 * Customer note/comment
 */
export interface CustomerNote {
  ID?: number;
  DateCreated?: string;
  Text?: string;
  CreatedByUser?: string;
  DateCreatedOffset?: string;
}

/**
 * Photo attachment
 */
export interface Photo {
  DateUploaded?: string;
  Title?: string;
  Notes?: string;
  IsDefault?: boolean;
  FileName?: string;
  ID?: number;
  DateUploadedOffset?: string;
}

/**
 * Customer statistics/metrics
 */
export interface CustomerStats {
  DateOfFirstVisit?: string;
  DateOfLastVisit?: string;
  TotalServiceSales?: number;
  TotalRetailSales?: number;
  TotalTips?: number;
  TotalSales?: number;
  DateOfFirstVisitOffset?: string;
  DateOfLastVisitOffset?: string;
}

/**
 * Customer loyalty rewards information
 */
export interface CustomerLoyaltyRewards {
  AvailablePoints?: number;
  AvailableAmount?: Money;
  ExpirationDate?: string;
  ExpirationDateOffset?: string;
}

/**
 * Field value (generic key-value pair for custom fields)
 */
export interface FieldValue {
  [key: string]: any;
}

/**
 * Repeatable field value information
 */
export interface RepeatableValueInfo {
  FieldSetValueID?: number;
  Action?: LookupOption;
  FieldValues?: Record<number, FieldValue> | any[];
}

/**
 * Repeatable field values collection
 */
export interface RepeatableFieldValues {
  FieldSetID?: number;
  FieldSetValues?: RepeatableValueInfo[];
}

/**
 * Customer field values (custom fields)
 */
export interface CustomerFieldValues {
  ID?: number;
  CustomerTypeID?: number;
  FieldValues?: Record<number, FieldValue> | any[];
  RepeatableFieldValues?: RepeatableFieldValues[];
}

/**
 * Child entity (for customer relationships)
 */
export interface Child {
  ID?: number;
  Name?: string;
  CustomerTypeID?: number;
  FieldValues?: any[];
  RepeatableFieldValues?: RepeatableFieldValues[];
  LocationID?: number;
  ParentIDs?: number[];
  LocationName?: string;
  DateCreated?: string;
  DateLastModified?: string;
  BookingAlert?: string;
  CheckInAlert?: string;
  CheckOutAlert?: string;
  Photos?: Photo[];
  IsActive?: boolean;
  CustomerType?: LookupOption;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
}

// ==================== Membership Related Interfaces ====================

/**
 * Membership benefit item - defines what items a benefit applies to
 */
export interface MembershipBenefitItem {
  TreatmentCategoryId?: number;
  TreatmentSubCategoryId?: number;
  ProductCategoryId?: number;
  ProductSubCategoryId?: number;
  ClassCategoryId?: number;
  ProductId?: number;
  TreatmentId?: number;
  ApplicableToAllTreatments?: boolean;
}

/**
 * Membership benefit substitute item - alternative items for benefits
 */
export interface MembershipBenefitSubstituteItem extends MembershipBenefitItem {
  ID?: number;
  Price?: Money;
  TagPrice?: Money;
}

/**
 * Membership benefit substitute - alternative benefit definition
 */
export interface MembershipBenefitSubstitute {
  Name?: string;
  ID?: number;
  Description?: string;
  Status?: LookupOption;
  MembershipBenefitID?: number;
  MembershipBenefitSubstituteItems?: MembershipBenefitSubstituteItem[];
}

/**
 * Membership benefit definition
 */
export interface MembershipBenefit {
  Name?: string;
  Description?: string;
  Status?: LookupOption;
  MembershipLevelID?: number;
  FreeItemQuantity?: number;
  IsUnlimited?: boolean;
  DaysTillExpiration?: number;
  ExpirationTypeID?: number;
  ID?: number;
  MembershipBenefitItems?: MembershipBenefitItem[];
  MembershipBenefitSubstitute?: MembershipBenefitSubstitute[];
}

/**
 * Shared membership information
 */
export interface SharedMembership {
  CustomerID?: number;
  CustomerName?: string;
}

/**
 * Customer membership benefit - customer's usage of a benefit
 */
export interface CustomerMembershipBenefit {
  CustomerID?: number;
  TotalEarnedQuantity?: number;
  UsedQuantity?: number;
  ExpiredQuantity?: number;
  AvailableQuantity?: number;
  IsUnlimited?: boolean;
  IsExpired?: boolean;
  MembershipBenefit?: MembershipBenefit;
  ID?: number;
  MembershipExpirationDate?: string;
  MembershipName?: string;
  CustomerMembershipID?: number;
  LevelName?: string;
  OnlineDescription?: string;
  MembershipCardNumber?: string;
  CustomerCreditCardID?: number;
  PaymentFrequencyType?: LookupOption;
  NextChargeDate?: string;
  NumberOfPaymentsMade?: number;
  HasAutopay?: boolean;
  ProratedFee?: number;
  SignupFee?: number;
  StartDate?: string;
  Status?: LookupOption;
  SuspendDate?: string;
  TotalFee?: number;
  LastChargeDate?: string;
  TotalCharged?: number;
  SharedMemberships?: SharedMembership[];
  IsPurchasedOnline?: boolean;
  MembershipExpirationDateOffset?: string;
  NextChargeDateOffset?: string;
  StartDateOffset?: string;
  SuspendDateOffset?: string;
  LastChargeDateOffset?: string;
}

/**
 * Customer membership level information
 */
export interface CustomerMembershipLevel {
  ID?: number;
  LevelName?: string;
  Description?: string;
  HasBenefits?: boolean;
  IsExternallyManaged?: boolean;
  Status?: LookupOption;
  SoldBySpaId?: number;
  IsLastTransactionFailed?: boolean;
  PastDueDate?: string;
  IsSharedMembership?: boolean;
}

// ==================== Gender/Status Interfaces ====================

/**
 * Gender lookup (used in Employee)
 */
export interface Gender {
  ID: number;
  Name: string;
}

/**
 * Status lookup (used in Employee)
 */
export interface Status {
  ID: number;
  Name: string;
}

/**
 * Preferred phone type
 */
export interface PreferredPhoneType {
  ID: number;
  Name: string;
}
