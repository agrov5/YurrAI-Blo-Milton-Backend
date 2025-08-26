export interface FindTreatmentsResponse {
  ArgumentErrors?: ArgumentErrors[];
  ErrorCode?: number;
  ErrorMessage?: string;
  IsSuccess?: boolean;
  Treatments?: Treatment[];
  TotalResultsCount?: number;
}

interface ArgumentErrors {
  ArgumentName?: string;
  ErrorMessage?: string;
}

export interface Treatment {
  EmployeeRecoveryDuration?: number;
  RoomRecoveryDuration?: number;
  RequiresProcessingTime?: boolean;
  ProcessingTimeDuration?: number;
  ProcessingTimeAppliedToEmployee?: boolean;
  ProcessingTimeAppliedToRoom?: boolean;
  FinishTimeDuration?: number;
  FinishTimeAppliedToEmployee?: boolean;
  FinishTimeAppliedToRoom?: boolean;
  RoomIDs?: number[];
  EmployeeIDs?: number[];
  EmployeeTreatments?: EmployeeTreatment[];
  BrandTreatmentID?: number;
  ID?: number;
  BillableItemID?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  Category?: LookupOption;
  SubCategory?: LookupOption;
  Name?: string;
  DisplayName?: string;
  Description?: string;
  TotalDuration?: number;
  TreatmentDuration?: number;
  AllowCustomersToBookOnline?: boolean;
  ImageURL?: string;
  Price?: Money;
  DurationType?: LookupOption;
  MinTreatmentDuration?: number; // decimal
  MaxTreatmentDuration?: number; // decimal
  IsSharedService?: boolean;
  SharedRoomGuestCount?: number;
  IsBoundingService?: boolean;
  IsFlexiblePrice?: boolean;
  IsForCouples?: boolean;
  DoesNotRequireStaff?: boolean;
  AvailableInAdvance?: number;
  AvailableInAdvanceDateUnitType?: LookupOption;
  FlexiblePriceIncrementType?: LookupOption;
  ColorCode?: string;
  DateCreated?: string; // ISO datetime
  DateLastModified?: string; // ISO datetime
  CustomerRecordType?: LookupOption;
  IsClass?: boolean;
  CustomerTypeID?: number;
  CustomerTypeName?: string;
  RequiresTwoTechnicians?: boolean;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
  IsVerifiedVisibleInOnlineBooking?: boolean;
  DepositOptions?: DepositOptions;
  OnlineMenuType?: LookupOption;
}

/** ---- Referenced Types ---- */

export interface EmployeeTreatment {
  EmployeeID?: number;
  TreatmentDuration?: number;
  RequestedPrice?: number;
  FinishTimeDuration?: number;
  ProcessingTimeDuration?: number;
}

export interface LookupOption {
  ID?: number;
  Name?: string;
}

export interface Money {
  Amount?: number;
  CurrencyCode?: string;
}

export interface DepositOptions {
  HasAmountType?: boolean;
  AmountType?: string;
  Amount?: number;
  Percentage?: number;
  Enabled?: boolean;
}

// Schema

import mongoose, { Schema, Document } from "mongoose";

