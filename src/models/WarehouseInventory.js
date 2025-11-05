import mongoose from "mongoose";

const warehouseInventorySchema = new mongoose.Schema({
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Warehouse",
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Product",
      },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
    }
  ],
  currentStock: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  minimumStockLevel: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index for warehouseId, productId, variationId
warehouseInventorySchema.index(
  { warehouseId: 1, productId: 1, variationId: 1 },
  { unique: true }
);

// Index for lastUpdated (descending)
warehouseInventorySchema.index({ lastUpdated: -1 });

export default mongoose.models.WarehouseInventory || mongoose.model("WarehouseInventory", warehouseInventorySchema);
