const API_BASE_URL = "https://aabharan.vercel.app/api";
const TOKEN_KEY = "aabharan_admin_token";

// Token Management
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  message?: string;
  token?: string;
  admin?: AdminUser;
  success?: boolean;
  error?: string;
}

export interface MeResponse {
  message?: string;
  admin?: AdminUser;
  user?: AdminUser;
  success?: boolean;
  error?: string;
}

export interface Store {
  id: string;
  storeId?: string;
  name: string;
  logo: string;
  email: string;
  city: string;
  state: string;
  plan: string;
  status: string;
  expiryDate: string;
  amount: number;
  views: number;
  featured?: boolean;
  branches?: Array<{ id: string; name: string; city?: string }>;
  logoBg?: string;
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<LoginResponse & { success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data: LoginResponse = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Login failed",
      };
    }

    // Store token in localStorage
    if (data.token) {
      setToken(data.token);
    }

    return {
      success: true,
      message: data.message,
      token: data.token,
      admin: data.admin,
    };
  } catch (error) {
    console.error("Login API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export async function getCurrentAdmin(): Promise<MeResponse & { success: boolean }> {
  try {
    const token = getToken();

    if (!token) {
      console.log("No token found in localStorage");
      return {
        success: false,
        error: "No token found",
      };
    }

    console.log("Fetching admin info with token:", token.substring(0, 20) + "...");

    const response = await fetch(`${API_BASE_URL}/admin/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data: MeResponse = await response.json();

    console.log("Admin ME response:", response.status, data);

    if (!response.ok) {
      // If token is invalid, clear it
      if (response.status === 401) {
        removeToken();
      }
      return {
        success: false,
        error: data.message || "Failed to fetch admin info",
      };
    }

    // API returns 'user' field but we normalize it to 'admin'
    const admin = data.admin || data.user;

    if (!admin) {
      return {
        success: false,
        error: "No admin data in response",
      };
    }

    return {
      success: true,
      message: data.message,
      admin: admin,
    };
  } catch (error) {
    console.error("Get admin API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export function logoutAdmin(): void {
  removeToken();
  localStorage.removeItem("aabharan_admin_profile");
}

export async function changeStoreStatus(
  storeId: string,
  status: "ACTIVE" | "RESTRICTED"
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const token = getToken();

    if (!token) {
      return {
        success: false,
        error: "No token found",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/store/change-status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        storeId,
        status,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to update store status",
      };
    }

    return {
      success: true,
      message: data.message || "Store status updated",
    };
  } catch (error) {
    console.error("Change store status API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export async function getStores(): Promise<{ success: boolean; stores: Store[]; error?: string }> {
  try {
    const token = getToken();

    if (!token) {
      console.log("No token found for fetching stores");
      return {
        success: false,
        stores: [],
        error: "No token found",
      };
    }

    console.log("Fetching stores from API");
    const response = await fetch(`${API_BASE_URL}/admin/store/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    console.log("Stores response:", response.status, data);

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
      }
      return {
        success: false,
        stores: [],
        error: data.error || data.message || "Failed to fetch stores",
      };
    }

    const storeAdmins = Array.isArray(data.storeAdmins) ? data.storeAdmins : [];

    return {
      success: true,
      stores: storeAdmins.map((admin: any) => {
        const store = admin.store || {};
        const branchCities = (store.branches || [])
          .map((branch: any) => branch.city)
          .filter(Boolean)
          .map((city: string) => city.trim());

        const uniqueCities = [...new Set(branchCities)];

        return {
          id: admin.id,
          storeId: admin.id,
          name: store.name || admin.name || "-",
          logo: store.logo || "",
          email: store.email || admin.email || "-",
          city: uniqueCities.length ? uniqueCities.join(", ") : store.city || "-",
          state: store.state || "-",
          plan: admin.plan?.name || "-",
          status: String(admin.status || "active").toLowerCase(),
          expiryDate: admin.subscription?.expiryDate
            ? new Date(admin.subscription.expiryDate).toLocaleDateString()
            : "-",
          amount: admin.subscription?.amountPaid ?? 0,
          views: 0,
          featured: false,
          branches: store.branches || [],
          logoBg: "from-gold to-gold/80",
        };
      }),
    };
  } catch (error) {
    console.error("Get stores API error:", error);
    return {
      success: false,
      stores: [],
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}



export interface Plan {
  id: string;
  name: string;
  months: number;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export async function createPlan(
  name: string,
  months: number,
  cost: number
): Promise<{ success: boolean; plan?: Plan; error?: string }> {
  try {
    const token = getToken();
    if (!token) {
      return { success: false, error: "No token found" };
    }

    const response = await fetch(`${API_BASE_URL}/admin/plans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, months, cost }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to create plan" };
    }

    return { success: true, plan: data.plan };
  } catch (error) {
    console.error("Create plan API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export async function getPlans(): Promise<{ success: boolean; plans: Plan[]; error?: string }> {
  try {
    const token = getToken();
    if (!token) {
      return { success: false, plans: [], error: "No token found" };
    }

    const response = await fetch(`${API_BASE_URL}/admin/plans`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, plans: [], error: data.error || "Failed to fetch plans" };
    }

    return { success: true, plans: data.plans || [] };
  } catch (error) {
    console.error("Get plans API error:", error);
    return {
      success: false,
      plans: [],
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export async function updatePlan(
  id: string,
  updates: { name?: string; months?: number; cost?: number }
): Promise<{ success: boolean; plan?: Plan; error?: string }> {
  try {
    const token = getToken();
    if (!token) {
      return { success: false, error: "No token found" };
    }

    const response = await fetch(`${API_BASE_URL}/admin/plans/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update plan" };
    }

    return { success: true, plan: data.plan };
  } catch (error) {
    console.error("Update plan API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}


export interface CreateStoreRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateStoreResponse {
  message?: string;
  storeAdmin?: {
    id: string;
    email: string;
    name: string;
    status: string;
    createdAt: string;
  };
  store?: {
    id: string;
    publicSlug: string;
  };
  error?: string;
}

export async function createStore(
  payload: CreateStoreRequest
): Promise<CreateStoreResponse & { success: boolean }> {
  try {
    const token = getToken();

    if (!token) {
      return { success: false, error: "No token found" };
    }

    const response = await fetch(`${API_BASE_URL}/admin/store/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email.toLowerCase(),
        password: payload.password,
      }),
    });

    const data: CreateStoreResponse = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
      }
      return {
        success: false,
        error: data.error || data.message || "Failed to create store",
      };
    }

    return {
      success: true,
      message: data.message,
      storeAdmin: data.storeAdmin,
      store: data.store,
    };
  } catch (error) {
    console.error("Create store API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export interface AssignPlanResponse {
  message?: string;
  subscription?: {
    id: string;
    planId: string;
    amountPaid: number;
    startDate: string;
    expiryDate: string;
    isActive: boolean;
    plan: Plan;
  };
  error?: string;
}

export async function assignPlan(
  storeAdminId: string,
  planId: string
): Promise<AssignPlanResponse & { success: boolean }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    const response = await fetch(`${API_BASE_URL}/admin/plans/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ storeAdminId, planId }),
    });

    const data: AssignPlanResponse = await response.json();

    if (!response.ok) {
      if (response.status === 401) removeToken();
      return {
        success: false,
        error: data.error || "Failed to assign plan",
      };
    }

    return {
      success: true,
      message: data.message,
      subscription: data.subscription,
    };
  } catch (error) {
    console.error("Assign plan API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";
export type PaymentMethod = "UPI" | "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "OTHER";

export interface Payment {
  id: string;
  invoiceNo: string;
  txnRef: string | null;
  storeAdminId: string;
  sponsorName: string;
  planId: string | null;
  planName: string;
  method: PaymentMethod;
  amount: number;
  discount: number;
  status: PaymentStatus;
  collectedBy: string;
  notes: string | null;
  paidAt: string;
}

export interface PaymentSummary {
  today: number;
  week: number;
  month: number;
  lifetime: number;
}

export async function getPayments(): Promise<{
  success: boolean;
  payments: Payment[];
  summary: PaymentSummary;
  error?: string;
}> {
  try {
    const token = getToken();
    if (!token) {
      return {
        success: false,
        payments: [],
        summary: { today: 0, week: 0, month: 0, lifetime: 0 },
        error: "No token found",
      };
    }

    const response = await fetch(`${API_BASE_URL}/admin/payment`, {
      method: "GET",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) removeToken();
      return {
        success: false,
        payments: [],
        summary: { today: 0, week: 0, month: 0, lifetime: 0 },
        error: data.error || "Failed to fetch payments",
      };
    }

    return {
      success: true,
      summary: data.summary || { today: 0, week: 0, month: 0, lifetime: 0 },
      payments: (data.payments || []).map((p: any) => ({
        id: p.id,
        invoiceNo: p.invoiceNo,
        txnRef: p.txnRef,
        storeAdminId: p.storeAdminId,
        sponsorName: p.storeAdmin?.store?.name || p.storeAdmin?.name || "-",
        planId: p.planId,
        planName: p.planName || p.plan?.name || "-",
        method: p.method,
        amount: p.amount,
        discount: p.discount,
        status: p.status,
        collectedBy: p.collectedBy,
        notes: p.notes,
        paidAt: p.paidAt,
      })),
    };
  } catch (error) {
    console.error("Get payments API error:", error);
    return {
      success: false,
      payments: [],
      summary: { today: 0, week: 0, month: 0, lifetime: 0 },
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

export interface CreatePaymentRequest {
  storeAdminId: string;
  planId?: string;
  method: PaymentMethod;
  amount: number;
  discount?: number;
  txnRef?: string;
  collectedBy?: string;
  notes?: string;
}

export async function createPayment(
  payload: CreatePaymentRequest
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    const response = await fetch(`${API_BASE_URL}/admin/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to record payment" };
    }

    const p = data.payment;
    return {
      success: true,
      payment: {
        id: p.id,
        invoiceNo: p.invoiceNo,
        txnRef: p.txnRef,
        storeAdminId: p.storeAdminId,
        sponsorName: p.storeAdmin?.store?.name || p.storeAdmin?.name || "-",
        planId: p.planId,
        planName: p.planName || "-",
        method: p.method,
        amount: p.amount,
        discount: p.discount,
        status: p.status,
        collectedBy: p.collectedBy,
        notes: p.notes,
        paidAt: p.paidAt,
      },
    };
  } catch (error) {
    console.error("Create payment API error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error occurred" };
  }
}

export async function updatePayment(
  id: string,
  updates: {
    amount?: number;
    discount?: number;
    status?: PaymentStatus;
    method?: PaymentMethod;
    txnRef?: string;
    notes?: string;
  }
): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    const response = await fetch(`${API_BASE_URL}/admin/payment/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update payment" };
    }

    const p = data.payment;
    return {
      success: true,
      payment: {
        id: p.id,
        invoiceNo: p.invoiceNo,
        txnRef: p.txnRef,
        storeAdminId: p.storeAdminId,
        sponsorName: p.storeAdmin?.store?.name || p.storeAdmin?.name || "-",
        planId: p.planId,
        planName: p.planName || "-",
        method: p.method,
        amount: p.amount,
        discount: p.discount,
        status: p.status,
        collectedBy: p.collectedBy,
        notes: p.notes,
        paidAt: p.paidAt,
      },
    };
  } catch (error) {
    console.error("Update payment API error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Network error occurred" };
  }
}

export type EnquiryStatus = "NEW" | "IN_PROGRESS" | "CONTACTED" | "CLOSED";

export interface Enquiry {
  id: string;
  productId: string;
  storeAdminId: string;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export  async function getEnquiries(): Promise<{
  success: boolean;
  enquiries: Enquiry[];
  error?: string;
}> {
  try {
    const token = getToken();
    if (!token) return { success: false, enquiries: [], error: "No token found" };

    // NOTE: if your route is actually "/api/admin/enquires" (typo spelling),
    // change "enquiries" below to "enquires".
    const response = await fetch(`${API_BASE_URL}/admin/enquires`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) removeToken(); // Assuming clear/remove token call
      return { success: false, enquiries: [], error: data.error || "Failed to fetch enquiries" };
    }

    return { success: true, enquiries: data.enquiries || [] };
  } catch (error) {
    console.error("Get enquiries API error:", error);
    return {
      success: false,
      enquiries: [],
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// ============================================================
// Store Images — DigitalOcean Spaces backed
// Base URL: /admin/store-imgs
// GET: any valid token (admin / storeadmin / customer)
// POST / PATCH / DELETE: admin role token required
// ============================================================

export type StoreImageType = "COVER_PHOTO" | "FIRST_PHOTO" | "ADVERTISE_PHOTO";

export interface StoreImage {
  id: string;
  img: string;
  type: StoreImageType;
  expiryDate: string | null;
  storeAdminId: string;
  storeId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const IMAGE_CAPS: Record<StoreImageType, number> = {
  COVER_PHOTO: 1,
  FIRST_PHOTO: 5,
  ADVERTISE_PHOTO: 10,
};

// ------------------------------------------------------------
// 1. GET /admin/store-imgs — any valid token, full columns
// Optional filters: type, storeAdminId, storeId
// ------------------------------------------------------------
export async function getStoreImages(filters?: {
  type?: StoreImageType;
  storeAdminId?: string;
  storeId?: string;
}): Promise<{ success: boolean; images: StoreImage[]; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, images: [], error: "No token found" };

    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.storeAdminId) params.set("storeAdminId", filters.storeAdminId);
    if (filters?.storeId) params.set("storeId", filters.storeId);
    const qs = params.toString();

    // FIX 1: Cleaned up corrupted URL string
    const response = await fetch(
      `${API_BASE_URL}/admin/store-imgs${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) clearToken();
      return {
        success: false,
        images: [],
        error: data.error || "Failed to fetch images",
      };
    }

    return { success: true, images: data.images || [] };
  } catch (error) {
    console.error("Get store images API error:", error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// ------------------------------------------------------------
// 2. POST /admin/store-imgs — admin only, multipart upload
// Required: file, type, storeAdminId
// Optional: storeId, expiryDate (ISO or null), displayOrder
// ------------------------------------------------------------
export async function createStoreImage(payload: {
  file: File;
  type: StoreImageType;
  storeAdminId: string;
  storeId?: string;
  expiryDate?: string | null;
  displayOrder?: number;
}): Promise<{ success: boolean; image?: StoreImage; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    const fd = new FormData();
    fd.append("file", payload.file);
    // FIX 2: Corrected payload.type property reference
    fd.append("type", payload.type);
    fd.append("storeAdminId", payload.storeAdminId);
    if (payload.storeId) fd.append("storeId", payload.storeId);
    if (payload.expiryDate) fd.append("expiryDate", payload.expiryDate);
    if (typeof payload.displayOrder === "number") {
      fd.append("displayOrder", String(payload.displayOrder));
    }

    // Do NOT set Content-Type manually — browser sets multipart boundary
    const response = await fetch(`${API_BASE_URL}/admin/store-imgs`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to add image" };
    }

    return { success: true, image: data.image };
  } catch (error) {
    console.error("Create store image API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// ------------------------------------------------------------
// 3. PATCH /admin/store-imgs/[id] — admin only
// Multipart when replacing the file; JSON for field-only edits
// expiryDate: ISO string to set, null to clear (never expires)
// ------------------------------------------------------------
export async function updateStoreImage(
  id: string,
  payload: {
    file?: File; // new image file (optional)
    type?: StoreImageType;
    expiryDate?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; image?: StoreImage; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    let response: Response;

    if (payload.file instanceof File) {
      // multipart — new file + fields
      const fd = new FormData();
      fd.append("file", payload.file);
      if (payload.type) fd.append("type", payload.type);
      if (payload.expiryDate !== undefined) {
        fd.append("expiryDate", payload.expiryDate ?? "");
      }
      if (typeof payload.displayOrder === "number") {
        fd.append("displayOrder", String(payload.displayOrder));
      }
      if (typeof payload.isActive === "boolean") {
        fd.append("isActive", String(payload.isActive));
      }

      // FIX 3 & 4: Fixed URL and missing colon in method property
      response = await fetch(`${API_BASE_URL}/admin/store-imgs/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    } else {
      // JSON — field edits only (expiry, order, active)
      // FIX 5: Fixed URL and missing colon in Authorization header
      response = await fetch(`${API_BASE_URL}/admin/store-imgs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to update image" };
    }

    return { success: true, image: data.image };
  } catch (error) {
    console.error("Update store image API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}

// ------------------------------------------------------------
// 4. DELETE /admin/store-imgs/[id] — admin only
// FIX 6: Added missing '//' for comment
// Removes the Spaces object + DB row
// ------------------------------------------------------------
export async function deleteStoreImage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: "No token found" };

    // FIX 7: Fixed corrupted URL string
    const response = await fetch(`${API_BASE_URL}/admin/store-imgs/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || "Failed to delete image" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete store image API error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
}