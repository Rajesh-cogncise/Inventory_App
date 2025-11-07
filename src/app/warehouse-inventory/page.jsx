"use client";
import Breadcrumb from "@/components/Breadcrumb";
import MasterLayout from "@/masterLayout/MasterLayout";
import React, { useMemo,useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, createColumnHelper } from '@tanstack/react-table';


const WarehouseInventoryPage = () => {

    const [inventory, setInventory] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);

    useEffect(() => {
        // fetchInventory();
        fetchWarehouses();
    }, []);

    const fetchInventory = async (w) => {
        w.preventDefault();
        setLoading(true);
        setError("");
        try {
            let url = "/warehouse-inventory/api";
            if (selectedWarehouse) {
                url += `?warehouseId=${selectedWarehouse}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            console.log(data)
            setInventory(data);
        } catch (err) {
            setError("Error fetching inventory");
            setInventory([]);
        }
        setLoading(false);
    }


    const handleChange = (e) => {
        const { name, value } = e.target;
        setSelectedWarehouse(value);
    };

    const fetchWarehouses = async () => {
        try {
            const res = await fetch("/warehouses/api");
            const data = await res.json();
            setWarehouses(data);
        } catch (err) {
            setWarehouses([]);
        }
    };
    
    return (
        <MasterLayout>
            <Breadcrumb title='Warehouses Inventory' />
            <div className="container py-4">
                <div className="d-flex align-items-center gap-10 mb-10">
                    <Link href="/warehouses" className="btn btn-primary d-flex align-items-center">
                        <Icon icon="mage:home-3" className="me-2" /> All Warehouses
                    </Link>
                    <form onSubmit={fetchInventory} className="d-flex align-items-center gap-10">
                        <select
                            name="warehouseId"
                            className="form-control"
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Warehouse</option>
                            {warehouses.map((w) => (
                                <option key={w._id} value={w._id}>
                                    {w.name} {w.location ? `(${w.location})` : ""}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="btn btn-primary ms-2">Show</button>
                    </form>
                </div>
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                {loading ? (
                    <div className="text-center py-5">
                        <Icon icon="eos-icons:loading" className="icon text-3xl" /> Loading...
                    </div>
                ) : (
                    <MyTableComponent data={inventory} />
                )}
            </div>
        </MasterLayout>
    );
};


function MyTableComponent({ data }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // 1) Flatten inventory => one product per row
  const flattenedData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data.flatMap(record => {
      const warehouseName = record?.warehouseId?.name ?? "N/A";
      const products = Array.isArray(record?.products) ? record.products : [];

      return products.map(p => ({
        warehouse: warehouseName,
        productName: p?.productId?.name ?? "N/A",
        quantity: p?.quantity ?? 0,        
        // keep references if needed
        _inventoryId: record?._id,
        _productId: p?.productId?._id ?? null,
      }));
    });
  }, [data]);

  const totalQuantity = flattenedData.reduce((sum, item) => sum + item.quantity, 0);


  // 2) Columns — use info.getValue() inside cell
  const columns = useMemo(() => [
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
      cell: info => info.getValue(),     // correct: use the same param name (info)
    },
    {
      accessorKey: 'productName',
      header: 'Product Name',
      cell: info => info.getValue(),
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: info => info.getValue(),
    },
    
    
    
  ], []);

  // 3) Table instance
  const table = useReactTable({
    data: flattenedData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10, pageIndex: 0 } },
  });

  return (
    <div className='card'>
      <div className='card-header'>
        <h5 className='card-title mb-10'>Warehouse Inventory</h5>
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="form-control"
        />
      </div>

      <div className='card-body'>
        <div className="table-responsive">
          <table className="table basic-border-table mb-0">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      colSpan={header.colSpan}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-10 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center">
                          {header.column.columnDef.header}
                          {{
                            asc: ' 🔼',
                            desc: ' 🔽',
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4">No records found</td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-10 py-6 whitespace-nowrap text-sm text-gray-900">
                        {cell.getValue()}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              <tr className="fw-bold">
                <td className="text-end" colSpan="2"> Total Stocks</td>
                <td className="px-10 py-6 whitespace-nowrap text-sm text-gray-900">{totalQuantity}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className='card-footer'>
        <div className="d-flex justify-content-between gap-2 mt-4">
          <div className="btn-group radius-8" role="group" aria-label="Default button group">
            <button type="button" className="btn btn-primary-600 radius-8 px-20 py-1 d-flex align-items-center gap-2"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}>
              <Icon icon="mage:caret-left-fill" className="text-xl" />
            </button>
            <button type="button" className="btn btn-primary-400 radius-8 px-20 py-1 d-flex align-items-center gap-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              <Icon icon="mage:caret-left" className="text-xl" />
            </button>
            <button type="button" className="btn btn-primary-400 radius-8 px-20 py-1 d-flex align-items-center gap-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              <Icon icon="mage:caret-right" className="text-xl" />
            </button>
            <button type="button" className="btn btn-primary-600 px-20 py-1 radius-8 d-flex align-items-center gap-2"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}>
              <Icon icon="mage:caret-right-fill" className="text-xl" />
            </button>
          </div>

          <span className="d-flex align-items-center gap-1">
            Page{' '}
            <strong>
              {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </strong>
          </span>

          <div className="d-flex align-items-center gap-2">
            <span className="d-flex align-items-center gap-1">
              Go to page:{' '}
              <input
                type="number"
                defaultValue={table.getState().pagination.pageIndex + 1}
                onChange={e => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="border p-1 rounded w-44-px"
              />
            </span>

            <select
              value={table.getState().pagination.pageSize}
              onChange={e => {
                table.setPageSize(Number(e.target.value));
              }}
              className="p-1 border rounded"
            >
              {[10, 20, 30, 40, 50].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


export default WarehouseInventoryPage;
