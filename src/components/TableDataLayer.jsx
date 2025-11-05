"use client";
import { useEffect } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
const loadJQueryAndDataTables = async () => {
  const $ = (await import("jquery")).default;
  await import("datatables.net-dt/js/dataTables.dataTables.js");
  return $;
};

const TableDataLayer = ({ products = [] }) => {
  useEffect(() => {
    let table;
    // Only load jQuery/DataTables once
    if (!window._dataTablesLoaded) {
      loadJQueryAndDataTables()
        .then(($) => {
          window.$ = window.jQuery = $;
          window._dataTablesLoaded = true;
          // Destroy existing DataTable if it exists
          if ($.fn.dataTable.isDataTable("#dataTable")) {
            $("#dataTable").DataTable().destroy();
          }
          // Initialize DataTable
          table = $("#dataTable").DataTable({
            pageLength: 10,
          });
        })
        .catch((error) => {
          console.error("Error loading jQuery or DataTables:", error);
        });
    } else {
      const $ = window.$;
      if ($.fn.dataTable.isDataTable("#dataTable")) {
        $("#dataTable").DataTable().destroy();
      }
      table = $("#dataTable").DataTable({
        pageLength: 10,
      });
    }
    return () => {
      if (table) table.destroy(true);
    };
  }, [products]);

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
    <div className='card basic-data-table'>
      <div className='card-header'>
        <h5 className='card-title mb-0'>All Products</h5>
      </div>
      <div className='card-body'>
        <table
          className='table bordered-table mb-0'
          id='dataTable'
          data-page-length={10}
        >
          <thead>
            <tr>
              <th scope='col'>
                <div className='form-check style-check d-flex align-items-center'>
                  <input className='form-check-input' type='checkbox' />
                  <label className='form-check-label'>S.L</label>
                </div>
              </th>
              <th scope='col'>Name</th>
              <th scope='col'>sku</th>
              <th scope='col'>type</th>
              <th scope='col'>secondaryType</th>
              <th scope='col'>Brand</th>
              <th scope='col'>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => (
              <tr key={product._id || idx}>
                <td>
                  <div className='form-check style-check d-flex align-items-center'>
                    <input className='form-check-input' type='checkbox' />
                    <label className='form-check-label'>{idx + 1}</label>
                  </div>
                </td>
                <td>{product.name}</td>
                <td>{product.sku}</td>
                <td>{product.type}</td>
                <td>{product.secondaryType}</td>
                <td>{product.brand}</td>
                <td className="d-flex">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableDataLayer;
