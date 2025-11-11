import mongoose, { Schema, Document } from "mongoose";
import {
  Gender,
  PreferredPhoneType,
  Address,
  Country,
  Status,
  ArgumentErrors,
} from "./Interfaces";

// Re-export common interfaces
export { Gender, PreferredPhoneType, Address, Country, Status, ArgumentErrors };

export interface IEmployee extends Document {
  DisplayName: string;
  FullName?: string;
  FirstName: string;
  Gender: any;
  ID: number;
  LastName?: string | null;
  LocationID: number;
  Photo?: string | null;
  ProfileDescription: string;
  Rank?: number | null;
  Type: number;
  Email: string;
  HomePhone: string;
  MobilePhone: string;
  MobilePhoneCarrierID?: number | null;
  NotifyBySMS: boolean;
  PreferredPhoneType: any;
  DateCreated: string;
  UserID: number;
  LockedToRoom?: number | null;
  Address: any;
  Status: any;
  DateCreatedOffset: string;
}

const EmployeeSchema = new Schema(
  {
    ID: { type: Number, required: true },
    FullName: { type: String, required: false },
    Rank: { type: Number, required: false },
    DisplayName: { type: String, required: true },
    FirstName: { type: String, required: true },
    LastName: { type: String, required: false },
    Gender: { type: String, required: true },
    //   LocationID: { type: Number, required: true },
    //   Photo: { type: String, required: false },
    //   ProfileDescription: { type: String, required: true },
    //   Type: { type: Number, required: true },
    //   Email: { type: String, required: true },
    //   HomePhone: { type: String, required: true },
    //   MobilePhone: { type: String, required: true },
    //   MobilePhoneCarrierID: { type: Number, required: false },
    //   NotifyBySMS: { type: Boolean, required: true },
    //   PreferredPhoneType: { type: Object, required: true },
    //   DateCreated: { type: String, required: true },
    //   UserID: { type: Number, required: true },
    //   LockedToRoom: { type: Number, required: false },
    //   Address: { type: Object, required: true },
    //   Status: { type: Object, required: true },
    //   DateCreatedOffset: { type: String, required: true },
  },
  { versionKey: false, strict: true }
);

const EmployeeModel = mongoose.model<IEmployee>("Employee", EmployeeSchema);
export { EmployeeModel };

export interface FindEmployeesResponse {
  ArgumentErrors?: ArgumentErrors[];
  ErrorCode?: number;
  ErrorMessage?: string;
  IsSuccess?: boolean;
  Results?: Employee[];
  TotalResultsCount?: number;
}

export interface Employee extends User {}

export interface User {
  DisplayName: string;
  FullName: string;
  FirstName: string;
  Gender: Gender;
  ID: number;
  LastName: string | null;
  LocationID: number;
  Photo: string | null;
  ProfileDescription: string;
  Rank: number | null;
  Type: number;
  Email: string;
  HomePhone: string;
  MobilePhone: string;
  MobilePhoneCarrierID: number | null;
  NotifyBySMS: boolean;
  PreferredPhoneType: PreferredPhoneType;
  DateCreated: string; // raw date format like /Date(1739325900000-0500)/
  UserID: number;
  LockedToRoom: number | null;
  Address: Address;
  Status: Status;
  DateCreatedOffset: string; // ISO datetime string
}
