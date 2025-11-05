import React from "react";
import {

useReactTable,
getCoreRowModel,
flexRender,
} from "@tanstack/react-table";

// Sample data
const data = [
{ id: 1, name: "Product A", price: 10.99 },
{ id: 2, name: "Product B", price: 19.99 },
{ id: 3, name: "Product C", price: 5.49 },
];

// Column definitions
const columns = [
{
    accessorKey: "id",
    header: "ID",
},
{
    accessorKey: "name",
    header: "Name",
},
{
    accessorKey: "price",
    header: "Price",
    cell: info => `$${info.getValue().toFixed(2)}`,
},
];

export default function ProductsTable() {
const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
});

return (
    <table>
        <thead>
            {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                        <th key={header.id}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                    ))}
                </tr>
            ))}
        </thead>
        <tbody>
            {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);
}