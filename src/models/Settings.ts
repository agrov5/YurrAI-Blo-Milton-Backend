import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  shortCallThresholdSeconds: number;
}

const SettingsSchema = new Schema<ISettings>({
  shortCallThresholdSeconds: { type: Number, default: 30 },
});

export const SettingsModel = mongoose.model<ISettings>("Settings", SettingsSchema);

export async function getSettings(): Promise<ISettings> {
  const existing = await SettingsModel.findOne();
  if (existing) return existing;
  return SettingsModel.create({ shortCallThresholdSeconds: 30 });
}
