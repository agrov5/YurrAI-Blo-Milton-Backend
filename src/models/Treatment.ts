import mongoose, { Schema, Document } from "mongoose";
import {
  LookupOption,
  Money,
  DepositOptions,
  ArgumentErrors,
} from "./Interfaces";

// Re-export common interfaces
export { LookupOption, Money, DepositOptions, ArgumentErrors };

interface ITreatment extends Document {
  TreatmentName?: string;
  AllowCustomersToBookOnline?: boolean;
  BillableItemID?: number;
  Category?: any;
  SubCategory?: any;
  DepositOptions?: any;
  Description?: string | null;
  DisplayName?: string | null;
  ID?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  Name?: string;
  Price?: any;
  TotalDuration?: number;
  TreatmentDuration?: number;
  ImageURL?: string | null;
  DurationType?: any;
  FlexiblePriceIncrementType?: any;
  IsBoundingService?: boolean;
  IsFlexiblePrice?: boolean;
  IsSharedService?: boolean;
  MaxTreatmentDuration?: number | null;
  MinTreatmentDuration?: number | null;
  SharedRoomGuestCount?: number | null;
  ColorCode?: string | null;
  DoesNotRequireStaff?: boolean;
  IsForCouples?: boolean;
  AvailableInAdvance?: number;
  DateCreated?: string;
  DateLastModified?: string;
  AvailableInAdvanceDateUnitType?: any;
  CustomerRecordType?: any;
  IsClass?: boolean;
  CustomerTypeID?: number;
  CustomerTypeName?: string;
  RequiresTwoTechnicians?: boolean;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
  OnlineMenuType?: any;
  IsVerifiedVisibleInOnlineBooking?: boolean;
  EmployeeIDs?: number[];
  RoomIDs?: number[];
  EmployeeRecoveryDuration?: number;
  RoomRecoveryDuration?: number;
  RequiresProcessingTime?: boolean;
  ProcessingTimeDuration?: number;
  ProcessingTimeAppliedToEmployee?: boolean;
  ProcessingTimeAppliedToRoom?: boolean;
  FinishTimeDuration?: number;
  FinishTimeAppliedToEmployee?: boolean;
  FinishTimeAppliedToRoom?: boolean;
  EmployeeTreatments?: any[] | null;
  BrandTreatmentID?: number | null;
  AliasNames?: string[];
}

const TreatmentSchema = new Schema(
  {
    //   AllowCustomersToBookOnline: { type: Boolean, required: false },
    //   BillableItemID: { type: Number, required: false },
    ID: { type: Number, required: false },
    TreatmentName: { type: String, required: false },
    Price: { type: Object, required: false },
    Category: { type: Object, required: false },
    SubCategory: { type: Object, required: false },
    //   DepositOptions: { type: Object, required: false },
    //   Description: { type: String, required: false },
    //   DisplayName: { type: String, required: false },

    //   IsActive: { type: Boolean, required: false },
    //   IsDeleted: { type: Boolean, required: false },

    TotalDuration: { type: Number, required: false },
    //   TreatmentDuration: { type: Number, required: false },
    //   ImageURL: { type: String, required: false },
    //   DurationType: { type: Object, required: false },
    //   FlexiblePriceIncrementType: { type: Object, required: false },
    //   IsBoundingService: { type: Boolean, required: false },
    //   IsFlexiblePrice: { type: Boolean, required: false },
    //   IsSharedService: { type: Boolean, required: false },
    //   MaxTreatmentDuration: { type: Number, required: false },
    //   MinTreatmentDuration: { type: Number, required: false },
    //   SharedRoomGuestCount: { type: Number, required: false },
    //   ColorCode: { type: String, required: false },
    //   DoesNotRequireStaff: { type: Boolean, required: false },
    //   IsForCouples: { type: Boolean, required: false },
    //   AvailableInAdvance: { type: Number, required: false },
    //   DateCreated: { type: String, required: false },
    //   DateLastModified: { type: String, required: false },
    //   AvailableInAdvanceDateUnitType: { type: Object, required: false },
    //   CustomerRecordType: { type: Object, required: false },
    //   IsClass: { type: Boolean, required: false },
    //   CustomerTypeID: { type: Number, required: false },
    //   CustomerTypeName: { type: String, required: false },
    //   RequiresTwoTechnicians: { type: Boolean, required: false },
    //   DateCreatedOffset: { type: String, required: false },
    //   DateLastModifiedOffset: { type: String, required: false },
    //   OnlineMenuType: { type: Object, required: false },
    //   IsVerifiedVisibleInOnlineBooking: { type: Boolean, required: false },
    EmployeeIDs: { type: [Number], required: false },
    RoomIDs: { type: [Number], required: false },
    AliasNames: { type: [String], required: false, default: [] },
    //   EmployeeRecoveryDuration: { type: Number, required: false },
    //   RoomRecoveryDuration: { type: Number, required: false },
    //   RequiresProcessingTime: { type: Boolean, required: false },
    //   ProcessingTimeDuration: { type: Number, required: false },
    //   ProcessingTimeAppliedToEmployee: { type: Boolean, required: false },
    //   ProcessingTimeAppliedToRoom: { type: Boolean, required: false },
    //   FinishTimeDuration: { type: Number, required: false },
    //   FinishTimeAppliedToEmployee: { type: Boolean, required: false },
    //   FinishTimeAppliedToRoom: { type: Boolean, required: false },
    //   EmployeeTreatments: { type: [Object], required: false, default: undefined },
    //   BrandTreatmentID: { type: Number, required: false },
  },
  { strict: true, versionKey: false }
);

