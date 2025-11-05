import mongoose from "mongoose";

const OrderRequestItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  variationId: { type: String, required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  currentStockAtRequest: { type: Number, required: true },
  minimumStockLevelAtRequest: { type: Number, required: true },
  quantityToOrder: { type: Number, required: true, min: 1 }
});

const OrderRequestSchema = new mongoose.Schema({
  requestDate: { type: Date, default: Date.now },
  status: { type: String, required: true, enum: ["Pending", "Sent", "Fulfilled", "Cancelled"], default: "Pending" },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  emailSent: { type: Boolean, default: false },
  emailSentDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  items: [OrderRequestItemSchema]
});

export default mongoose.models.OrderRequest || mongoose.model("OrderRequest", OrderRequestSchema);
