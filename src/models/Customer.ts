/**
 * Customer Model Interfaces
 *
 * This file defines TypeScript interfaces for the SpaBooker Customer API.
 * It imports shared interfaces from common files to avoid duplication:
 *
 * From Interfaces.ts:
 * - LookupOption, Money, ACH, Address
 * - CustomerNote, Photo, CustomerStats, CustomerLoyaltyRewards
 * - CustomerFieldValues, RepeatableFieldValues, RepeatableValueInfo
 * - CustomerMembershipBenefit, CustomerMembershipLevel, SharedMembership
 * - MembershipBenefit, MembershipBenefitItem, MembershipBenefitSubstitute, MembershipBenefitSubstituteItem
 * - ArgumentError
 *
 * From CreditCard.ts:
 * - CreditCard, CreditCardRecord
 *
 * From Appointment.ts:
 * - CreditAccount
 */

// Import shared interfaces from common files
import {
  LookupOption,
  Money,
  ACH,
  Address,
  CustomerNote,
  Photo,
  CustomerStats,
  CustomerLoyaltyRewards,
  CustomerFieldValues,
  RepeatableFieldValues,
  RepeatableValueInfo,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
  SharedMembership,
  MembershipBenefit,
  MembershipBenefitItem,
  MembershipBenefitSubstitute,
  MembershipBenefitSubstituteItem,
  ArgumentError,
} from "./Interfaces";

import { CreditCard, CreditCardRecord } from "./CreditCard";

import { CreditAccount } from "./Appointment";

// Re-export imported interfaces for convenience
export {
  Address,
  LookupOption,
  Money,
  ACH,
  CreditAccount,
  CustomerMembershipBenefit,
  CustomerMembershipLevel,
  SharedMembership,
  MembershipBenefit,
  MembershipBenefitItem,
  MembershipBenefitSubstitute,
  MembershipBenefitSubstituteItem,
  CustomerNote,
  Photo,
  CustomerStats,
  CustomerLoyaltyRewards,
  CustomerFieldValues,
  RepeatableFieldValues,
  RepeatableValueInfo,
  CreditCard,
};

// Customer-specific Credit Card interface (extends CreditCardRecord from CreditCard.ts)
export interface CustomerCreditCard extends CreditCardRecord {}

// Main Customer interface
export interface Customer {
  // Personal Information
  ID?: number;
  FirstName?: string;
  LastName?: string;
  DateOfBirth?: string;
  DateOfBirthOffset?: string;
  AnniversaryDate?: string;
  AnniversaryDateOffset?: string;
  Gender?: LookupOption;
  Occupation?: string;
  PhotoUrl?: string;
  Photos?: Photo[];

  // Contact Information
  HomePhone?: string;
  CellPhone?: string;
  WorkPhone?: string;
  WorkPhoneExt?: string;
  Email?: string;
  Address?: Address;
  ShippingAddress?: Address;
  MobilePhoneCarrierID?: number;

  // Communication Preferences
  PreferredCommunicationMethod?: LookupOption;
  AllowReceiveEmails?: boolean;
  AllowReceivePromotionalEmails?: boolean;
  AllowReceiveSMS?: boolean;
  RequestedToBeForgotten?: boolean;

  // Location and Status
  LocationID?: number;
  LocationName?: string;
  CountryID?: number;
  IsActive?: boolean;
  IsNewCustomer?: boolean;

  // Authentication
  LoginName?: string;
  GUID?: string;

  // Preferences
  PreferredStaffGender?: LookupOption;
  PreferredStaffMemberID?: number;
  PreferredTipAmount?: number;

  // Alerts
  BookingAlert?: string;
  CheckInAlert?: string;
  CheckOutAlert?: string;
  LoginAlert?: string;

  // Membership Information
  MembershipCardNumber?: string;
  HasMembership?: boolean;
  HasActiveMembership?: boolean;
  HasPastMembership?: boolean;
  MembershipLevels?: CustomerMembershipLevel[];
  AvailableMembershipBenefits?: CustomerMembershipBenefit[];

  // Loyalty Information
  LoyaltyPoints?: number;
  LoyaltyRewards?: CustomerLoyaltyRewards;

  // Financial Information
  CreditCard?: CreditCard;
  CustomerCreditCards?: CustomerCreditCard[];
  CreditAccount?: CreditAccount;
  HasCreditAccount?: boolean;
  ACH?: ACH;
  HasUnpaidAppointments?: boolean;

  // Referral Information
  NumberOfReferrals?: number;
  ReferredByCustomerID?: number;

  // Emergency Contact
  EmergencyContactName?: string;
  EmergencyContactRelationShip?: string;
  EmergencyContactPhone?: string;

  // Notes and Custom Fields
  Notes?: CustomerNote[];
  CustomerFieldValues?: CustomerFieldValues;

  // Statistics
  CustomerStats?: CustomerStats;

  // System Information
  OriginationID?: number;
  DateCreated?: string;
  DateCreatedOffset?: string;
  DateLastModified?: string;
  DateLastModifiedOffset?: string;
  CustomerRecordType?: LookupOption;
  CanBeDeleted?: boolean;
}

// Existing Customer (wrapper for Customer with CustomerID)
export interface ExistingCustomer {
  Customer?: Customer;
  CustomerID?: number;
}

// API Response interfaces
export interface FindCustomersResponse {
  Customers?: ExistingCustomer[];
  IsSuccess?: boolean;
  ErrorCode?: number;
  ErrorMessage?: string;
  ArgumentErrors?: ArgumentError[];
}

// Search and Filter interfaces
export interface SearchSorter {
  SortBy?: string;
  SortDirection?: "Ascending" | "Descending";
}

export interface FindCustomersRequest {
  LocationID?: number;
  Phone?: string;
  FirstOrLastOrFullNameStart?: string;
  FirstNameStart?: string;
  LastNameStart?: string;
  Email?: string;
  UsePaging?: boolean;
  PageNumber?: number;
  PageSize?: number;
  SortBy?: SearchSorter[];
  FromDateLastModified?: string;
  ToDateLastModified?: string;
  FromDateCreated?: string;
  ToDateCreated?: string;
  IncludeFieldValuesInResults?: boolean;
  IsActive?: boolean;
  CustomerRecordType?: "Customer" | "Lead" | "All";
  IncludeRelationships?: boolean;
  LoadChildren?: boolean;
  FilterByExactLocationID?: boolean;
  FromDateLastModifiedOffset?: string;
  ToDateLastModifiedOffset?: string;
  FromDateCreatedOffset?: string;
  ToDateCreatedOffset?: string;
  access_token?: string;
}
