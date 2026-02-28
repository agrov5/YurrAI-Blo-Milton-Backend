/**
 * Order Model Interfaces
 *
 * This file defines TypeScript interfaces for the Booker Order API (GetOrder, etc.).
 *
 * Imports from Interfaces.ts (shared common types):
 * - LookupOption, Money, Address, ACH, ArgumentError
 * - BankTransfer, Cash, Check, GiftCertificate, Groupon, PayPal, RewardsPoints
 * - PostToRoom, PartnerPayment, ExternalCreditCardPayment, MarketingPayment
 * - CustomerNote, Photo, CustomerStats, CustomerLoyaltyRewards
 * - CustomerFieldValues, RepeatableFieldValues, RepeatableValueInfo
 * - MembershipBenefit, MembershipBenefitItem, MembershipBenefitSubstitute, MembershipBenefitSubstituteItem
 * - SharedMembership, CustomerMembershipBenefit, CustomerMembershipLevel
 *
 * Imports from Appointment.ts (shared appointment types):
 * - CreditCard, CreditAccount, Series, CustomerSeries, CustomerCreditCard, PaymentItem
 */

// ── Shared imports ────────────────────────────────────────────────────────────

import {
  LookupOption,
  Money,
  Address,
  ACH,
  ArgumentError,
  BankTransfer,
  Cash,
  Check,
  GiftCertificate,
  Groupon,
  PayPal,
  RewardsPoints,
  PostToRoom,
  PartnerPayment,
  ExternalCreditCardPayment,
  MarketingPayment,
  CustomerNote,
  Photo,
  CustomerStats,
  CustomerLoyaltyRewards,
  CustomerFieldValues,
  RepeatableFieldValues,
  RepeatableValueInfo,
  MembershipBenefit,
  MembershipBenefitItem,
  MembershipBenefitSubstitute,
  MembershipBenefitSubstituteItem,
  SharedMembership,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
} from "./Interfaces";

import {
  CreditCard,
  CreditAccount,
  Series,
  CustomerSeries,
  CustomerCreditCard,
  PaymentItem,
} from "./Appointment";

// Re-export for consumers of this file
export {
  LookupOption,
  Money,
  Address,
  ACH,
  ArgumentError,
  BankTransfer,
  Cash,
  Check,
  GiftCertificate,
  Groupon,
  PayPal,
  RewardsPoints,
  PostToRoom,
  PartnerPayment,
  ExternalCreditCardPayment,
  MarketingPayment,
  CustomerNote,
  Photo,
  CustomerStats,
  CustomerLoyaltyRewards,
  CustomerFieldValues,
  RepeatableFieldValues,
  RepeatableValueInfo,
  MembershipBenefit,
  MembershipBenefitItem,
  MembershipBenefitSubstitute,
  MembershipBenefitSubstituteItem,
  SharedMembership,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
  CreditCard,
  CreditAccount,
  Series,
  CustomerSeries,
  CustomerCreditCard,
  PaymentItem,
};

// ── Order-specific types ──────────────────────────────────────────────────────

/**
 * CreditCard2 – extended credit card with expiry month/year and obfuscation fields
 */
export interface CreditCard2 {
  Type?: LookupOption;
  Number?: string;
  NameOnCard?: string;
  ExpirationDate?: string;
  ExpirationMonth?: number;
  ExpirationYear?: number;
  SecurityCode?: string;
  iDynamoSwipeData?: string;
  Address?: Address;
  ExpirationDateOffset?: string;
  IsObfuscated?: boolean;
  ObfuscationReason?: string;
  ObfuscationDate?: string;
}

/**
 * Billable item – represents a service, product, or series on an order
 */
export interface BillableItem {
  Name?: string;
  Price?: Money;
  SKU?: string;
  Type?: LookupOption;
  TagPrice?: Money;
  ParentObjectID?: number;
  Barcode?: string;
}

/**
 * Track dynamic price – campaign tracking for dynamic pricing
 */
export interface TrackDynamicPrice {
  TrackCampaignID?: number;
}

