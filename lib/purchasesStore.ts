import { supabase, isSupabaseConfigured } from './supabase';
import type {
  Purchase,
  PurchaseItem,
  Distributor,
  Product,
  PurchaseStatus,
} from './types';

export interface PurchaseLineItemInput {
  product_id: string;
  product_name: string;
  retail_quantity: number;
  warehouse_quantity: number;
  mrp?: number;
  category_name?: string;
  barcode?: string | null;
}

export interface CreatePurchaseInput {
  distributor_id: string;
  notes?: string | null;
  items: PurchaseLineItemInput[];
}

export interface PurchaseWithDetails extends Purchase {
  distributor_name: string;
  distributor_code: string;
  distributor_location?: string | null;
  total_retail_quantity: number;
  total_warehouse_quantity: number;
  items?: PurchaseItemWithProduct[];
}

export interface PurchaseItemWithProduct extends PurchaseItem {
  barcode?: string | null;
  mrp?: number;
  selling_price?: number;
  category_id?: string | null;
  category_name?: string | null;
}

export interface ProductPurchaseSummary {
  product_id: string;
  product_uuid?: string;
  product_name: string;
  category_name: string;
  barcode: string | null;
  mrp: number;
  total_retail_quantity: number;
  total_warehouse_quantity: number;
  total_quantity: number;
  purchase_count: number;
}

export interface PurchasesFilterOptions {
  startDate?: string;
  endDate?: string;
  distributorSearch?: string;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch all distributors for selection/search
 */
export async function getDistributors(): Promise<StoreResponse<Distributor[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('distributors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as Distributor[]) || [], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch distributors';
    return { data: null, error: message };
  }
}

/**
 * Create a new distributor on the fly if needed
 */
export async function createDistributor(input: {
  name: string;
  location?: string | null;
  notes?: string | null;
}): Promise<StoreResponse<Distributor>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.name || input.name.trim() === '') {
    return { data: null, error: 'Distributor name is required.' };
  }

  try {
    const payload = {
      name: input.name.trim(),
      location: input.location?.trim() || null,
      notes: input.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('distributors')
      .insert(payload as never)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Distributor, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create distributor';
    return { data: null, error: message };
  }
}

/**
 * Fetch all purchases with joined distributor information and line items quantities
 * Filterable by Date range (from - to) and Distributor name search
 */
export async function getPurchases(
  filters?: PurchasesFilterOptions
): Promise<StoreResponse<PurchaseWithDetails[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Fetch purchases
    let purchasesQuery = supabase
      .from('purchases')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      const startIso = new Date(`${filters.startDate}T00:00:00`).toISOString();
      purchasesQuery = purchasesQuery.gte('created_at', startIso);
    }

    if (filters?.endDate) {
      const endIso = new Date(`${filters.endDate}T23:59:59.999`).toISOString();
      purchasesQuery = purchasesQuery.lte('created_at', endIso);
    }

    const { data: purchasesData, error: purchasesError } = await purchasesQuery;

    if (purchasesError) {
      return { data: null, error: purchasesError.message };
    }

    const purchases = (purchasesData as Purchase[]) || [];
    if (purchases.length === 0) {
      return { data: [], error: null };
    }

    const purchaseIds = purchases.map((p) => p.id);

    // 2. Fetch distributors and purchase items in parallel
    const [distributorsRes, itemsRes] = await Promise.all([
      supabase.from('distributors').select('*'),
      supabase
        .from('purchase_items')
        .select('*')
        .in('purchase_id', purchaseIds),
    ]);

    const distributorMap = new Map<string, Distributor>();
    if (distributorsRes.data) {
      (distributorsRes.data as Distributor[]).forEach((d) => {
        distributorMap.set(d.id, d);
      });
    }

    // Group items and quantities by purchase_id
    const itemsMap = new Map<
      string,
      { retailQty: number; warehouseQty: number; items: PurchaseItem[] }
    >();

    if (itemsRes.data) {
      (itemsRes.data as PurchaseItem[]).forEach((item) => {
        const pId = item.purchase_id;
        const current = itemsMap.get(pId) || {
          retailQty: 0,
          warehouseQty: 0,
          items: [],
        };
        current.retailQty += Number(item.retail_quantity) || 0;
        current.warehouseQty += Number(item.warehouse_quantity) || 0;
        current.items.push(item);
        itemsMap.set(pId, current);
      });
    }

    // Combine into PurchaseWithDetails
    let result: PurchaseWithDetails[] = purchases.map((p) => {
      const dist = p.distributor_id ? distributorMap.get(p.distributor_id) : null;
      const itemGroup = itemsMap.get(p.id) || {
        retailQty: 0,
        warehouseQty: 0,
        items: [],
      };

      return {
        ...p,
        distributor_name: dist?.name || 'Direct / Unknown Distributor',
        distributor_code: dist?.distributor_code || 'distri-NA',
        distributor_location: dist?.location || null,
        total_retail_quantity: itemGroup.retailQty,
        total_warehouse_quantity: itemGroup.warehouseQty,
        items: itemGroup.items as PurchaseItemWithProduct[],
      };
    });

    // Apply Distributor Search Filter if provided
    if (filters?.distributorSearch && filters.distributorSearch.trim() !== '') {
      const search = filters.distributorSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.distributor_name.toLowerCase().includes(search) ||
          p.distributor_code.toLowerCase().includes(search) ||
          p.purchase_id.toLowerCase().includes(search)
      );
    }

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch purchases';
    return { data: null, error: message };
  }
}

