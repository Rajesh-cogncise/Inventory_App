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
      price: { type: mongoose.Schema.Types.Decimal128, required: true },
      quantity: { type: Number, required: true },
    }
  ],
  total: { type: mongoose.Schema.Types.Decimal128, default: "" },
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
  gst: { type: Number, required: true },
  gstpercent: { type: Number, required: true },
  subtotal: { type: mongoose.Schema.Types.Decimal128, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

// ✅ Force schema refresh (important for Next.js + Mongoose)
delete mongoose.models.StockPurchase;
export default mongoose.models.StockPurchase || mongoose.model("StockPurchase", StockPurchaseSchema);
