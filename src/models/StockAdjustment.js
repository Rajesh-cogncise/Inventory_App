import mongoose from "mongoose";

const StockAdjustmentSchema = new mongoose.Schema(
  {
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "StockPurchase", required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        oldQuantity: { type: Number, required: true },
        newQuantity: { type: Number, required: true },
        difference: { type: Number, required: true },
      },
    ],
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
delete mongoose.models.StockAdjustment;
export default mongoose.models.StockAdjustment ||
  mongoose.model("StockAdjustment", StockAdjustmentSchema);
