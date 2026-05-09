// import { Schema, model } from "mongoose";
import { ArgumentErrors, Treatment } from "./Treatment";
import { Room } from "./Room";
import { Employee } from "./Employee";
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
  MembershipBenefitItem,
  MembershipBenefitSubstituteItem,
  MembershipBenefitSubstitute,
  MembershipBenefit,
  SharedMembership,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
  CustomerNote,
  RepeatableValueInfo,
  RepeatableFieldValues,
  CustomerFieldValues,
  Photo,
  Child,
  CustomerLoyaltyRewards,
  CustomerStats,
  DepositOptions,
} from "./Interfaces";

// Re-export common interfaces for convenience
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
  MembershipBenefitItem,
  MembershipBenefitSubstituteItem,
  MembershipBenefitSubstitute,
  MembershipBenefit,
  SharedMembership,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
  CustomerNote,
  RepeatableValueInfo,
  RepeatableFieldValues,
  CustomerFieldValues,
  Photo,
  Child,
  CustomerLoyaltyRewards,
  CustomerStats,
  DepositOptions,
};

export interface CancelAppointment {
  appointmentId: number;
}

export interface AddAppointmentNotes {
  appointmentId: number;
  notes: string;
}

export interface AgentAppointment {
  email: string;
  phone: number;
  firstName: string;
  lastName: string;
  treatmentName: string;
  employeeName?: string;
  roomName?: string;
  appointmentDate: string;
  startTime: string;
  notes?: string;
}

// Credit Card interface (different from CreditCard.ts - has optional fields)
export interface CreditCard {
  Type?: LookupOption;
  Number?: string;
  NameOnCard?: string;
  ExpirationDate?: string;
  SecurityCode?: string;
  BillingZip?: string;
  iDynamoSwipeData?: string;
  Address?: Address;
  ExpirationDateOffset?: string;
  IsObfuscated?: boolean;
}

// Credit Account interface
export interface CreditAccount {
  CreditAccountID?: number;
  Type?: LookupOption;
  IsEnabled?: boolean;
  CreditLimit?: Money;
  AutoBillingThreshold?: number;
  Balance?: Money;
  IsBalanceBelowThreshold?: boolean;
  AvailableAmount?: Money;
  HasNonZeroBalance?: boolean;
  CreditCardID?: number;
  CreditCard?: CreditCard;
}

export interface Series {
  Name?: string;
  Description?: string;
  DisplayAppliesTo?: string;
  Status?: LookupOption;
  StatusID?: number;
  NeverOrdered?: boolean;
  Quantity?: number;
  UnitPrice?: Money;
  OriginalPrice?: Money;
  TechnicianFeeType?: LookupOption;
  TechnicianFeeAmount?: Money;
  TechnicianFeePercentage?: number;
  ExpirationDate?: string;
  DaysExpireFromPurchase?: number;
  DaysExpireFromUse?: number;
  SellOnline?: boolean;
  IsRedeemableForAnyCategory?: boolean;
  ExpirationDateOffset?: string;
}

export interface CustomerSeries {
  ID?: number;
  CustomerID?: number;
  SeriesID?: number;
  QuantityOriginal?: number;
  QuantityRemaining?: number;
  SeriesNo?: string;
  QuantityUsed?: number;
  StatusID?: number;
  DateIssued?: string;
  PurchasePrice?: Money;
  ExpirationDate?: string;
  Series?: Series;
  Status?: LookupOption;
  Balance?: number;
  PurchaseUnitPrice?: Money;
  DateIssuedOffset?: string;
  ExpirationDateOffset?: string;
}

export interface MarketingPayment {}