/**
 * Price range – used by specials for range-based discounts
 */
export interface PriceRange {
  From?: number;
  To?: number;
  DiscountType?: string;
  DiscountAmount?: number;
}

/**
 * Special – discount/promotion definition
 */
export interface Special {
  ID?: number;
  LocationID?: number;
  Name?: string;
  Description?: string;
  CouponCode?: string;
  Type?: string;
  ShortUrl?: string;
  ApplicableStartDate?: string;
  ApplicableEndDate?: string;
  SpecialApplicableDateType?: LookupOption;
  BookingDateType?: LookupOption;
  BookingStartDate?: string;
  BookingEndDate?: string;
  BookingEarlyBirdUnit?: number;
  BookingEarlyBirdUnitType?: LookupOption;
  BookingLastMinuteUnit?: number;
  BookingLastMinuteUnitType?: LookupOption;
  MaxRedemptions?: number;
  TimeOfDayStart?: string;
  TimeOfDayEnd?: string;
  HasTreatment?: boolean;
  WeekDays?: string[];
  UsePriceRanges?: boolean;
  PriceRanges?: PriceRange[];
  DiscountType?: string;
  AdjustmentType?: string;
  DiscountAmount?: number;
  CanCustomerDirectBook?: boolean;
  HideOnInvoicesAndReceipts?: boolean;
  PhotoUrl?: string;
  UsedRedemptions?: number;
  AvailableRedemptions?: number;
  SpecialItems?: SpecialItem[];
  HasFreeItems?: boolean;
  FreeItems?: BillableItem[];
  PriceRangeScope?: LookupOption;
  ApplicableItemIDs?: number[];
  IsExclusiveWithAll?: boolean;
  IsExclusiveWithAny?: boolean;
  Exclusions?: LookupOption[];
  CombinationRules?: string;
  ApplicableStartDateOffset?: string;
  ApplicableEndDateOffset?: string;
  BookingStartDateOffset?: string;
  BookingEndDateOffset?: string;
  TimeOfDayStartOffset?: string;
  TimeOfDayEndOffset?: string;
  IsRecurringSpecial?: boolean;
  RecurringCount?: number;
  CanBeOveridden?: boolean;
}

/**
 * Special item collection – category/brand grouping within a special
 */
export interface SpecialItemCollection {
  ID?: number;
  Name?: string;
  Items?: BillableItem[];
  SubCategories?: LookupOption[];
}

/**
 * Special item – defines what items a special applies to
 */
export interface SpecialItem {
  Type?: LookupOption;
  IsGloballyApplicable?: boolean;
  Description?: string;
  Categories?: SpecialItemCollection[];
  Brands?: SpecialItemCollection[];
  Items?: BillableItem[];
}

/**
 * Special info – summary row used in applied-specials list
 */
export interface SpecialInfo {
  TotalDiscount?: number;
  ViewOrder?: number;
  Name?: string;
}

/**
 * Dynamic price special – a special applied within a dynamic price calculation
 */
export interface DynamicPriceSpecial {
  ID?: number;
  SpecialID?: number;
  DiscountAmount?: Money;
  TagDiscountAmount?: Money;
  IsFreeItem?: boolean;
  Special?: Special;
  SpecialTypeID?: number;
  DisplayName?: string;
  OveriddenCount?: number;
}

/**
 * Dynamic price – full pricing breakdown including applied specials
 */
export interface OrderDynamicPrice {
  Specials?: DynamicPriceSpecial[];
  OriginalPrice?: Money;
  Discount?: Money;
  FinalPrice?: Money;
  SpecialsSummary?: string;
  IsFinalPriceOverriden?: boolean;
  ReceiptDisplayPrice?: Money;
  OverrideReasonID?: number;
  OriginalTagPrice?: Money;
  TrackDynamicPrice?: TrackDynamicPrice;
  FinalTagPrice?: Money;
}

/**
 * Order item override – tracks price overrides
 */
export interface OrderItemOverride {
  OrderItemID?: number;
  PriceOverriddenByOrderItemID?: number;
}

