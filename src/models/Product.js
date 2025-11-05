// src/models/Product.js
import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  sku: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['single-split', 'multi-split', 'ducted', 'heat-pumps'],
    default: '',
    required: true,
  },
  secondaryType: {
    type: String,
    enum: ['ODU', 'IDU', ''],
    default: '',
    required: false,
  },
  brand: {
    type: String,
    required: true,
  },
  minimumStockThreshold: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
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

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
