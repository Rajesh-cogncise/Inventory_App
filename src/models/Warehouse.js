import mongoose from 'mongoose';

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  isActive: { type: Boolean, default: true },
});

export default mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);