/**
 * Refund – a refund applied to an order or order item
 */
export interface Refund {
  OrderID?: number;
  OrderItemID?: number;
  OrderPaymentItemID?: number;
  NewPaymentItemID?: number;
  ForOrderPaymentItemID?: number;
  Amount?: Money;
  OrderItem?: OrderItem;
  PaymentMethod?: LookupOption;
  TaxItemID?: number;
  TotalNonVatTax?: Money;
  TotalTax?: Money;
  Type?: LookupOption;
  DateCreated?: string;
  Notes?: string;
  DateCreatedOffset?: string;
}

/**
 * Base order item fields shared across all OrderItem subtypes
 */
export interface OrderItem {
  ID?: number;
  OrderID?: number;
  DateCreated?: string;
  AllowCommissionToEmployee?: boolean;
  AllowEarnLoyaltyRewards?: boolean;
  BillableItem?: BillableItem;
  BillableItemID?: number;
  CommissionToEmployeeID?: number;
  DynamicPrice?: OrderDynamicPrice;
  DynamicPriceID?: number;
  HasAmountForRefund?: boolean;
  IsRefundedCompletely?: boolean;
  IsPartiallyRefunded?: boolean;
  IsRetail?: boolean;
  IsService?: boolean;
  ParentOrderItem?: OrderItem;
  ParentOrderItemID?: number;
  PaymentItemID?: number;
  Quantity?: number;
  Refunds?: Refund[];
  TicketID?: number;
  Type?: LookupOption;
  AppointmentTreatmentID?: number;
  AppointmentID?: number;
  EmployeeID?: number;
  EmployeeName?: string;
  Employee2ID?: number;
  Employee2Name?: string;
  AppointmentCustomerID?: number;
  AppointmentCustomerName?: string;
  GuestID?: number;
  GuestName?: string;
  OrderItemOverride?: OrderItemOverride;
  GiftCardNumber?: string;
  IsGiftCard?: boolean;
  Description?: string;
  ChildID?: number;
  ChildName?: string;
  PackageTreatments?: AppointmentItemOrderItem[];
  PackageTreatmentAddons?: TreatmentAddonOrderItem[];
  PackageProducts?: ProductVariantOrderItem[];
  PackageSeries?: SeriesOrderItem[];
  TotalPriceDiscounts?: Money;
  AssociatedCustomerCreditCardId?: number;
  DisplayName?: string;
  IsRefundable?: boolean;
  RefundablePrice?: Money;
  RefundableAmountAllQuantity?: Money;
  RefundableTax?: Money;
  RefundableTaxAllQuantity?: Money;
  CustomerSeriesID?: number;
  CustomerMembershipID?: number;
  IncludeBenefitsThisMonth?: boolean;
  DayOfMonthToChargeAndAccrue?: number;
  AdditionalInitialChargeDate?: string;
  FirstPaymentOption?: LookupOption;
  UnitPrice?: Money;
  DateCreatedOffset?: string;
  ApplicableTaxItems?: number[];
  IsCancelled?: boolean;
  IsNoShow?: boolean;
  CancellationFeeStatus?: LookupOption;
}

/**
 * Appointment item order item – service appointment line item
 */
export interface AppointmentItemOrderItem extends OrderItem {
  ServiceDurationMinutes?: number;
}

/**
 * Treatment add-on order item – add-on for an appointment treatment
 */
export interface TreatmentAddonOrderItem extends OrderItem {}

/**
 * Product variant order item – retail product line item
 */
export interface ProductVariantOrderItem extends OrderItem {}

/**
 * Series order item – series/package purchase line item
 */
export interface SeriesOrderItem extends OrderItem {
  CustomerSeries?: CustomerSeries;
}

/**
 * Order tax item – a tax line item on the order
 */
export interface OrderTaxItem {
  AllowFlexible?: boolean;
  Amount?: Money;
  AppliedToNames?: string;
  IsVAT?: boolean;
  Name?: string;
  Rate?: string;
  TaxItemRate?: number;
  AmountRounded?: Money;
  TaxItemID?: number;
}

