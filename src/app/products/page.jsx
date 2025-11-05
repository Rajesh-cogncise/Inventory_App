"use client";
import Breadcrumb from "@/components/Breadcrumb";
// import TableDataLayer from "@/components/TableDataLayer";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import MasterLayout from "@/masterLayout/MasterLayout";
import { useEffect, useState } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getSortedRowModel, getFilteredRowModel, createColumnHelper } from '@tanstack/react-table';

const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ cell }) => cell.getValue(),
    enableSorting: true,
    enableColumnFilter: true,
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    cell: ({ cell }) => cell.getValue(),
    enableColumnFilter: true,
    enableSorting: true,
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ cell }) => cell.getValue(),
    enableSorting: true,
  },
  {
    accessorKey: 'secondaryType',
    header: 'Secondary Type',
    cell: ({ cell }) => cell.getValue(),
    enableSorting: true,
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
    cell: ({ cell }) => cell.getValue(),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <RowActions product={row.original} />,
    enableSorting: false,
    enableColumnFilter: false,
  },
];

const RowActions = ({ product }) => {
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      const res = await fetch(`/products/api?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        window.location.reload(); // Or update state to remove product from list
      } else {
        alert(data.error || "Delete failed");
      }
    } catch (err) {
      alert("Delete failed");
    }
  };
  return (
    <>
      <div className='d-flex align-items-center'>
        <Link
          href={`/products/edit/${product._id}`}
          className='w-32-px h-32-px me-8 bg-success-focus text-success-main rounded-circle d-inline-flex align-items-center justify-content-center'
        >
          <Icon icon='lucide:edit' />
        </Link>
        <button
          className='w-32-px h-32-px me-8 bg-danger-focus text-danger-main rounded-circle d-inline-flex align-items-center justify-content-center border-0'
          onClick={() => handleDelete(product._id)}
          title='Delete'
        >
          <Icon icon='mingcute:delete-2-line' />
        </button>
      </div>
    </>
  );
};

const Page = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/products/api")
      .then((res) => res.json())
      .then((data) => setProducts(data));
  }, []);

  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb title='Products' />

        {/* TableDataLayer */}
        <MyTableComponent data={products} />
      </MasterLayout>
    </>
  );
};


function MyTableComponent({ data }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState(''); // For global search

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // Enables client-side pagination
    getSortedRowModel: getSortedRowModel(),         // Enables client-side sorting
    getFilteredRowModel: getFilteredRowModel(),     // Enables client-side filtering (search)

    // State management for sorting and filtering
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,

    // Pagination settings (initial state)
    initialState: {
      pagination: {
        pageSize: 10, // Number of rows per page
        pageIndex: 0,
      },
    },
  });

  return (
    <div className='card'>
      <div className='card-header'>
        <h5 className='card-title mb-10'>All Products</h5>
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
                      onClick={header.column.getToggleSortingHandler()} // Click to sort
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
            <tbody >
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-10 py-6 whitespace-nowrap text-sm text-gray-900">
                      {typeof cell.column.columnDef.cell === 'function'
                        ? cell.column.columnDef.cell({ row: cell.row, cell })
                        : cell.getValue()}
                    </td>
                  ))}
                </tr>
              ))}
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
              <Icon
                icon="mage:caret-left-fill"
                className="text-xl"
              />
            </button>
            <button type="button" className="btn btn-primary-400 radius-8 px-20 py-1 d-flex align-items-center gap-2"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              <Icon
                icon="mage:caret-left"
                className="text-xl"
              />
            </button>
            <button type="button" className="btn btn-primary-400 radius-8 px-20 py-1 d-flex align-items-center gap-2"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              <Icon
                icon="mage:caret-right"
                className="text-xl"
              />
            </button>
            <button type="button" className="btn btn-primary-600 px-20 py-1 radius-8 d-flex align-items-center gap-2"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}>
              <Icon
                icon="mage:caret-right-fill"
                className="text-xl"
              />
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


export default Page;