export interface PaymentItem {
  ID?: number;
  DisplayName?: string;
  Ach?: ACH;
  BankTransfer?: BankTransfer;
  Cash?: Cash;
  Check?: Check;
  CreditAccount?: CreditAccount;
  CustomerMembershipBenefit?: CustomerMembershipBenefit;
  MarketingPayment?: MarketingPayment;
  PayPal?: PayPal;
  RewardsPoints?: RewardsPoints;
  PostToRoom?: PostToRoom;
  DatePaid?: string;
  SignatureFile?: string;
  SignatureFileBase64Image?: string;
  AllowTips?: boolean;
  ForOrderItemID?: number;
  TipAmount?: Money;
  IsPreAuthTransaction?: boolean;
  CCPG_ID?: number;
  IsDeposit?: boolean;
  IsHold?: boolean;
  ExternalCreditCardPayment?: ExternalCreditCardPayment;
  DatePaidOffset?: string;
  CannotRefundOrVoidWithProcessor?: boolean;
  SubstituteCharge?: Money;
  IsPaid?: boolean;
  CcpgCreditCardType?: LookupOption;
  LastFourCreditCardNumber?: string;
  CustomerSeries?: CustomerSeries;
  CustomPaymentMethodID?: number;
  RemoteTransactionId?: string;
  Method?: LookupOption;
  CreditCard?: CreditCard;
  GiftCertificate?: GiftCertificate;
  Amount?: Money;
  Groupon?: Groupon;
  PartnerPayment?: PartnerPayment;
  Status?: LookupOption;
}

export interface AppointmentPayment {
  PaymentItem?: PaymentItem;
  CouponCode?: string;
}

// Customer related interfaces (simplified - already imported from Interfaces.ts)
// Keeping only Appointment-specific customer interfaces

export interface AppointmentCustomer {
  Notes?: CustomerNote[];
  ID?: number;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  HomePhone?: string;
  MobilePhone?: string;
  WorkPhone?: string;
  Address?: Address;
  OriginationID?: number;
  GUID?: string;
  SendEmail?: boolean;
  SendSMS?: boolean;
  MobilePhoneCarrierID?: number;
  PreferredCommunicationMethodID?: number;
  DateOfBirth?: string;
  GenderID?: number;
  CountryID?: number;
  CustomerFieldValues?: CustomerFieldValues;
  Child?: Child;
  DateOfBirthOffset?: string;
}

// Legacy Customer interface for backward compatibility
export interface Customer {
  Email: string;
  Phone: number;
  FirstName: string;
  LastName: string;
}

// Treatment related interfaces
export interface AppointmentTreatmentDTO {
  AppointmentTreatmentID?: number;
  TreatmentID?: number;
  EmployeeID?: number;
  Employee2ID?: number;
  RoomID?: number;
  StartTime?: string;
  EndTime?: string;
  RecoveryTime?: number;
  IsDurationOverridden?: boolean;
  LockToTechnician?: boolean;
  EmployeeWasRequested?: boolean;
  GapStartDuration?: number;
  GapProcessingDuration?: number;
  GapFinishDuration?: number;
  StartTimeOffset?: string;
  EndTimeOffset?: string;
}

// Full Appointment Request interface
export interface CreateAppointmentRequest {
  LocationID?: number;
  AppointmentPayment?: AppointmentPayment;
  Customer?: AppointmentCustomer;
  Customer2?: AppointmentCustomer;
  Notes?: string;
  ResourceTypeID?: number;
  IsPackage?: boolean;
  PackageID?: number;
  AppointmentDate?: string;
  AppointmentTreatmentDTOs?: AppointmentTreatmentDTO[];
  TempCreditCardID?: string;
  MarkAsConfirmed?: boolean;
  BlockoutID?: number;
  NeedsAutoApplyPayment?: boolean;
  ShowAppointmentIconFlags?: boolean;
  CreateIncompleteAppointment?: boolean;
  CampaignID?: number;
  ReferredByCustomerID?: number;
  AppointmentDateOffset?: string;
  access_token?: string;
}

// Complete Appointment interfaces for responses
export interface UserAppointmentPermissions {
  CanNoShow?: boolean;
  CanRevertNoShow?: boolean;
  CanConfirm?: boolean;
  CanUnConfirm?: boolean;
  CanCheckin?: boolean;
  CanUndoCheckin?: boolean;
  CanCheckinService?: boolean;
  CanTakePayment?: boolean;
  CanCancel?: boolean;
  CanTakeDeposit?: boolean;
  CanContinueIncomplete?: boolean;
}

