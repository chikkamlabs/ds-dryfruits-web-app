import { supabase, isSupabaseConfigured } from './supabase';
import type { Distributor, Purchase, PurchaseItem } from './types';

export interface DistributorWithStats extends Distributor {
  total_purchases: number;
  total_retail_quantity: number;
  total_warehouse_quantity: number;
  total_quantity: number;
}

export interface DistributorPurchaseItem {
  id: string;
  purchase_id: string;
  status: string;
  notes?: string | null;
  created_at: string;
  total_retail_quantity: number;
  total_warehouse_quantity: number;
  total_quantity: number;
  item_count: number;
}

export interface DistributorDetailsWithPurchases extends Distributor {
  total_purchases: number;
  total_retail_quantity: number;
  total_warehouse_quantity: number;
  total_quantity: number;
  purchases: DistributorPurchaseItem[];
}

export interface CreateDistributorInput {
  name: string;
  location?: string | null;
  notes?: string | null;
}

export interface UpdateDistributorInput {
  name?: string;
  location?: string | null;
  notes?: string | null;
}

export interface StoreResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetch all distributors along with total purchases count and quantity statistics
 */
export async function getDistributors(
  searchQuery?: string
): Promise<StoreResponse<DistributorWithStats[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    // 1. Fetch all distributors
    let distQuery = supabase
      .from('distributors')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: distData, error: distError } = await distQuery;

    if (distError) {
      return { data: null, error: distError.message };
    }

    const distributors = (distData as Distributor[]) || [];
    if (distributors.length === 0) {
      return { data: [], error: null };
    }

    // 2. Fetch all purchases and purchase items to aggregate purchase statistics
    const [purchasesRes, itemsRes] = await Promise.all([
      supabase.from('purchases').select('id, distributor_id, status'),
      supabase.from('purchase_items').select('purchase_id, retail_quantity, warehouse_quantity'),
    ]);

    // Map purchase_id to its retail and warehouse totals
    const purchaseItemTotals = new Map<string, { retail: number; warehouse: number }>();
    if (itemsRes.data) {
      (itemsRes.data as Array<{ purchase_id: string; retail_quantity: number; warehouse_quantity: number }>).forEach((item) => {
        const current = purchaseItemTotals.get(item.purchase_id) || { retail: 0, warehouse: 0 };
        current.retail += Number(item.retail_quantity) || 0;
        current.warehouse += Number(item.warehouse_quantity) || 0;
        purchaseItemTotals.set(item.purchase_id, current);
      });
    }

    // Map distributor_id to aggregate metrics
    const distStatsMap = new Map<
      string,
      { count: number; retail: number; warehouse: number }
    >();

    if (purchasesRes.data) {
      (purchasesRes.data as Array<{ id: string; distributor_id: string | null; status: string }>).forEach((p) => {
        if (!p.distributor_id) return;
        const current = distStatsMap.get(p.distributor_id) || {
          count: 0,
          retail: 0,
          warehouse: 0,
        };

        current.count += 1;
        const itemTotals = purchaseItemTotals.get(p.id) || { retail: 0, warehouse: 0 };
        current.retail += itemTotals.retail;
        current.warehouse += itemTotals.warehouse;

        distStatsMap.set(p.distributor_id, current);
      });
    }

    // Combine distributor info with calculated stats
    let result: DistributorWithStats[] = distributors.map((d) => {
      const stats = distStatsMap.get(d.id) || { count: 0, retail: 0, warehouse: 0 };
      return {
        ...d,
        total_purchases: stats.count,
        total_retail_quantity: stats.retail,
        total_warehouse_quantity: stats.warehouse,
        total_quantity: stats.retail + stats.warehouse,
      };
    });

    // Apply search filter by name and distributor_code / id if specified
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.distributor_code.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          (d.location && d.location.toLowerCase().includes(q))
      );
    }

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch distributors';
    return { data: null, error: message };
  }
}

/**
 * Fetch a single distributor by ID or distributor_code with complete purchase history
 */
