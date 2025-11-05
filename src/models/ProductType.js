// src/models/Product.js
import mongoose from 'mongoose';

const ProductTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.ProductType || mongoose.model('ProductType', ProductTypeSchema);
