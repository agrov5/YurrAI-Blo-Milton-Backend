import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  EmployeeDisplayName: string;
  EmployeeID: number;
  OrderPosition: number;
}

const OrderSchema = new Schema(
  {
    EmployeeDisplayName: { type: String, required: true },
    EmployeeID: { type: Number, required: true },
    OrderPosition: { type: Number, required: true },
  },
  { versionKey: false, strict: true }
);

const OrderModel = mongoose.model<IOrder>("Order", OrderSchema);
export { OrderModel };