const TreatmentModel = mongoose.model<ITreatment>("Treatment", TreatmentSchema);
export { TreatmentModel, ITreatment };

/** Root Response Interface */
export interface FindTreatmentsResponse {
  ArgumentErrors?: ArgumentErrors[];
  ErrorCode?: number;
  ErrorMessage?: string;
  IsSuccess?: boolean;
  Treatments?: Treatment[];
  TotalResultsCount?: number;
}

/** Treatment */
export interface Treatment {
  AllowCustomersToBookOnline?: boolean;
  BillableItemID?: number;
  Category?: LookupOption;
  SubCategory?: LookupOption;
  DepositOptions?: DepositOptions | null;
  Description?: string | null;
  DisplayName?: string | null;
  ID?: number;
  IsActive?: boolean;
  IsDeleted?: boolean;
  Name?: string;
  Price?: Money;
  TotalDuration?: number;
  TreatmentDuration?: number;
  ImageURL?: string | null;
  DurationType?: LookupOption;
  FlexiblePriceIncrementType?: LookupOption;
  IsBoundingService?: boolean;
  IsFlexiblePrice?: boolean;
  IsSharedService?: boolean;
  MaxTreatmentDuration?: number | null;
  MinTreatmentDuration?: number | null;
  SharedRoomGuestCount?: number | null;
  ColorCode?: string | null;
  DoesNotRequireStaff?: boolean;
  IsForCouples?: boolean;
  AvailableInAdvance?: number;
  DateCreated?: string; // /Date(...)/
  DateLastModified?: string; // /Date(...)/
  AvailableInAdvanceDateUnitType?: LookupOption;
  CustomerRecordType?: LookupOption;
  IsClass?: boolean;
  CustomerTypeID?: number;
  CustomerTypeName?: string;
  RequiresTwoTechnicians?: boolean;
  DateCreatedOffset?: string;
  DateLastModifiedOffset?: string;
  OnlineMenuType?: LookupOption;
  IsVerifiedVisibleInOnlineBooking?: boolean;

  // Optional but included in some payloads:
  EmployeeIDs?: number[];
  RoomIDs?: number[];
  EmployeeRecoveryDuration?: number;
  RoomRecoveryDuration?: number;
  RequiresProcessingTime?: boolean;
  ProcessingTimeDuration?: number;
  ProcessingTimeAppliedToEmployee?: boolean;
  ProcessingTimeAppliedToRoom?: boolean;
  FinishTimeDuration?: number;
  FinishTimeAppliedToEmployee?: boolean;
  FinishTimeAppliedToRoom?: boolean;
  EmployeeTreatments?: EmployeeTreatment[] | null;
  BrandTreatmentID?: number | null;
}

/** EmployeeTreatment */
export interface EmployeeTreatment {
  EmployeeID?: number;
  TreatmentDuration?: number;
  RequestedPrice?: number;
  FinishTimeDuration?: number;
  ProcessingTimeDuration?: number;
}
