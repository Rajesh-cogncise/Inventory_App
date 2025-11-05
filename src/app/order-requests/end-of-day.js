import dbConnect from "../../../lib/dbConnect";
import WarehouseInventory from "../../../models/WarehouseInventory";
import OrderRequest from "../../../models/OrderRequest";
import User from "../../../models/User";
import Product from "../../../models/Product";
import Warehouse from "../../../models/Warehouse";

// Dummy email sender (replace with real implementation)
async function sendOrderRequestEmail(orderRequest, recipients) {
  // Implement your email logic here
  console.log("Email sent to:", recipients, "with orderRequest:", orderRequest._id);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  await dbConnect();
  // Find all inventory items below minimum stock
  const lowStockItems = await WarehouseInventory.find({
    $expr: { $lt: ["$currentStock", "$minimumStockLevel"] },
    minimumStockLevel: { $gt: 0 }
  });
  if (!lowStockItems.length) {
    return res.status(200).json({ message: "No low stock items found." });
  }
  // Group by userId (or assign to admin if not available)
  const admin = await User.findOne({ role: "admin" });
  const requests = [];
  for (const item of lowStockItems) {
    const product = await Product.findById(item.productId);
    const warehouse = await Warehouse.findById(item.warehouseId);
    const reqDoc = await OrderRequest.create({
      status: "Pending",
      generatedBy: admin?._id,
      userId: item.userId || admin?._id,
      items: [{
        productId: item.productId,
        variationId: item.variationId,
        warehouseId: item.warehouseId,
        currentStockAtRequest: item.currentStock,
        minimumStockLevelAtRequest: item.minimumStockLevel,
        quantityToOrder: Math.max(item.minimumStockLevel - item.currentStock, 1)
      }],
      notes: `Auto-generated for low stock: ${product?.name || item.productId} in ${warehouse?.name || item.warehouseId}`
    });
    requests.push(reqDoc);
    // Send email to procurement (replace with real email logic)
    await sendOrderRequestEmail(reqDoc, ["procurement@yourcompany.com"]);
  }
  res.status(200).json({ message: `Created ${requests.length} order requests.`, requests });
}