/**
 * Order refund information – summary of refunds on an order
 */
export interface OrderRefundInformation {
  IsAllDepositRefunded?: boolean;
  IsAllTaxRefunded?: boolean;
  PreTaxItemsRefundAmount?: Money;
  RefundedServiceChargeTagAmount?: Money;
  TotalRefundedAmount?: Money;
  TotalRefundedAmountExcludingChargedPaymentRefunds?: Money;
  TotalRefundedTaxAmount?: Money;
  TotalRefundedTaxes?: Money[];
}

/**
 * Order calculated amounts – computed balance fields
 */
export interface OrderCalculatedAmountsInformation {
  AmountChargedBeforeClosed?: Money;
  AmountPaidAfterRefunds?: Money;
  Balance?: Money;
  RemainingBalanceAfterReservedPayment?: Money;
  ReservedPaymentTotal?: Money;
}

/**
 * Order payment special – a special/coupon applied to a payment
 */
export interface OrderPaymentSpecial {
  CouponCode?: string;
  OrderPaymentID?: number;
  Special?: Special;
  SpecialID?: number;
}

/**
 * Benefit applicable order item – order item eligible for a membership benefit
 */
export interface BenefitApplicableOrderItem {
  OrderItemID?: number;
  ExpirationDate?: string;
  ExpirationDateOffset?: string;
  IsPaybleBySubstituteBenefit?: boolean;
}

/**
 * Series applicable order item – order item eligible for a customer series
 */
export interface SeriesApplicableOrderItem {
  OrderItemID?: number;
  OrderItemName?: string;
}

/**
 * Order item allowed action – per-item permission flag
 */
export interface OrderItemAllowedAction {
  IsAllowed?: boolean;
  ItemID?: number;
}

/**
 * Order allowed actions information – what actions are permitted on this order
 */
export interface OrderAllowedActionsInformation {
  AllowAddOrderItems?: boolean;
  AllowChangeOrderItemGCInfo?: OrderItemAllowedAction[];
  AllowChangeOrderItemQuantity?: OrderItemAllowedAction[];
  AllowChangeOrderItemTreatment?: OrderItemAllowedAction[];
  AllowClose?: boolean;
  AllowModifyOrderItemAtAll?: OrderItemAllowedAction[];
  AllowModifyOrderItemEmployees?: OrderItemAllowedAction[];
  AllowModifyOrderItemPrice?: OrderItemAllowedAction[];
  AllowModifyReservedPayment?: boolean;
  AllowRefundPaymentItemsAtAll?: boolean;
  AllowRemoveOrderItem?: OrderItemAllowedAction[];
  AllowRemoveOrderItems?: boolean;
  AllowSaveForLater?: boolean;
  AllowVoid?: boolean;
  AllowWholeOrderRefund?: boolean;
  AllowReceiptAndInvoice?: boolean;
  AllowAdditionalServiceOrderItems?: boolean;
  AllowAdditionalNonServiceOrderItems?: boolean;
  CanCloseZeroBalance?: boolean;
  AllowSpecials?: boolean;
  AllowPartialOrderRefund?: boolean;
}

/**
 * Order applicable payment on file – a stored payment method applicable to this order
 */
export interface OrderApplicablePaymentOnFile {
  AmountToCharge?: Money;
  BalanceAmount?: Money;
  BalanceQuantity?: number;
  BalanceRemainingQuantity?: number;
  BalanceType?: LookupOption;
  Benefit?: CustomerMembershipBenefit;
  Series?: CustomerSeries;
  CreditAccount?: CreditAccount;
  CreditCard?: CreditCard;
  GiftCertificate?: GiftCertificate;
  ExpirationDate?: string;
  ExpirationType?: LookupOption;
  Method?: LookupOption;
  OrderItemIDToApply?: number;
  OrderItemName?: string;
  RequiredPoints?: number;
  PrePaidPaymentCanCompleteOrder?: boolean;
  SeriesApplicableOrderItems?: SeriesApplicableOrderItem[];
  BenefitApplicableOrderItems?: BenefitApplicableOrderItem[];
  ExpirationDateOffset?: string;
}

