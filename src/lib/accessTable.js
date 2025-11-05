// Access table for menu items by role
// Example usage: import { canAccessMenu, accessTable } from "@/lib/accessTable";

export const accessTable = {
  dashboard: ["admin", "user"],
  users: ["admin"],
  warehouses: ["admin", "user"],
  products: ["admin", "user"],
  jobs: ["admin", "user"],
  suppliers: ["admin"],
  reports: ["admin"],
  stockAdjustments: ["admin"],
  stockTransfers: ["admin"],
  // Add more menu keys as needed
};

// Check if a role can access a menu item
export function canAccessMenu(menuKey, role) {
  return accessTable[menuKey]?.includes(role);
}
