// app/api/purchases-by-product/route.js
import dbConnect from "@/lib/dbConnect";
import StockPurchase from "@/models/StockPurchase";
import "@/models/Supplier";
import { NextResponse } from "next/server";

function decimalToNumber(d) {
  if (d === null || d === undefined) return 0;
  // Mongoose Decimal128 instances usually support .toString()
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
    return NextResponse.json({ error: "productId and warehouseId are required" }, { status: 400 });
  }

  try {
    // Find purchases in that warehouse where the product exists
    const purchases = await StockPurchase.find({
      warehouseId,
      "products.productId": productId
    })
      .sort({ date: -1 })
      .populate("supplier", "name")
      .populate("warehouseId", "name")
      .lean(); // lean() returns plain JS objects which is easier to work with

    // Build response: for each purchase return only matching product lines
    const result = purchases.map(p => {
      const matchedProducts = (p.products || []).filter(pr => {
        // pr.productId can be ObjectId or object when populated
        const pid = pr.productId && pr.productId._id ? String(pr.productId._id) : String(pr.productId);
        return pid === String(productId);
      }).map(pr => {
        const priceNum = decimalToNumber(pr.price);
        const qty = pr.quantity || 0;
        const lineTotal = Number((priceNum * qty).toFixed(3));
        return {
          label: pr.label || (pr.productId && pr.productId.name) || "",
          productId: pr.productId && pr.productId._id ? String(pr.productId._id) : String(pr.productId),
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
        gst: decimalToNumber(p.gst),          // per G2 gst is amount
        subtotal: decimalToNumber(p.subtotal),
        total: decimalToNumber(p.total),
        products: matchedProducts,
      };
    });

    // Remove purchases that somehow have zero matched products
    const filtered = result.filter(r => Array.isArray(r.products) && r.products.length > 0);

    return NextResponse.json(filtered);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