export async function getDistributorById(
  id: string
): Promise<StoreResponse<DistributorDetailsWithPurchases>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let distQuery = supabase.from('distributors').select('*');
    if (isUuid) {
      distQuery = distQuery.eq('id', id);
    } else {
      distQuery = distQuery.eq('distributor_code', id);
    }

    const { data: distData, error: distError } = await distQuery.single();

    if (distError) {
      return { data: null, error: distError.message };
    }

    if (!distData) {
      return { data: null, error: 'Distributor not found' };
    }

    const distributor = distData as Distributor;

    // Fetch all purchases associated with this distributor
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .eq('distributor_id', distributor.id)
      .order('created_at', { ascending: false });

    if (purchasesError) {
      return { data: null, error: purchasesError.message };
    }

    const rawPurchases = (purchasesData as Purchase[]) || [];
    const purchaseIds = rawPurchases.map((p) => p.id);

    // Fetch all line items for these purchases
    let purchaseItems: PurchaseItem[] = [];
    if (purchaseIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('purchase_items')
        .select('*')
        .in('purchase_id', purchaseIds);

      if (itemsData) {
        purchaseItems = itemsData as PurchaseItem[];
      }
    }

    // Map purchase_id to its item aggregation
    const itemsMap = new Map<
      string,
      { retail: number; warehouse: number; count: number }
    >();

    purchaseItems.forEach((item) => {
      const current = itemsMap.get(item.purchase_id) || {
        retail: 0,
        warehouse: 0,
        count: 0,
      };
      current.retail += Number(item.retail_quantity) || 0;
      current.warehouse += Number(item.warehouse_quantity) || 0;
      current.count += 1;
      itemsMap.set(item.purchase_id, current);
    });

    let totalRetail = 0;
    let totalWarehouse = 0;

    const formattedPurchases: DistributorPurchaseItem[] = rawPurchases.map((p) => {
      const itemStats = itemsMap.get(p.id) || {
        retail: 0,
        warehouse: 0,
        count: 0,
      };

      totalRetail += itemStats.retail;
      totalWarehouse += itemStats.warehouse;

      return {
        id: p.id,
        purchase_id: p.purchase_id,
        status: p.status,
        notes: p.notes,
        created_at: p.created_at,
        total_retail_quantity: itemStats.retail,
        total_warehouse_quantity: itemStats.warehouse,
        total_quantity: itemStats.retail + itemStats.warehouse,
        item_count: itemStats.count,
      };
    });

    const result: DistributorDetailsWithPurchases = {
      ...distributor,
      total_purchases: formattedPurchases.length,
      total_retail_quantity: totalRetail,
      total_warehouse_quantity: totalWarehouse,
      total_quantity: totalRetail + totalWarehouse,
      purchases: formattedPurchases,
    };

    return { data: result, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch distributor details';
    return { data: null, error: message };
  }
}

/**
 * Create a new distributor
 */
export async function createDistributor(
  input: CreateDistributorInput
): Promise<StoreResponse<Distributor>> {
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
 * Update an existing distributor details (name, location, notes)
 */
export async function updateDistributor(
  id: string,
  input: UpdateDistributorInput
): Promise<StoreResponse<Distributor>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!id) {
    return { data: null, error: 'Distributor ID is required for update.' };
  }

  try {
    const payload: { name?: string; location?: string | null; notes?: string | null } = {};

    if (input.name !== undefined) {
      if (input.name.trim() === '') {
        return { data: null, error: 'Distributor name cannot be empty.' };
      }
      payload.name = input.name.trim();
    }

    if (input.location !== undefined) {
      payload.location = input.location?.trim() || null;
    }

    if (input.notes !== undefined) {
      payload.notes = input.notes?.trim() || null;
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let updateQuery = supabase.from('distributors').update(payload as never);

    if (isUuid) {
      updateQuery = updateQuery.eq('id', id);
    } else {
      updateQuery = updateQuery.eq('distributor_code', id);
    }

    const { data, error } = await updateQuery.select().single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Distributor, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update distributor';
    return { data: null, error: message };
  }
}

/**
 * Delete a distributor (if no dependent purchases exist)
 */
export async function deleteDistributor(id: string): Promise<StoreResponse<boolean>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    let delQuery = supabase.from('distributors').delete();

    if (isUuid) {
      delQuery = delQuery.eq('id', id);
    } else {
      delQuery = delQuery.eq('distributor_code', id);
    }

    const { error } = await delQuery;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete distributor';
    return { data: null, error: message };
  }
}