/**
 * Order user permissions – what the current user may do on this order
 */
export interface OrderUserPermissions {
  AllowAddOrderItems?: boolean;
  AllowAddPayment?: boolean;
  AllowApplyDiscountToAll?: boolean;
  AllowChangeCustomer?: boolean;
  AllowChargeOrCloseOrder?: boolean;
  AllowDeleteOrderItems?: boolean;
  AllowDeletePayment?: boolean;
  AllowEditPayment?: boolean;
  AllowModifyTax?: boolean;
  AllowRefundChargedPayment?: boolean;
  AllowRefundOrderItems?: boolean;
  AllowSaveForLater?: boolean;
  AllowVoid?: boolean;
  ShowCustomerContactInfo?: boolean;
  ShowNotes?: boolean;
}

/**
 * Calculated order tip option (pre-calculated tip percentage)
 */
export interface CalculatedOrderTip {
  PercentAmount?: number;
  IsCustomerPreferred?: boolean;
  TipType?: string;
  TipAmount?: Money;
}

/**
 * Employee – plain employee data as returned in order responses
 */
export interface Employee {
  Email?: string;
  HomePhone?: string;
  MobilePhone?: string;
  MobilePhoneCarrierID?: number;
  NotifyBySMS?: boolean;
  PreferredPhoneType?: LookupOption;
  DateCreated?: string;
  UserID?: number;
  LockedToRoom?: number;
  Address?: Address;
  Status?: LookupOption;
  DateCreatedOffset?: string;
  ID?: number;
  LocationID?: number;
  FirstName?: string;
  LastName?: string;
  DisplayName?: string;
  Type?: string;
  Photo?: string;
  Signature?: string;
  ProfileDescription?: string;
  Rank?: number;
  Gender?: LookupOption;
}

/**
 * Technician tip – tip allocated to a specific technician/employee
 */
export interface TechnicianTip {
  Employee?: Employee;
  EmployeeID?: number;
  OrderID?: number;
  OrderItem?: OrderItem;
  OrderItemID?: number;
  TipAmount?: Money;
  IsRefunded?: boolean;
}

/**
 * Order payment – payment section of an order
 */
export interface OrderPayment {
  PaymentItems?: PaymentItem[];
  AllowAddACHPaymentItem?: boolean;
  AllowChangeAmount?: boolean;
  AllowEditInCompletedOrder?: boolean;
  AllowTips?: boolean;
  HasBoolPostToRoom?: boolean;
  HasCash?: boolean;
  HasCheck?: boolean;
  HasCreditAccount?: boolean;
  HasCreditCard?: boolean;
  HasMerchantGCWithBalance?: boolean;
  HasNonMerchantGiftCertificate?: boolean;
  HasNonRefundedZeroPayment?: boolean;
  HasPostToRoomOnly?: boolean;
  HasRewardsPoints?: boolean;
  HasSpaFinderGCWithBalance?: boolean;
  HasSpaFinderGiftCertificate?: boolean;
  OrderPaymentSpecials?: OrderPaymentSpecial[];
  UpdateOrderPrice?: boolean;
  HasUnpaidPaymentItems?: boolean;
  ChangeAmount?: Money;
  TipAmount?: Money;
  TotalAmount?: Money;
}

/**
 * Customer payment on file – stored payment methods for the order's customer
 */
export interface CustomerPaymentOnFile {
  Benefits?: CustomerMembershipBenefit[];
  CreditAccount?: CreditAccount;
  CreditCard?: CreditCard;
  Customer?: SharedCustomer;
  GiftCertificates?: GiftCertificate[];
  HasAnyPayment?: boolean;
  LoyaltyRewards?: CustomerLoyaltyRewards;
  Series?: CustomerSeries[];
}

/**
 * Shared customer – full customer object as returned within an Order response
 * (corresponds to SpaFinder.SpaBooker.Wcf.Contracts.Shared.Customer)
 */
