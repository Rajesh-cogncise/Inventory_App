import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import WarehouseInventory from "@/models/WarehouseInventory";
import Warehouse from "@/models/Warehouse";
import Product from "@/models/Product";
import StockTransfer from "@/models/StockTransfer";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
      .populate("userId", "name email")
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

  let body;
  try {
    // Safely parse JSON body
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 }
    );
  }

  const { fromWarehouseId, toWarehouseId, productId, quantity, reason } = body;

  if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
    return NextResponse.json(
      {
        error:
          "fromWarehouseId, toWarehouseId, productId and quantity are required",
      },
      { status: 400 }
    );
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json(
      { error: "Quantity must be a positive number" },
      { status: 400 }
    );
  }

  try {
    // ✅ Load StockPurchase model
    const StockPurchase = (await import("@/models/StockPurchase")).default;

    // ✅ Convert to ObjectId for correct matching
    const fromWId = new mongoose.Types.ObjectId(fromWarehouseId);
    const prodId = new mongoose.Types.ObjectId(productId);

    // ✅ Check source warehouse stock
    const sourceInv = await WarehouseInventory.findOne({
      warehouseId: fromWarehouseId,
      "products.productId": productId,
    });

    const srcProductEntry = sourceInv?.products?.find(
      (p) => p.productId.toString() === productId.toString()
    );
    const available = srcProductEntry ? Number(srcProductEntry.quantity || 0) : 0;

    if (available < qty) {
      return NextResponse.json(
        { error: `Insufficient stock in source warehouse (available ${available})` },
        { status: 400 }
      );
    }

    // ✅ Find related purchase (oldest purchase of this product in source warehouse)
    const purchase = await StockPurchase.findOne({
      warehouseId: fromWId,
      "products.productId": prodId,
    })
      .sort({ date: 1 })
      .select("_id invoiceNo date")
      .lean();

    console.log(
      "Matched purchase for transfer:",
      purchase ? purchase._id : "none"
    );

    // ✅ Decrement from source warehouse
    await WarehouseInventory.findOneAndUpdate(
      { warehouseId: fromWarehouseId, "products.productId": productId },
      {
        $inc: {
          "products.$.quantity": -Math.abs(qty),
          currentStock: -Math.abs(qty),
        },
        lastUpdated: Date.now(),
      }
    );

    // ✅ Remove product if quantity becomes 0 after decrement
    await WarehouseInventory.updateOne(
      { warehouseId: fromWarehouseId },
      {
        $pull: { products: { productId, quantity: { $lte: 0 } } },
      }
    );

    // ✅ Increment to destination warehouse
    const destResult = await WarehouseInventory.findOneAndUpdate(
      { warehouseId: toWarehouseId, "products.productId": productId },
      {
        $inc: {
          "products.$.quantity": Math.abs(qty),
          currentStock: Math.abs(qty),
        },
        lastUpdated: Date.now(),
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
              quantity: Math.abs(qty),
            },
          },
          $inc: { currentStock: Math.abs(qty) },
          lastUpdated: Date.now(),
        },
        { upsert: true, new: true }
      );
    }
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id || session?.user?.id; // ✅ from NextAuth session

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }
    // ✅ Create transfer record
    const productDoc = await Product.findById(productId).select("name").lean();
    let st = await StockTransfer.create({
      fromWarehouseId,
      toWarehouseId,
      productId,
      productLabel: productDoc?.name || "",
      quantity: qty,
      reason: reason || "",
      purchaseId: purchase?._id || null,
      userId,
    });

    // Populate before returning
    st = await StockTransfer.findById(st._id)
      .populate("fromWarehouseId", "name")
      .populate("toWarehouseId", "name")
      .populate("productId", "name")
      .populate("purchaseId", "invoiceNo date");

    return NextResponse.json(st, { status: 201 });
  } catch (err) {
    console.error("Stock transfer error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