export interface AppointmentIconFlags {
  CheckedIn?: boolean;
  Confirmed?: boolean;
  LinkPackage?: boolean;
  IsNewCustomer?: boolean;
  NoShow?: boolean;
  Notes?: boolean;
  PastDue?: boolean;
  Repeating?: boolean;
  WebBooking?: boolean;
  SameDayConfirmed?: boolean;
  HasPayment?: boolean;
  HasGCPayment?: boolean;
  HasSeriesPayment?: boolean;
  GroupPayment?: boolean;
  GroupPaymentCustomerPaysSeparately?: boolean;
  HasCart?: boolean;
  Paid?: boolean;
  CouplesTreatment?: boolean;
  IsMember?: boolean;
  FromFacebook?: boolean;
  FromTwitter?: boolean;
  DepositTaken?: boolean;
  IsHeldNotBooked?: boolean;
  FromItineraryBuilder?: boolean;
  OnClipboard?: boolean;
  HasSpecial?: boolean;
  IsOvernight?: boolean;
  BookedViaPromote?: boolean;
  WaiverCompleted?: boolean;
}

export interface AddOnNote {
  ProductID?: number;
  TreatmentID?: number;
  Note?: string;
  AppliesToName?: string;
}

export interface AddOnItem {
  Name?: string;
  TagPrice?: Money;
  ItemTypeID?: number;
  ItemID?: number;
  Quantity?: number;
  Notes?: AddOnNote[];
}

export interface DynamicPrice {
  OriginalPrice?: Money;
  Discount?: Money;
  FinalPrice?: Money;
  SpecialsSummary?: string;
  IsFinalPriceOverriden?: boolean;
  ReceiptDisplayPrice?: Money;
  OverrideReasonID?: number;
  OriginalTagPrice?: Money;
}

export interface Guest {
  ID?: number;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Email?: string;
  AddressID?: number;
  Address?: Address;
  CustomerID?: number;
  PackageID?: number;
  GenderID?: number;
  IsPrimaryPayer?: boolean;
  AllowReceiveEmails?: boolean;
  CountryID?: number;
  Child?: Child;
  CustomerFieldValues?: CustomerFieldValues;
  PreferredCommunicationMethodID?: number;
  HomePhone?: string;
  MobilePhone?: string;
  WorkPhone?: string;
  WorkPhoneExt?: string;
  AllowReceiveSMS?: boolean;
  MobilePhoneCarrierID?: number;
}

export interface CustomerCreditCard {
  ID?: number;
  CustomerID?: number;
  SpaID?: number;
  CreditCardID?: number;
  IsDefault?: boolean;
  IsCloverCardReAuthenticated?: boolean;
  LastUsedDate?: string;
  BPS_PaymentOnFileId?: string;
  CreditCard?: CreditCard;
}

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

export interface Package {
  ID?: number;
  Name?: string;
  Description?: string;
  Duration?: number;
  AllowCustomersToBookOnline?: boolean;
  IsActive?: boolean;
  SKU?: string;
  BillableItemID?: number;
  IsConcurrent?: boolean;
  OriginalPrice?: Money;
  DiscountAmount?: Money;
  Price?: Money;
}