export interface SharedCustomer {
  DateOfBirth?: string;
  AnniversaryDate?: string;
  PreferredCommunicationMethod?: LookupOption;
  MembershipCardNumber?: string;
  LoyaltyRewards?: CustomerLoyaltyRewards;
  CreditAccount?: CreditAccount;
  HasCreditAccount?: boolean;
  AvailableMembershipBenefits?: CustomerMembershipBenefit[];
  IsNewCustomer?: boolean;
  HasMembership?: boolean;
  HasPastMembership?: boolean;
  LoyaltyPoints?: number;
  MobilePhoneCarrierID?: number;
  Gender?: LookupOption;
  PhotoUrl?: string;
  Notes?: CustomerNote[];
  CustomerFieldValues?: CustomerFieldValues;
  LocationID?: number;
  LocationName?: string;
  Photos?: Photo[];
  BookingAlert?: string;
  CheckInAlert?: string;
  CheckOutAlert?: string;
  NumberOfReferrals?: number;
  CountryID?: number;
  PreferredStaffGender?: LookupOption;
  PreferredStaffMemberID?: number;
  IsActive?: boolean;
  Occupation?: string;
  ReferredByCustomerID?: number;
  EmergencyContactName?: string;
  EmergencyContactRelationShip?: string;
  EmergencyContactPhone?: string;
  LoginName?: string;
  LoginAlert?: string;
  CustomerStats?: CustomerStats;
  ACH?: ACH;
  MembershipLevels?: CustomerMembershipLevel[];
  DateOfBirthOffset?: string;
  AnniversaryDateOffset?: string;
  ID?: number;
  FirstName?: string;
  LastName?: string;
  HomePhone?: string;
  CellPhone?: string;
  WorkPhone?: string;
  Email?: string;
  GUID?: string;
  OriginationID?: number;
  HasActiveMembership?: boolean;
  AllowReceiveEmails?: boolean;
  AllowReceivePromotionalEmails?: boolean;
  RequestedToBeForgotten?: boolean;
  AllowReceiveSMS?: boolean;
  WorkPhoneExt?: string;
  HasUnpaidAppointments?: boolean;
  CanBeDeleted?: boolean;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
  PreferredTipAmount?: number;
  Address?: Address;
  ShippingAddress?: Address;
  CreditCard?: CreditCard;
  CustomerCreditCards?: CustomerCreditCard[];
  DateCreated?: string;
  DateLastModified?: string;
  CustomerRecordType?: LookupOption;
}

/**
 * Order – the main order object returned by GetOrder and related endpoints
 * (corresponds to SpaFinder.SpaBooker.Wcf.Contracts.Business.Order)
 */
