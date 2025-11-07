import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deleted:{ type: Number, default: 0 }
});

export default mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
