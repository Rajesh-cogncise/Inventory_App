import "@/models/Warehouse";
import "@/models/Product";
import dbConnect from "@/lib/dbConnect";
import WarehouseInventory from "@/models/WarehouseInventory";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");

  const filter = {};
  if (warehouseId) {
    filter.warehouseId = warehouseId;
  }

  // Fetch raw inventory documents
  const inventoryDocs = await WarehouseInventory.find(filter)
    .populate('warehouseId', 'name location')
    .populate('products.productId', 'name type')
    .lean();

  // 🟡 GROUPED INVENTORY RESULT
  const grouped = {};

  inventoryDocs.forEach((doc) => {
    doc.products.forEach((prod) => {
      const key = `${doc.warehouseId._id}-${prod.productId._id}`;

      if (!grouped[key]) {
        grouped[key] = {
          warehouseId: doc.warehouseId,
          productId: prod.productId,
          totalQuantity: prod.quantity,
          price: prod.price,
          lastUpdated: doc.lastUpdated,
        };
      } else {
        grouped[key].totalQuantity += prod.quantity;

        // update lastUpdated if newer
        if (doc.lastUpdated > grouped[key].lastUpdated) {
          grouped[key].lastUpdated = doc.lastUpdated;
        }
      }
    });
  });

  return Response.json(Object.values(grouped));
}