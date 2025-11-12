// app/api/purchases-by-product/route.js
import dbConnect from "@/lib/dbConnect";
import StockPurchase from "@/models/StockPurchase";
import StockTransfer from "@/models/StockTransfer";
import "@/models/Supplier";
import Warehouse from "@/models/Warehouse";
import { NextResponse } from "next/server";

function decimalToNumber(d) {
  if (d === null || d === undefined) return 0;
  try {
    const s = typeof d === "object" && d.toString ? d.toString() : String(d);
    return Number(s);
  } catch (e) {
    return Number(d);
  }
}

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const warehouseId = searchParams.get("warehouseId");

  if (!productId || !warehouseId) {
    return NextResponse.json(
      { error: "productId and warehouseId are required" },
      { status: 400 }
    );
  }

  try {
    // 1️⃣ Find transfers of this product into the warehouse
    const transfers = await StockTransfer.find({
      toWarehouseId: warehouseId,
      productId,
      purchaseId: { $exists: true },
    })
      .populate("purchaseId")
      .lean();

    // 2️⃣ Collect valid purchase IDs only
    const transferredPurchaseIds = [
      ...new Set(
        transfers
          .map((t) => (t.purchaseId?._id ? String(t.purchaseId._id) : null))
          .filter((id) => !!id) // remove undefined / null
      ),
    ];

    // Build base query
    const query = {
      "products.productId": productId,
      $or: [{ warehouseId }],
    };

    // Add purchaseId filter only if we have valid IDs
    if (transferredPurchaseIds.length > 0) {
      query.$or.push({ _id: { $in: transferredPurchaseIds } });
    }

    // 3️⃣ Fetch all relevant purchases (original + transferred)
    const purchases = await StockPurchase.find(query)
      .sort({ date: -1 })
      .populate("supplier", "name")
      .populate("warehouseId", "name")
      .lean();

    // 4️⃣ Build clean result
    const result = purchases
      .map((p) => {
        const matchedProducts = (p.products || [])
          .filter((pr) => {
            const pid =
              pr.productId && pr.productId._id
                ? String(pr.productId._id)
                : String(pr.productId);
            return pid === String(productId);
          })
          .map((pr) => {
            const priceNum = decimalToNumber(pr.price);
            const qty = pr.quantity || 0;
            const lineTotal = Number((priceNum * qty).toFixed(3));
            return {
              label:
                pr.label ||
                (pr.productId && pr.productId.name) ||
                "",
              productId:
                pr.productId && pr.productId._id
                  ? String(pr.productId._id)
                  : String(pr.productId),
              price: priceNum,
              quantity: qty,
              lineTotal,
            };
          });

        return {
          _id: p._id,
          invoiceNo: p.invoiceNo,
          date: p.date,
          supplierName: p.supplier ? p.supplier.name : null,
          warehouseName: p.warehouseId ? p.warehouseId.name : null,
          gst: decimalToNumber(p.gst),
          subtotal: decimalToNumber(p.subtotal),
          total: decimalToNumber(p.total),
          products: matchedProducts,
        };
      })
      .filter((r) => Array.isArray(r.products) && r.products.length > 0);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Error fetching purchases-by-product:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