// Complete Appointment object interface
export interface FullAppointmentObject {
  Type?: LookupOption;
  IsOldGroupAppointment?: boolean;
  IsGuestCheckedIn?: boolean;
  IsCheckedInInService?: boolean;
  Source?: LookupOption;
  Customer?: SharedCustomer;
  AppointmentPayment?: AppointmentPayment;
  PrimaryAppointmentTreatmentID?: number;
  BelongsToOrder?: boolean;
  CustomerID?: number;
  Customer2ID?: number;
  HasCustomer?: boolean;
  HasCustomer2?: boolean;
  CanHaveCustomer2?: boolean;
  GuestID?: number;
  HasGuest?: boolean;
  CancellationID?: number;
  PaymentID?: number;
  PaymentItemID?: number;
  RecurrenceID?: number;
  PreOrderFinalTotal?: Money;
  HasPackage?: boolean;
  PackageID?: number;
  PackageDynamicPriceID?: number;
  Notes?: string;
  RefCode?: string;
  RefPartnerID?: number;
  CustomerSMSOnBook?: boolean;
  GroupID?: number;
  BelongsToGroup?: boolean;
  BelongsToGroupAndGroupOrder?: boolean;
  IsGroupPrimaryPayer?: boolean;
  GroupNumber?: string;
  GroupName?: string;
  GroupOrderID?: number;
  GroupTypeID?: number;
  DateBooked?: string;
  DateNoShow?: string;
  IncompleteExpirationDateTime?: string;
  IsRecurring?: boolean;
  IsCustomerFlow?: boolean;
  IsAppointmentConfirmationSent?: boolean;
  IsAppointmentReminderSent?: boolean;
  IsPreBookedAtPastCheckout?: boolean;
  Customer2?: SharedCustomer;
  Guest?: Guest;
  Package?: Package;
  PackageDynamicPrice?: DynamicPrice;
  IsPastDue?: boolean;
  IsPastDueAndOrderNotPaid?: boolean;
  WasSameDayConfirmed?: boolean;
  HasPayment?: boolean;
  HasPaymentItems?: boolean;
  HasPaymentItemWithMethodForCancellationPolicy?: boolean;
  CustomerFirstName?: string;
  CustomerLastName?: string;
  CustomerEmail?: string;
  CustomerPreferredTechnicianGenderID?: number;
  CustomerAllergies?: string;
  CustomerMedications?: string;
  CustomerDateOfBirth?: string;
  CustomerHomePhone?: string;
  CustomerWorkPhone?: string;
  CustomerMobilePhone?: string;
  HasFinalStatus?: boolean;
  CustomerPreferredCommunicationMethodID?: number;
  CustomerHasActiveMembership?: boolean;
  Employee?: Employee;
  EmployeeFirstName?: string;
  EmployeeLastName?: string;
  EmployeeID?: number;
  TreatmentID?: number;
  Room?: Room;
  RoomName?: string;
  Treatment?: Treatment;
  TreatmentName?: string;
  IsNewCustomer?: boolean;
  HasAddons?: boolean;
  HasCart?: boolean;
  HasClass?: boolean;
  IsWebBooking?: boolean;
  OrderStatusID?: number;
  IsDepositTaken?: boolean;
  IsOrderPaid?: boolean;
  IsOrderClosed?: boolean;
  IsOrderPaidOrClosed?: boolean;
  IsPartOfClassPackageBooking?: boolean;
  HasReferral?: boolean;
  AllowAutoPay?: boolean;
  CanRevertNoShow?: boolean;
  IsCancelledOrNoShow?: boolean;
  AddressID?: number;
  Address?: Address;
  CanCancel?: boolean;
  CanCheckin?: boolean;
  CanUndoCheckin?: boolean;
  UserAppointmentPermissions?: UserAppointmentPermissions;
  AppointmentTreatments?: Treatment[];
  IsHeld?: boolean;
  HoldForMinutes?: number;
  HeldSince?: string;
  IsServiceComplete?: boolean;
  IsCheckout?: boolean;
  Child?: Child;
  DateCheckIn?: string;
  IsFromWaitList?: boolean;
  IsFromClassWaitList?: boolean;
  CustomerRecordTypeID?: number;
  CustomerParentID?: number;
  AppointmentIconFlags?: AppointmentIconFlags;
  AddOnItems?: AddOnItem[];
  DateBookedOffset?: string;
  DateNoShowOffset?: string;
  DateCheckInOffset?: string;
  IncompleteExpirationDateTimeOffset?: string;
  CustomerDateOfBirthOffset?: string;
  HeldSinceOffset?: string;
  ID?: number;
  LocationID?: number;
  BookingNumber?: string;
  DateCreated?: string;
  StartDateTime?: string;
  EndDateTime?: string;
  Confirmable?: boolean;
  IsCancelled?: boolean;
  IsNoShow?: boolean;
  CancellationFeeStatus?: any;
  CanTakePayment?: boolean;
  BelongsToEnrollment?: boolean;
  OrderID?: number;
  StartDateTimeOffset?: string;
  EndDateTimeOffset?: string;
  DateCreatedOffset?: string;
  FinalTotal?: Money;
  Status?: LookupOption;
}

// Legacy Appointment interface for backward compatibility
export interface Appointment {
  access_token: string;
  LocationID: number;
  ResourceTypeID: number;
  Customer: Customer;
  AppointmentTreatmentDTOs: AppointmentTreatmentDTO[];
  AppointmentDateOffset: string; // ISO datetime string
}

export interface CreateAppointmentResponse {
  Appointment?: FullAppointmentObject;
  IsSuccess?: boolean;
  ErrorCode?: number;
  ErrorMessage?: string;
  ArgumentErrors?: ArgumentError[];
  cardOnFile?: boolean;
}

// Legacy response interface for backward compatibility
export interface AppointmentResponse {
  Appointment: Appointment;
  IsSuccess: boolean;
  ErrorCode: number;
  ErrorMessage: string;
  ArgumentErrors: ArgumentErrors[];
}

// export const BookingModel = model("Booking", bookingSchema);