export interface Order {
  Customer?: SharedCustomer;
  Payment?: OrderPayment;
  AllowedActionsInfo?: OrderAllowedActionsInformation;
  AmountsInfo?: OrderCalculatedAmountsInformation;
  ApplicablePaymentOnFile?: OrderApplicablePaymentOnFile[];
  ApplicableSpecials?: Special[];
  CalculatedTipAmountBase?: Money;
  CanAddTip?: boolean;
  CanHaveSplitTechnicianTips?: boolean;
  CanUseTipPercentage?: boolean;
  CashRegisterID?: number;
  CompletedByUserID?: number;
  CompletedByUserTypeID?: number;
  CompletedByUsername?: string;
  CreatedByEmployeeFirstName?: string;
  CreatedByEmployeeFullName?: string;
  CreatedByEmployeeID?: number;
  CreatedByEmployeeLastName?: string;
  CreatedByUserID?: number;
  CreatedByUsername?: string;
  CustomerPaymentOnFile?: CustomerPaymentOnFile;
  HasChargedPaymentItems?: boolean;
  HasChargedPaymentItemsNotRefunded?: boolean;
  HasClassPackage?: boolean;
  HasCreditAccountCharge?: boolean;
  HasEmployeeTips?: boolean;
  HasMembershipFee?: boolean;
  HasMembershipSignup?: boolean;
  HasNonPackageAppointment?: boolean;
  HasReservedPaymentItems?: boolean;
  HasTippablePayment?: boolean;
  IsAnyPriceInfoUpdated?: boolean;
  IsForPmsOnQ?: boolean;
  IsPriceRefreshed?: boolean;
  IsDeleted?: boolean;
  IsWholeOrderRefundTypeRefunded?: boolean;
  LastRefundDate?: string;
  ObligateToServiceCharge?: boolean;
  OrderItemsTypesUsedInTipPercentageCalculation?: LookupOption[];
  OrderUserPermissions?: OrderUserPermissions;
  PointsAccrued?: number;
  PreCalculatedTipOptions?: CalculatedOrderTip[];
  RequireSignature?: boolean;
  SavedInProgress?: boolean;
  ServiceCharge?: Money;
  ServiceChargeTagAmount?: Money;
  ServiceChargeTax?: Money;
  ServiceChargeTaxIsVAT?: boolean;
  ServiceChargeTaxRate?: number;
  ServiceTotal?: Money;
  ShipmentID?: number;
  ShippingCost?: Money;
  ShippingMethod?: LookupOption;
  Source?: LookupOption;
  TechnicianTips?: TechnicianTip[];
  WasEverCompleted?: boolean;
  HasAnyPayment?: boolean;
  HasAutomaticPayment?: boolean;
  OrderState?: LookupOption;
  AppliedSpecials?: SpecialInfo[];
  DateCreated?: string;
  DateFirstPaid?: string;
  DateLastModified?: string;
  DateCreatedOffset?: string;
  DateFirstPaidOffset?: string;
  DateLastModifiedOffset?: string;
  LastRefundDateOffset?: string;
  ETag?: string;
  IsPaymentInProcess?: boolean;
  IsPMSRepost?: boolean;
  IsShowPMSOrderStatus?: boolean;
  PMSCopyText?: string;
  ID?: number;
  OnlineCartID?: number;
  OrderNumber?: string;
  ReceiptNumber?: number;
  DateCompleted?: string;
  DatePaid?: string;
  LocationID?: number;
  SpaName?: string;
  CustomerFirstName?: string;
  CustomerFullName?: string;
  CustomerID?: number;
  CustomerLastName?: string;
  Items?: OrderItem[];
  OrderTaxItems?: OrderTaxItem[];
  PaymentID?: number;
  Refunds?: Refund[];
  HasFinalStatus?: boolean;
  HasGiftCertificates?: boolean;
  HasPackage?: boolean;
  HasPackageAddOns?: boolean;
  HasProducts?: boolean;
  IsShippable?: boolean;
  HasSeries?: boolean;
  HasShipment?: boolean;
  CanChargeAndClose?: boolean;
  CanHaveShipping?: boolean;
  HasTip?: boolean;
  HasTooMuchPayment?: boolean;
  HasTreatmentAddOns?: boolean;
  HasVATTax?: boolean;
  IsCompleted?: boolean;
  DateCompletedOffset?: string;
  DatePaidOffset?: string;
  IntendedPayments?: PaymentItem[];
  HasIntendedPayments?: boolean;
  Status?: LookupOption;
  ChangeAmount?: Money;
  OverPaymentAmount?: Money;
  TotalTaxes?: Money;
  TotalTip?: Money;
  TotalTaxesRounded?: Money;
  BalanceAfterRefunds?: Money;
  RefundsAmount?: Money;
  Discount?: Money;
  FinalTotal?: Money;
  GrandTotal?: Money;
  SubTotal?: Money;
  TotalPriceDiscounts?: Money;
  RefundInfo?: OrderRefundInformation;
}

/**
 * GetOrderResponse – top-level response wrapper for the GetOrder endpoint
 * (corresponds to SpaFinder.SpaBooker.Wcf.Contracts.Business.GetOrderResponse)
 */
export interface GetOrderResponse {
  IsSuccess?: boolean;
  ErrorCode?: number;
  ErrorMessage?: string;
  DetailedErrorCode?: number;
  DetailedErrorMessage?: string;
  Order?: Order;
  ArgumentErrors?: ArgumentError[];
}