interface ITreatment extends Document {
  EmployeeRecoveryDuration?: number;
  RoomRecoveryDuration?: number;
  RequiresProcessingTime?: boolean;
  ProcessingTimeDuration?: number;
  ProcessingTimeAppliedToEmployee?: boolean;
  ProcessingTimeAppliedToRoom?: boolean;
  FinishTimeDuration?: number;
  FinishTimeAppliedToEmployee?: boolean;
  FinishTimeAppliedToRoom?: boolean;
  RoomIDs?: number[];
  EmployeeIDs?: number[];
  EmployeeTreatments?: any[];
  BrandTreatmentID?: number;
  ID?: number;
  BillableItemID?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  Category?: any;
  SubCategory?: any;
  Name?: string;
  DisplayName?: string;
  Description?: string;
  TotalDuration?: number;
  TreatmentDuration?: number;
  AllowCustomersToBookOnline?: boolean;
  ImageURL?: string;
  Price?: any;
  DurationType?: any;
  MinTreatmentDuration?: number;
  MaxTreatmentDuration?: number;
  IsSharedService?: boolean;
  SharedRoomGuestCount?: number;
  IsBoundingService?: boolean;
  IsFlexiblePrice?: boolean;
  IsForCouples?: boolean;
  DoesNotRequireStaff?: boolean;
  AvailableInAdvance?: number;
  AvailableInAdvanceDateUnitType?: any;
  FlexiblePriceIncrementType?: any;
  ColorCode?: string;
  DateCreated?: string;
  DateLastModified?: string;
  CustomerRecordType?: any;
  IsClass?: boolean;
  CustomerTypeID?: number;
  CustomerTypeName?: string;
  RequiresTwoTechnicians?: boolean;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
  IsVerifiedVisibleInOnlineBooking?: boolean;
  DepositOptions?: any;
  OnlineMenuType?: any;
}

const TreatmentSchema: Schema = new Schema(
  {
    EmployeeRecoveryDuration: Number,
    RoomRecoveryDuration: Number,
    RequiresProcessingTime: Boolean,
    ProcessingTimeDuration: Number,
    ProcessingTimeAppliedToEmployee: Boolean,
    ProcessingTimeAppliedToRoom: Boolean,
    FinishTimeDuration: Number,
    FinishTimeAppliedToEmployee: Boolean,
    FinishTimeAppliedToRoom: Boolean,
    RoomIDs: [Number],
    EmployeeIDs: [Number],
    EmployeeTreatments: {
      type: [
        {
          EmployeeID: Number,
          TreatmentDuration: Number,
          RequestedPrice: Number,
          FinishTimeDuration: Number,
          ProcessingTimeDuration: Number,
        },
      ],
      required: false,
      default: undefined,
    },
    BrandTreatmentID: Number,
    ID: Number,
    BillableItemID: Number,
    IsActive: Boolean,
    IsDeleted: Boolean,
    Category: {
      ID: Number,
      Name: String,
    },
    SubCategory: {
      ID: Number,
      Name: String,
    },
    Name: String,
    DisplayName: String,
    Description: String,
    TotalDuration: Number,
    TreatmentDuration: Number,
    AllowCustomersToBookOnline: Boolean,
    ImageURL: String,
    Price: {
      Amount: Number,
      CurrencyCode: String,
    },
    DurationType: {
      ID: Number,
      Name: String,
    },
    MinTreatmentDuration: Number,
    MaxTreatmentDuration: Number,
    IsSharedService: Boolean,
    SharedRoomGuestCount: Number,
    IsBoundingService: Boolean,
    IsFlexiblePrice: Boolean,
    IsForCouples: Boolean,
    DoesNotRequireStaff: Boolean,
    AvailableInAdvance: Number,
    AvailableInAdvanceDateUnitType: {
      ID: Number,
      Name: String,
    },
    FlexiblePriceIncrementType: {
      ID: Number,
      Name: String,
    },
    ColorCode: String,
    DateCreated: String,
    DateLastModified: String,
    CustomerRecordType: {
      ID: Number,
      Name: String,
    },
    IsClass: Boolean,
    CustomerTypeID: Number,
    CustomerTypeName: String,
    RequiresTwoTechnicians: Boolean,
    DateCreatedOffset: String,
    DateLastModifiedOffset: String,
    IsVerifiedVisibleInOnlineBooking: Boolean,
    DepositOptions: {
      HasAmountType: Boolean,
      AmountType: String,
      Amount: Number,
      Percentage: Number,
      Enabled: Boolean,
    },
    OnlineMenuType: {
      ID: Number,
      Name: String,
    },
  },
  { strict: true }
);

const TreatmentModel = mongoose.model<ITreatment>("Treatment", TreatmentSchema);
export { TreatmentModel, TreatmentSchema, ITreatment };
