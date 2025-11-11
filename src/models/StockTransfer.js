import mongoose from "mongoose";

const StockTransferSchema = new mongoose.Schema({
  fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  toWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  productLabel: { type: String }, // keep label for quick read
  quantity: { type: Number, required: true },
  reason: { type: String, default: "" },
  variationId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.StockTransfer || mongoose.model("StockTransfer", StockTransferSchema);
