import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import WarehouseInventory from "@/models/WarehouseInventory";
import StockTransfer from "@/models/StockTransfer";
import Product from "@/models/Product";
import StockPurchase from "@/models/StockPurchase";
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
      .populate("userId", "name email")
      .lean()
      .limit(1000); // limit to 1000 for safety (adjust as needed)

    

    return NextResponse.json(transfers);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  
}

export async function POST(req) {
  await dbConnect();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid or missing JSON body" },
      { status: 400 }
    );
  }

  const { fromWarehouseId, toWarehouseId, productId, quantity, reason } = body;

  // 🧩 Basic validations
  if (!fromWarehouseId || !toWarehouseId || !productId || !quantity) {
    return NextResponse.json(
      {
        error: "fromWarehouseId, toWarehouseId, productId, and quantity are required",
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

  if (fromWarehouseId === toWarehouseId) {
    return NextResponse.json(
      { error: "Cannot transfer stock within the same warehouse" },
      { status: 400 }
    );
  }

  try {
    // ✅ Get logged-in user
    const session = await getServerSession(authOptions);
    const userId = session?.user?._id || session?.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const fromWId = new mongoose.Types.ObjectId(fromWarehouseId);
    const toWId = new mongoose.Types.ObjectId(toWarehouseId);
    const prodId = new mongoose.Types.ObjectId(productId);

    // ✅ 1️⃣ Source warehouse: check inventory
    const sourceInv = await WarehouseInventory.findOne({
      warehouseId: fromWId,
      "products.productId": prodId,
    });

    if (!sourceInv) {
      return NextResponse.json(
        { error: "Product not found in source warehouse" },
        { status: 404 }
      );
    }

    const srcProductEntry = sourceInv.products.find(
      (p) => p.productId.toString() === productId
    );

    const available = srcProductEntry ? Number(srcProductEntry.quantity || 0) : 0;

    if (available < qty) {
      return NextResponse.json(
        {
          error: `Insufficient stock in source warehouse (available ${available})`,
        },
        { status: 400 }
      );
    }

    // ✅ 2️⃣ Decrease quantity in source warehouse
    srcProductEntry.quantity -= qty;

    if (srcProductEntry.quantity <= 0) {
      sourceInv.products = sourceInv.products.filter(
        (p) => p.productId.toString() !== productId
      );
    }

    // Recalculate current stock
    sourceInv.currentStock = sourceInv.products.reduce(
      (sum, p) => sum + (Number(p.quantity) || 0),
      0
    );
    sourceInv.lastUpdated = new Date();
    await sourceInv.save();

    // ✅ Increment in destination warehouse
    let destInv = await WarehouseInventory.findOne({ warehouseId: toWId });

    if (!destInv) {
      destInv = new WarehouseInventory({
        warehouseId: toWId,
        products: [],
        currentStock: 0,
        lastUpdated: new Date(),
      });
    }

    // find existing product entry
    const destProdIndex = destInv.products.findIndex(
      (p) => p.productId.toString() === productId
    );

    // ✅ Copy source product details (price, gst, etc.) if required
    const baseProductDetails = {
      price: srcProductEntry.price ?? 0,
      gst: srcProductEntry.gst ?? 0,
      gstpercent: srcProductEntry.gstpercent ?? 0,
      subtotal: srcProductEntry.subtotal ?? 0,
      total: srcProductEntry.total ?? 0,
    };

    if (destProdIndex > -1) {
      // already exists, just increment quantity
      destInv.products[destProdIndex].quantity += qty;
    } else {
      // add with required fields
      destInv.products.push({
        productId,
        quantity: qty,
        ...baseProductDetails,
      });
    }

    // recompute current stock
    destInv.currentStock = destInv.products.reduce(
      (sum, p) => sum + (p.quantity || 0),
      0
    );
    destInv.lastUpdated = new Date();
    await destInv.save();

    // ✅ 4️⃣ Find oldest purchase for linking
    const purchase = await StockPurchase.findOne({
      warehouseId: fromWId,
      "products.productId": prodId,
    })
      .sort({ date: 1 })
      .select("_id invoiceNo date")
      .lean();

    // ✅ 5️⃣ Get product details
    const productDoc = await Product.findById(productId)
      .select("name sku")
      .lean();

    // ✅ 6️⃣ Create StockTransfer log
    let transfer = await StockTransfer.create({
      fromWarehouseId,
      toWarehouseId,
      productId,
      productLabel: productDoc?.name || "Unnamed Product",
      quantity: qty,
      reason: reason || "",
      purchaseId: purchase?._id || null,
      userId,
      createdAt: new Date(),
    });

    // ✅ 7️⃣ Populate for frontend
    transfer = await StockTransfer.findById(transfer._id)
      .populate("fromWarehouseId", "name")
      .populate("toWarehouseId", "name")
      .populate("productId", "name")
      .populate("purchaseId", "invoiceNo date");

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    console.error("💥 Stock transfer error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}