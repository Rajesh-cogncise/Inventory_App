import mongoose from "mongoose";

const StockTransferSchema = new mongoose.Schema({
  fromWarehouseId: { type: String, required: true },
  toWarehouseId: { type: String, required: true },
  productId: { type: String, required: true },
  variationId: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.StockTransfer || mongoose.model("StockTransfer", StockTransferSchema);
