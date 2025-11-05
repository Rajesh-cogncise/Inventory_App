import mongoose from "mongoose";

const JobProductSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" }
});

const JobSchema = new mongoose.Schema({
  actualCompletedDate: { type: Date, default: Date.now },
  workType: { type: String, required: true },
  address: { type: String, required: false },
  installer: { type: mongoose.Schema.Types.ObjectId, ref: "Installers", required: true },
  status: { type: String, enum: ["Pending", "Installed", "Issued", "Cancelled", "Draft"], default: "Pending", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requirements: [JobProductSchema],
  history: [{ type: String }],
  products: [JobProductSchema],
  issuedDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.Job || mongoose.model("Job", JobSchema);
