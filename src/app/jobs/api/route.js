import dbConnect from "../../../lib/dbConnect";
import Job from "../../../models/Job";
import WarehouseInventory from "../../../models/WarehouseInventory";
import Warehouse from "@/models/Warehouse";
import Installers from "@/models/Installers";
import Product from "@/models/Product";
import { NextResponse } from "next/server";

// Helper: decrement stock in warehouse
async function decrementStock({ products }) {
  for (const p of products) {
    await WarehouseInventory.findOneAndUpdate(
      {
        warehouseId: p.warehouseId,
        'products.productId': p.productId,
      },
      {
        $inc: {
          currentStock: -Math.abs(p.quantity),
          'products.$.quantity': -Math.abs(p.quantity)
        },
        lastUpdated: Date.now()
      }
    );
  }
}
async function incrementStock({ products }) {
  for (const p of products) {
    const result = await WarehouseInventory.findOneAndUpdate(
      {
        warehouseId: p.warehouseId,
        'products.productId': p.productId,
      },
      {
        $inc: {
          currentStock: Math.abs(p.quantity),
          'products.$.quantity': Math.abs(p.quantity)
        },
        lastUpdated: Date.now()
      },
      { new: true }
    );
    // If product not found in inventory, add it
    if (!result) {
      await WarehouseInventory.findOneAndUpdate(
        { warehouseId: p.warehouseId },
        {
          $push: {
            products: {
              productId: p.productId,
              quantity: Math.abs(p.quantity)
            }
          },
          $inc: { currentStock: Math.abs(p.quantity) },
          lastUpdated: Date.now()
        },
        { new: true }
      );
    }
  }
}
// Helper: add to installer's stock issued
async function addStockToInstaller({ installer, products }) {
  console.log("Adding stock to installer", installer);
  if (installer) {
    const totalIssued = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    let dbquery = await Installers.findByIdAndUpdate(
      installer,
      { $inc: { stockIssued: totalIssued } },
      { new: true }
    );
    console.log(dbquery);
  } else {
    return NextResponse.json({ error: "You need to assign an installer to this job" }, { status: 400 });
  }
}
async function addToInstallerInstalledStock({ installer, products }) {
  console.log("Adding to installer's installed stock", installer);
  if (installer) {
    const totalInstalled = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    let dbquery = await Installers.findByIdAndUpdate(
      installer,
      { $inc: { stockInstalled: totalInstalled } },
      { new: true }
    );
    console.log(dbquery);
  } else {
    return NextResponse.json({ error: "You need to assign an installer to this job" }, { status: 400 });
  }
}

async function removeStockFromInstaller({ installer, products }) {
  console.log("Removing stock from installer", installer);
  if (installer) {
    const totalIssued = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    let dbquery = await Installers.findByIdAndUpdate(
      installer,
      { $inc: { stockIssued: -Math.abs(totalIssued) } },
      { new: true }
    );
    console.log(dbquery);
  } else {
    return NextResponse.json({ error: "You need to assign an installer to this job" }, { status: 400 });
  }
}
async function checkStockAvailability({ products }) {
  if (products && products.length > 0) {
    for (const p of products) {
      const inventory = await WarehouseInventory.findOne({
        warehouseId: p.warehouseId,
        'products.productId': p.productId,
      });
      console.log("checkStockAvailability", p, inventory);
      if (!inventory || inventory.currentStock < p.quantity) {
        let productName = '';
        let warehouseName = '';
        await Product.findById(p.productId).then(prod => {
          productName = prod.name;
        });
        await Warehouse.findById(p.warehouseId).then(inv => {
          warehouseName = inv.name;
        });
        return { status: false, message: `Insufficient stock for product ${productName} in ${warehouseName}` };
      }
    }
  }
  return { status: true };
}

async function addJobToInstallerHistory({ installer, jobID }) {
  if (installer) {
    await Installers.findByIdAndUpdate(
      installer,
      { $push: { jobs: jobID } },
      { new: true }
    );
    return true;
  }
  return false;
}

const dontAllowStatusChange = ["Installed", "Cancelled"];

const validate = async function (value, body) {
  switch (value) {
    case "installer":
      if (!body.installer) {
        throw new Error("You need to assign an installer to this job");
      }
      break;
    case "status":
      const job = await Job.findById(body._id);
      if (dontAllowStatusChange.includes(job.status)) {
        throw new Error(`Cannot change values of a ${job.status} job`);
      }
    default:
      break;
  }
};


