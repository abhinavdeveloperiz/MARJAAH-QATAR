import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  building: string;
  street: string;
  zone: string;
  city: string;
  country: string;
  isDefault: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
}

export type OrderStatus = "processing" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  address: Address;
  paymentMethod: string;
  trackingNumber?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
}

interface AuthStore {
  user: User | null;
  isLoggedIn: boolean;
  savedAddresses: Address[];
  orderHistory: Order[];

  register: (data: { name: string; email: string; phone: string; password: string }) => { success: boolean; error?: string };
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: { name: string; email: string; phone: string }) => { success: boolean };
  changePassword: (currentPassword: string, newPassword: string) => { success: boolean; error?: string };

  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, data: Partial<Omit<Address, "id">>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;

  placeOrder: (order: Omit<Order, "id" | "date">) => string;
}

// ─── Seed Orders ──────────────────────────────────────────────────────────────

const SEED_ORDERS: Order[] = [
  {
    id: "ORD-20240801-001",
    date: "2024-08-01T10:30:00Z",
    status: "delivered",
    items: [
      {
        productId: "p001",
        name: "ASUS ROG Strix G16 Gaming Laptop",
        image: "/images/products/asus-rog-g16.jpg",
        price: 6499,
        quantity: 1,
      },
    ],
    subtotal: 6499,
    shipping: 0,
    total: 6499,
    address: {
      id: "addr-seed-1",
      label: "Home",
      fullName: "M.SHOP Customer",
      phone: "+974 5000 0000",
      building: "Al Rayyan Tower, Apt 12",
      street: "Al Rayyan Road",
      zone: "Zone 61",
      city: "Doha",
      country: "Qatar",
      isDefault: true,
    },
    paymentMethod: "Credit Card ending in 4242",
    trackingNumber: "QAT-TRK-8821947",
  },
  {
    id: "ORD-20240820-002",
    date: "2024-08-20T15:00:00Z",
    status: "shipped",
    items: [
      {
        productId: "p004",
        name: "Logitech MX Master 3S Wireless Mouse",
        image: "/images/products/logitech-mx-master-3s.jpg",
        price: 379,
        quantity: 2,
      },
      {
        productId: "p007",
        name: "Samsung 970 EVO Plus 1TB NVMe SSD",
        image: "/images/products/samsung-970-evo-plus.jpg",
        price: 449,
        quantity: 1,
      },
    ],
    subtotal: 1207,
    shipping: 0,
    total: 1207,
    address: {
      id: "addr-seed-1",
      label: "Home",
      fullName: "M.SHOP Customer",
      phone: "+974 5000 0000",
      building: "Al Rayyan Tower, Apt 12",
      street: "Al Rayyan Road",
      zone: "Zone 61",
      city: "Doha",
      country: "Qatar",
      isDefault: true,
    },
    paymentMethod: "Cash on Delivery",
    trackingNumber: "QAT-TRK-9934012",
  },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isLoggedIn: false,
      savedAddresses: [],
      orderHistory: [],

      register: (data) => {
        const newUser: User = {
          id: `user-${Date.now()}`,
          name: data.name,
          email: data.email,
          phone: data.phone,
          passwordHash: data.password,
          createdAt: new Date().toISOString(),
        };

        const defaultAddress: Address = {
          id: `addr-${Date.now()}`,
          label: "Home",
          fullName: data.name,
          phone: data.phone,
          building: "",
          street: "",
          zone: "",
          city: "Doha",
          country: "Qatar",
          isDefault: true,
        };

        set({
          user: newUser,
          isLoggedIn: true,
          savedAddresses: [defaultAddress],
          orderHistory: SEED_ORDERS,
        });

        return { success: true };
      },

      login: (email, password) => {
        const user = get().user;
        if (!user) {
          return { success: false, error: "No account found. Please register first." };
        }
        if (user.email !== email || user.passwordHash !== password) {
          return { success: false, error: "Incorrect email or password." };
        }
        set({ isLoggedIn: true });
        return { success: true };
      },

      logout: () => {
        set({ isLoggedIn: false });
      },

      updateProfile: (data) => {
        const user = get().user;
        if (!user) return { success: false };
        set({ user: { ...user, ...data } });
        return { success: true };
      },

      changePassword: (currentPassword, newPassword) => {
        const user = get().user;
        if (!user) return { success: false, error: "Not logged in." };
        if (user.passwordHash !== currentPassword) {
          return { success: false, error: "Current password is incorrect." };
        }
        set({ user: { ...user, passwordHash: newPassword } });
        return { success: true };
      },

      addAddress: (address) => {
        const id = `addr-${Date.now()}`;
        const newAddress: Address = { ...address, id };
        set((state) => ({
          savedAddresses: address.isDefault
            ? [
                ...state.savedAddresses.map((a) => ({ ...a, isDefault: false })),
                newAddress,
              ]
            : [...state.savedAddresses, newAddress],
        }));
      },

      updateAddress: (id, data) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.map((a) =>
            a.id === id ? { ...a, ...data } : a
          ),
        }));
      },

      removeAddress: (id) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.filter((a) => a.id !== id),
        }));
      },

      setDefaultAddress: (id) => {
        set((state) => ({
          savedAddresses: state.savedAddresses.map((a) => ({
            ...a,
            isDefault: a.id === id,
          })),
        }));
      },

      placeOrder: (order) => {
        const id = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
          get().orderHistory.length + 1
        ).padStart(3, "0")}`;
        const newOrder: Order = { ...order, id, date: new Date().toISOString() };
        set((state) => ({
          orderHistory: [newOrder, ...state.orderHistory],
        }));
        return id;
      },
    }),
    { name: "marjaah-auth" }
  )
);
