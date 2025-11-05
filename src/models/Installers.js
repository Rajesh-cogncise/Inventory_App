// src/models/Installers.js
// Mongoose Installers model for Next.js (if using Mongoose)
import mongoose from 'mongoose';

const InstallersSchema = new mongoose.Schema({
  name: { type: String, required: true },
  stockIssued: { type: Number, default: 0 },
  stockInstalled: { type: Number, default: 0 },
  contactNo: { type: String, default: '' },
  notes: [
    { type: String, default: '' }
  ],
  jobs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    }
  ]
});

// Prevent model overwrite in dev
export default mongoose.models.Installers || mongoose.model('Installers', InstallersSchema);