export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const isAdmin = searchParams.get("admin") === "true";
  let filter = {};
  if (!isAdmin && userId) filter.userId = userId;
  if (isAdmin) filter.status = { $in: ["Pending", "Installed"] };
  const jobs = await Job.find(filter).populate("products.productId").sort({ createdAt: -1 });
  return NextResponse.json(jobs);
}
// Create a new job, minus from inventory and add to installer's stock issued
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    // Check stock availability for each product
    // await validate("installer", body);
    // allow installer to be null so we can assign the unasigned installer later

    if (!body.installer) {
      await Installers.findOne({ name: "Unassigned" }).then(installer => {
        body.installer = installer._id;
      });
    }

    let stockAvailable = await checkStockAvailability(body);
    if (!stockAvailable.status) {
      return NextResponse.json({ error: stockAvailable.message }, { status: 400 });
    }
    await decrementStock(body);
    await addStockToInstaller(body);
    const job = await Job.create(body);
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const returnedProducts = searchParams.get("returnProduct");
  if (!id) return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  // console.log("Returned products:", returnedProducts);
  if (returnedProducts) {
    try {
      // When returning products, simply add back to inventory and remove from installer's stock and history while reducing from job's products
      await validate("installer", body);
      
      const oldValues = await Job.findById(id);

      const jobProducts = oldValues.products.map(s => ({
        productId: s.productId.toString(),
        quantity: s.quantity,
        warehouseId: s.warehouseId.toString()
      }));
      let overReturned = false;
      body.products.map(p => {
        let prodInJob = jobProducts.find(jp => jp.productId === p.productId);
        if (prodInJob) {
          console.log("Found product in job:", prodInJob);
          if (p.quantity <= prodInJob.quantity) {
            // Return the difference
            let returnQty = prodInJob.quantity - p.quantity;
            oldValues.products = oldValues.products.map(op => {
              if (op.productId.toString() === p.productId) {
                op.quantity = returnQty;
              }
              return op;
            });
          }
           if (p.quantity > prodInJob.quantity) {
            overReturned = true;
          }
        }
      });
      if (overReturned) {
        return NextResponse.json({ error: "You can't return more products than were issued in the job" }, { status: 400 });
      }
      oldValues.save();
      console.log("Old values after adjustment:", oldValues);
      await incrementStock(body);
      await removeStockFromInstaller(body);
      return NextResponse.json({ message: "Return products functionality is currently disabled for safety. Please contact admin." });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }


  try {
    await validate("installer", body);
    await validate("status", { body, _id: id });
    // todo: check if stock has been changed, increment or decrement accordingly
    const oldValues = await Job.findById(id);

    let productsOrWarehouseChanged = JSON.stringify(oldValues.products) !== JSON.stringify(body.products) || oldValues.warehouseId !== body.warehouseId;
    let installerChanged = oldValues.installer.toString() !== body.installer;

    if (productsOrWarehouseChanged && installerChanged) {
      // Both changed: revert old stock, move installer stock, then apply new stock
      console.log("Products/warehouse AND installer changed, adjusting stock and installer");
      await incrementStock(oldValues);
      await removeStockFromInstaller(oldValues);
      // Check new stock availability
      let stockAvailable = await checkStockAvailability(body);
      if (!stockAvailable.status) {
        return NextResponse.json({ error: stockAvailable.message }, { status: 400 });
      }
      await decrementStock(body);
      await addStockToInstaller(body);
    } else if (productsOrWarehouseChanged) {
      // Only products/warehouse changed
      console.log("Products or warehouse changed, adjusting stock");
      await incrementStock(oldValues);
      await removeStockFromInstaller(oldValues);
      let stockAvailable = await checkStockAvailability(body);
      if (!stockAvailable.status) {
        return NextResponse.json({ error: stockAvailable.message }, { status: 400 });
      }
      await decrementStock(body);
      await addStockToInstaller(body);
    } else if (installerChanged) {
      // Only installer changed
      console.log("Installer changed, moving stock");
      await removeStockFromInstaller(oldValues);
      await addStockToInstaller(body);
    }

    await checkStockAvailability(body);
    if (body.status === "Installed") {
      await removeStockFromInstaller(body);
      console.log(body)
      await addToInstallerInstalledStock(body);
      await addJobToInstallerHistory({...body, jobID: id});
      // find descripiancy between stock issued and installed?
    }
    if (body.status === "Cancelled") {
      await removeStockFromInstaller(body);
      await incrementStock(body);
    }
    const job = await Job.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Job ID required" }, { status: 400 });
  }
  try {
    await Job.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
