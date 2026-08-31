"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import toast from "react-hot-toast";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(8, "Enter a valid phone number"),
});
type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, email: user.email, phone: user.phone },
  });

  const onSubmit = async (values: FormValues) => {
    const result = updateProfile(values);
    if (result.success) {
      toast.success("Profile updated successfully");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <User className="w-4 h-4 text-[#8D9CF5]" />
          <h1 className="text-xs font-sans font-bold uppercase tracking-wider text-[#8D9CF5]">My Profile</h1>
        </div>
        <p className="text-xl font-tall uppercase text-white">Personal Information</p>
      </div>

      {/* Avatar */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4063B2] to-[#8D9CF5] flex items-center justify-center text-white font-tall text-3xl flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-sans font-bold text-white">{user.name}</p>
            <p className="text-xs text-white/40 font-sans mt-1">{user.email}</p>
            <p className="text-[11px] text-white/30 font-sans mt-2 uppercase tracking-wider">
              Member ID: {user.id.slice(0, 12).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xs font-sans font-bold uppercase tracking-wider text-white/70 mb-5">
          Edit Details
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                {...register("name")}
                type="text"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
              {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-sans font-semibold text-white/60 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                {...register("phone")}
                type="tel"
                className="w-full px-4 py-3.5 rounded-xl bg-[#10192D] border border-white/10 focus:border-[#8D9CF5] text-white text-sm focus:outline-none transition-colors"
              />
              {errors.phone && <p className="mt-1.5 text-xs text-red-400">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#4063B2] to-[#8D9CF5] text-white text-xs font-sans font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