/**
 * Fetch a single purchase by UUID or purchase_id with all item details and distributor info
 */
export async function getPurchaseById(
  id: string
): Promise<StoreResponse<PurchaseWithDetails>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let query = supabase.from('purchases').select('*');
    if (isUuid) {
      query = query.eq('id', id);
    } else {
      query = query.eq('purchase_id', id);
    }

    const { data: purchaseData, error: purchaseError } = await query.single();

    if (purchaseError || !purchaseData) {
      return { data: null, error: purchaseError?.message || 'Purchase not found.' };
    }

    const purchase = purchaseData as Purchase;

    // Fetch distributor and line items with product metadata
    const [distributorRes, itemsRes, productsRes, categoriesRes] = await Promise.all([
      purchase.distributor_id
        ? supabase.from('distributors').select('*').eq('id', purchase.distributor_id).single()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', purchase.id)
        .order('created_at', { ascending: true }),
      supabase.from('products').select('*'),
      supabase.from('categories').select('*'),
    ]);

    const distributor = distributorRes.data as Distributor | null;
    const items = (itemsRes.data as PurchaseItem[]) || [];
    const products = (productsRes.data as Product[]) || [];
    const categories = (categoriesRes.data as Array<{ id: string; name: string }>) || [];

    const productMap = new Map<string, Product>();
    products.forEach((prod) => {
      productMap.set(prod.id, prod);
      if (prod.product_id) productMap.set(prod.product_id, prod);
    });

    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => {
      categoryMap.set(cat.id, cat.name);
    });

    let totalRetail = 0;
    let totalWarehouse = 0;

    const detailedItems: PurchaseItemWithProduct[] = items.map((item) => {
      const prod = productMap.get(item.product_id);
      const catName = prod?.category_id ? categoryMap.get(prod.category_id) || 'Unassigned' : 'Unassigned';

      const rQty = Number(item.retail_quantity) || 0;
      const wQty = Number(item.warehouse_quantity) || 0;

      totalRetail += rQty;
      totalWarehouse += wQty;

      return {
        ...item,
        barcode: prod?.barcode || null,
        mrp: prod?.mrp ? Number(prod.mrp) : 0,
        selling_price: prod?.selling_price ? Number(prod.selling_price) : 0,
        category_id: prod?.category_id || null,
        category_name: catName,
      };
    });

    const result: PurchaseWithDetails = {
      ...purchase,
      distributor_name: distributor?.name || 'Direct / Unknown Distributor',
      distributor_code: distributor?.distributor_code || 'distri-NA',
      distributor_location: distributor?.location || null,
      total_retail_quantity: totalRetail,
      total_warehouse_quantity: totalWarehouse,
      items: detailedItems,
    };

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch purchase details';
    return { data: null, error: message };
  }
}

/**
 * Fetch purchases grouped and aggregated by Products
 * for "By products" view
 */
