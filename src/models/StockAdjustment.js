import mongoose from "mongoose";

const StockAdjustmentSchema = new mongoose.Schema({
  warehouseId: { type: String, required: true },
  productId: { type: String, required: true },
  variationId: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.StockAdjustment || mongoose.model("StockAdjustment", StockAdjustmentSchema);
