import { Treatment } from "./Treatment";
import { ArgumentErrors } from "./Interfaces";
import mongoose, { Schema, Document } from "mongoose";

// Re-export common interfaces
export { ArgumentErrors };

// ---------- Interfaces ----------

export interface FindRoomsResponse {
  ArgumentErrors?: ArgumentErrors[];
  ErrorCode?: number;
  ErrorMessage?: string;
  IsSuccess?: boolean;
  Results?: Room[];
  TotalResultsCount?: number;
}

export interface Room {
  Type?: string;
  Capacity?: number;
  Description?: string | null;
  ID?: number;
  LocationID?: number;
  Name?: string;
  Treatments?: number[];
  DateCreated?: string; // raw /Date(..)/ or ISO string
  DateLastModified?: string; // raw /Date(..)/ or ISO string
  DateCreatedOffset?: string; // ISO datetime
  DateLastModifiedOffset?: string; // ISO datetime
}

// ---------- Mongoose Schema ----------

interface IRoom extends Document {
  Type?: string;
  Capacity?: number;
  Description?: string | null;
  ID?: number;
  LocationID?: number;
  Name?: string;
  Treatments?: number[];
  DateCreated?: string; // raw /Date(..)/ or ISO string
  DateLastModified?: string; // raw /Date(..)/ or ISO string
  DateCreatedOffset?: string; // ISO datetime
  DateLastModifiedOffset?: string; // ISO datetime
}

const RoomSchema: Schema = new Schema(
  {
    ID: Number,
    Name: String,
    // Description: { type: String, default: null },
    // LocationID: Number,
    // Capacity: Number,
    TreatmentIDs: {
      type: [Number],
      required: true,
      default: undefined,
    },
    // DateCreated: String,
    // DateLastModified: String,
    // DateCreatedOffset: String,
    // DateLastModifiedOffset: String,
  },
  { strict: true, versionKey: false }
);

const RoomModel = mongoose.model<IRoom>("Room", RoomSchema);
export { RoomModel, RoomSchema, IRoom };
