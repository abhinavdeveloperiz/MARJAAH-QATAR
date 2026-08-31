"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Plus, Trash2, Star, Pencil, X, Check } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import type { Address } from "@/lib/store/auth";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(8, "Phone is required"),
  building: z.string().min(1, "Building/Apartment is required"),
  street: z.string().min(1, "Street is required"),
  zone: z.string().min(1, "Zone is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  isDefault: z.boolean(),
});
type AddressForm = z.infer<typeof addressSchema>;

function AddressFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<AddressForm>;
  onSave: (data: AddressForm) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "Home",
      city: "Doha",
      country: "Qatar",
      isDefault: false,
      ...initial,
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-[#0B1120] border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-white">
            {initial ? "Edit Address" : "Add New Address"}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                Label
              </label>
              <select
                {...register("label")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              >
                {["Home", "Office", "Other"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                {...register("fullName")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
              {errors.fullName && <p className="mt-1 text-[11px] text-red-400">{errors.fullName.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <input
              {...register("phone")}
              type="tel"
              placeholder="+974 5000 0000"
              className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
            />
            {errors.phone && <p className="mt-1 text-[11px] text-red-400">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
              Building / Apartment
            </label>
            <input
              {...register("building")}
              placeholder="Al Rayyan Tower, Apt 12"
              className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
            />
            {errors.building && <p className="mt-1 text-[11px] text-red-400">{errors.building.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                Street
              </label>
              <input
                {...register("street")}
                className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                Zone / District
              </label>
              <input
                {...register("zone")}
                placeholder="Zone 61"
                className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                City
              </label>
              <input {...register("city")} className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-[11px] font-sans font-semibold text-white/60 uppercase tracking-wider mb-1.5">
                Country
              </label>
              <input {...register("country")} className="w-full px-3 py-2.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors" />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register("isDefault")} type="checkbox" className="w-4 h-4 rounded" />
            <span className="text-xs text-white/60 font-sans">Set as default address</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 text-xs font-sans font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Address
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  const savedAddresses = useAuthStore((s) => s.savedAddresses);
  const addAddress = useAuthStore((s) => s.addAddress);
  const updateAddress = useAuthStore((s) => s.updateAddress);
  const removeAddress = useAuthStore((s) => s.removeAddress);
  const setDefaultAddress = useAuthStore((s) => s.setDefaultAddress);

  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  const handleSave = (data: AddressForm) => {
    if (editingAddress) {
      updateAddress(editingAddress.id, data);
      toast.success("Address updated");
    } else {
      addAddress(data);
      toast.success("Address added");
    }
    setShowModal(false);
    setEditingAddress(null);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    removeAddress(id);
    toast.success("Address removed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <MapPin className="w-4 h-4 text-[#8D9CF5]" />
            <h1 className="text-xs font-sans font-bold uppercase tracking-wider text-[#8D9CF5]">Saved Addresses</h1>
          </div>
          <p className="text-xl font-tall uppercase text-white">Delivery Addresses</p>
        </div>
        <button
          onClick={() => { setEditingAddress(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8D9CF5]/10 border border-[#8D9CF5]/30 text-[#8D9CF5] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#8D9CF5]/20 transition-all"
        >
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {/* Address Cards */}
      {savedAddresses.length === 0 ? (
        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-12 text-center">
          <MapPin className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-sm text-white/40 font-sans">No saved addresses yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {savedAddresses.map((addr) => (
            <div
              key={addr.id}
              className={cn(
                "bg-[#0B1120] border rounded-2xl p-5 transition-all",
                addr.isDefault ? "border-[#8D9CF5]/40" : "border-white/10"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-sans font-bold uppercase tracking-wider text-white bg-white/5 px-2.5 py-1 rounded-lg">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="flex items-center gap-1 text-[11px] text-[#8D9CF5] font-sans font-semibold">
                      <Star className="w-3 h-3 fill-[#8D9CF5]" /> Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(addr)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-[#8D9CF5] hover:bg-[#8D9CF5]/10 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-sans font-semibold text-white">{addr.fullName}</p>
              <p className="text-xs text-white/50 font-sans mt-1 leading-relaxed">
                {addr.building}{addr.street ? `, ${addr.street}` : ""}<br />
                {addr.zone ? `${addr.zone}, ` : ""}{addr.city}, {addr.country}
              </p>
              <p className="text-xs text-white/40 font-sans mt-1">{addr.phone}</p>

              {!addr.isDefault && (
                <button
                  onClick={() => { setDefaultAddress(addr.id); toast.success("Default address updated"); }}
                  className="mt-3 text-[11px] text-[#8D9CF5] font-sans font-semibold hover:text-white transition-colors"
                >
                  Set as Default
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AddressFormModal
          initial={editingAddress ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingAddress(null); }}
        />
      )}
    </div>
  );
}
