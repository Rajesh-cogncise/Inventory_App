import mongoose from "mongoose";

const StockPurchaseSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  invoiceNo: { type: String, required: true },
  products: [
    {
      label: { type: String },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Product",
      },
      price: { type: String, required: true },
      quantity: { type: Number, required: true },
    }
  ],
  total: { type: String, default: "" },
  warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Warehouse",
    },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Supplier",
  },
});

export default mongoose.models.StockPurchase || mongoose.model("StockPurchase", StockPurchaseSchema);