export async function getPurchasesByProducts(
  filters?: PurchasesFilterOptions
): Promise<StoreResponse<ProductPurchaseSummary[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Fetch purchases in date range
    let purchasesQuery = supabase.from('purchases').select('id, created_at, distributor_id');

    if (filters?.startDate) {
      const startIso = new Date(`${filters.startDate}T00:00:00`).toISOString();
      purchasesQuery = purchasesQuery.gte('created_at', startIso);
    }

    if (filters?.endDate) {
      const endIso = new Date(`${filters.endDate}T23:59:59.999`).toISOString();
      purchasesQuery = purchasesQuery.lte('created_at', endIso);
    }

    const { data: purchasesData, error: purchasesError } = await purchasesQuery;

    if (purchasesError) {
      return { data: null, error: purchasesError.message };
    }

    const purchaseIds = ((purchasesData as Array<{ id: string }>) || []).map((p) => p.id);

    if (purchaseIds.length === 0) {
      return { data: [], error: null };
    }

    // 2. Fetch purchase items, products, categories
    const [itemsRes, productsRes, categoriesRes] = await Promise.all([
      supabase.from('purchase_items').select('*').in('purchase_id', purchaseIds),
      supabase.from('products').select('*'),
      supabase.from('categories').select('*'),
    ]);

    if (itemsRes.error) {
      return { data: null, error: itemsRes.error.message };
    }

    const items = (itemsRes.data as PurchaseItem[]) || [];
    const products = (productsRes.data as Product[]) || [];
    const categories = (categoriesRes.data as Array<{ id: string; name: string }>) || [];

    const productMap = new Map<string, Product>();
    products.forEach((p) => {
      productMap.set(p.id, p);
    });

    const categoryMap = new Map<string, string>();
    categories.forEach((c) => {
      categoryMap.set(c.id, c.name);
    });

    // Group items by product_id
    const aggregated = new Map<string, ProductPurchaseSummary>();

    items.forEach((item) => {
      const prod = productMap.get(item.product_id);
      const prodIdKey = item.product_id;

      const rQty = Number(item.retail_quantity) || 0;
      const wQty = Number(item.warehouse_quantity) || 0;

      const existing = aggregated.get(prodIdKey);

      if (existing) {
        existing.total_retail_quantity += rQty;
        existing.total_warehouse_quantity += wQty;
        existing.total_quantity += rQty + wQty;
        existing.purchase_count += 1;
      } else {
        const catName = prod?.category_id ? categoryMap.get(prod.category_id) || 'Unassigned' : 'Unassigned';
        aggregated.set(prodIdKey, {
          product_id: prod?.product_id || prodIdKey,
          product_uuid: item.product_id,
          product_name: item.product_name || prod?.name || 'Unknown Product',
          category_name: catName,
          barcode: prod?.barcode || null,
          mrp: prod?.mrp ? Number(prod.mrp) : 0,
          total_retail_quantity: rQty,
          total_warehouse_quantity: wQty,
          total_quantity: rQty + wQty,
          purchase_count: 1,
        });
      }
    });

    let result = Array.from(aggregated.values()).sort(
      (a, b) => b.total_quantity - a.total_quantity
    );

    // If search term was given (by product name or code)
    if (filters?.distributorSearch && filters.distributorSearch.trim() !== '') {
      const search = filters.distributorSearch.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search) ||
          p.product_id.toLowerCase().includes(search) ||
          (p.barcode && p.barcode.toLowerCase().includes(search)) ||
          p.category_name.toLowerCase().includes(search)
      );
    }

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch purchases by products';
    return { data: null, error: message };
  }
}

/**
 * Create a new purchase with line items
 * Explicitly updates products table:
 * products.retail_quantity = products.retail_quantity + purchase retail quantity
 * products.warehouse_quantity = products.warehouse_quantity + purchase warehouse quantity
 */
export async function createPurchase(
  input: CreatePurchaseInput
): Promise<StoreResponse<PurchaseWithDetails>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!input.distributor_id) {
    return { data: null, error: 'Please select a distributor.' };
  }

  if (!input.items || input.items.length === 0) {
    return { data: null, error: 'Please add at least one product item to the purchase.' };
  }

  // Validate quantities
  for (const item of input.items) {
    const rQty = Number(item.retail_quantity) || 0;
    const wQty = Number(item.warehouse_quantity) || 0;
    if (rQty < 0 || wQty < 0) {
      return { data: null, error: 'Item quantities cannot be negative.' };
    }
    if (rQty === 0 && wQty === 0) {
      return {
        data: null,
        error: `Please enter retail or warehouse quantity for "${item.product_name}".`,
      };
    }
  }

  try {
    const totalQuantity = input.items.reduce(
      (sum, item) => sum + (Number(item.retail_quantity) || 0) + (Number(item.warehouse_quantity) || 0),
      0
    );

    // 1. Insert Purchase header
    const purchasePayload = {
      distributor_id: input.distributor_id,
      quantity: totalQuantity,
      status: 'completed' as PurchaseStatus,
      notes: input.notes?.trim() || null,
    };

    const { data: purchaseRow, error: purchaseError } = await supabase
      .from('purchases')
      .insert(purchasePayload as never)
      .select()
      .single();

    if (purchaseError || !purchaseRow) {
      return { data: null, error: purchaseError?.message || 'Failed to create purchase record.' };
    }

    const createdPurchase = purchaseRow as Purchase;

    // 2. Insert Purchase Line Items
    const itemsPayload = input.items.map((item) => ({
      purchase_id: createdPurchase.id,
      product_id: item.product_id,
      product_name: item.product_name,
      retail_quantity: Number(item.retail_quantity) || 0,
      warehouse_quantity: Number(item.warehouse_quantity) || 0,
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsPayload as never);

    if (itemsError) {
      return { data: null, error: `Purchase created, but failed to insert items: ${itemsError.message}` };
    }

    // 3. Inward product stock increment (products.quantity = products.quantity + quantity)
    // is automatically and atomically executed by database trigger trg_handle_purchase_item_stock.

    // 4. Return complete purchase details
    const fullPurchaseRes = await getPurchaseById(createdPurchase.id);
    return fullPurchaseRes;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save purchase';
    return { data: null, error: message };
  }
}
