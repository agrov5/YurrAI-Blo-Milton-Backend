import mongoose, { Schema, Document } from "mongoose";

export interface IEmployee extends Document {
  DisplayName: string;
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
    DisplayName: { type: String, required: true },
    FirstName: { type: String, required: true },
    LastName: { type: String, required: false },
    Gender: { type: String, required: true },
    //   LocationID: { type: Number, required: true },
    //   Photo: { type: String, required: false },
    //   ProfileDescription: { type: String, required: true },
    //   Rank: { type: Number, required: false },
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

interface ArgumentErrors {
  ArgumentName?: string;
  ErrorMessage?: string;
}

export interface Employee extends User {}

export interface User {
  DisplayName: string;
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

export interface Gender {
  ID: number;
  Name: string;
}

export interface PreferredPhoneType {
  ID: number;
  Name: string;
}

export interface Address {
  City: string;
  Country: Country;
  State: string;
  Street1: string;
  Street2: string;
  Zip: string;
}

export interface Country {
  ID: number;
  Name: string;
}

export interface Status {
  ID: number;
  Name: string;
}
