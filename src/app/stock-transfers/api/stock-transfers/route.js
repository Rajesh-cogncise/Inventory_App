import dbConnect from "@/lib/dbConnect";
import WarehouseInventory from "@/models/WarehouseInventory";
import Warehouse from "@/models/Warehouse";
import Product from "@/models/Product";
import StockTransfer from "@/models/StockTransfer";
import { NextResponse } from "next/server";

// GET: list transfers (optionally ?search, client-side pagination will be used)
export async function GET(req) {
    
  await dbConnect();  
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  try {
    // you can extend filter by date / warehouse / product query params if needed
    let filter = {};
    if (search) {
      // simple text search on productLabel or reason
      filter.$or = [
        { productLabel: { $regex: search, $options: "i" } },
        { reason: { $regex: search, $options: "i" } }
      ];
    }

    const transfers = await StockTransfer.find(filter)
      .sort({ createdAt: -1 })
      .populate("fromWarehouseId", "name")
      .populate("toWarehouseId", "name")
      .populate("productId", "name")
      .lean()
      .limit(1000); // limit to 1000 for safety (adjust as needed)

    

    return NextResponse.json(transfers);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  
}

// POST: create stock transfer
export async function POST(req) {
  await dbConnect();
  const body = await req.json();

  const { fromWarehouseId, toWarehouseId, productId, quantity, reason } = body;
  if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
    return NextResponse.json({ error: "fromWarehouseId, toWarehouseId, productId and quantity are required" }, { status: 400 });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
  }

  try {
    // Check source warehouse has enough stock
    const sourceInv = await WarehouseInventory.findOne({
      warehouseId: fromWarehouseId,
      "products.productId": productId
    });

    const srcProductEntry = sourceInv?.products?.find(p => p.productId.toString() === productId.toString());
    const available = srcProductEntry ? Number(srcProductEntry.quantity || 0) : 0;

    if (available < qty) {
      return NextResponse.json({ error: `Insufficient stock in source warehouse (available ${available})` }, { status: 400 });
    }

    // ✅ Decrement from source warehouse
    await WarehouseInventory.findOneAndUpdate(
      { warehouseId: fromWarehouseId, "products.productId": productId },
      {
        $inc: {
          "products.$.quantity": -Math.abs(qty),
          currentStock: -Math.abs(qty)
        },
        lastUpdated: Date.now()
      }
    );

    // ✅ Remove product if quantity becomes 0 after decrement
    await WarehouseInventory.updateOne(
      { warehouseId: fromWarehouseId },
      {
        $pull: { products: { productId, quantity: { $lte: 0 } } }
      }
    );

    // ✅ Increment to destination warehouse
    const destResult = await WarehouseInventory.findOneAndUpdate(
      { warehouseId: toWarehouseId, "products.productId": productId },
      {
        $inc: {
          "products.$.quantity": Math.abs(qty),
          currentStock: Math.abs(qty)
        },
        lastUpdated: Date.now()
      },
      { new: true }
    );

    // If product not found in destination, insert new entry
    if (!destResult) {
      await WarehouseInventory.findOneAndUpdate(
        { warehouseId: toWarehouseId },
        {
          $push: {
            products: {
              productId,
              quantity: Math.abs(qty)
            }
          },
          $inc: { currentStock: Math.abs(qty) },
          lastUpdated: Date.now()
        },
        { upsert: true, new: true }
      );
    }

    // Save transfer record
    const productDoc = await Product.findById(productId).select("name").lean();
    let st = await StockTransfer.create({
      fromWarehouseId,
      toWarehouseId,
      productId,
      productLabel: productDoc?.name || "",
      quantity: qty,
      reason: reason || ""
    });

    // Populate before returning
    st = await StockTransfer.findById(st._id)
      .populate("fromWarehouseId", "name")
      .populate("toWarehouseId", "name")
      .populate("productId", "name");

    return NextResponse.json(st, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}