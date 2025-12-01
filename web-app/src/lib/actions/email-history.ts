'use server';

import { createClient } from '@/lib/supabase/server';

export interface EmailHistoryItem {
  id: string;
  to_email: string;
  subject: string;
  template_name: string | null;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  metadata: Record<string, any>;
  template_id: string | null;
}

export interface EmailHistoryFilters {
  status?: 'pending' | 'sent' | 'failed';
  search?: string;
  templateId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface EmailHistoryPagination {
  page: number;
  limit: number;
}

export interface EmailHistoryResult {
  emails: EmailHistoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getEmailHistory(
  filters: EmailHistoryFilters = {},
  pagination: EmailHistoryPagination = { page: 1, limit: 50 }
): Promise<EmailHistoryResult> {
  const supabase = await createClient();
  
  let query = supabase
    .from('email_queue')
    .select(`
      id,
      to_email,
      subject,
      status,
      created_at,
      sent_at,
      delivered_at,
      opened_at,
      clicked_at,
      bounced_at,
      error_message,
      metadata,
      template_id
    `, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
  }

  // Handle search filter - fetch more data if searching to filter properly
  const shouldFetchAllForSearch = !!filters.search;
  const fetchLimit = shouldFetchAllForSearch ? 1000 : pagination.limit;
  const fetchFrom = shouldFetchAllForSearch ? 0 : (pagination.page - 1) * pagination.limit;
  const fetchTo = shouldFetchAllForSearch ? fetchLimit - 1 : fetchFrom + pagination.limit - 1;

  query = query
    .order('created_at', { ascending: false })
    .range(fetchFrom, fetchTo);

  const { data, error, count: rawCount } = await query;

  if (error) {
    console.error('Error fetching email history:', error);
    return {
      emails: [],
      total: 0,
      page: pagination.page,
      totalPages: 0,
    };
  }

  // Apply search filter if needed
  let filteredData = data || [];
  
  if (filters.search) {
    const searchTerm = filters.search.trim().toLowerCase();
    filteredData = filteredData.filter((item: any) => {
      const emailMatch = item.to_email?.toLowerCase().includes(searchTerm);
      const subjectMatch = item.subject?.toLowerCase().includes(searchTerm);
      return emailMatch || subjectMatch;
    });
    
    // Apply pagination to filtered results
    const from = (pagination.page - 1) * pagination.limit;
    const to = from + pagination.limit;
    filteredData = filteredData.slice(from, to);
  }

  // Get template names for emails that have template_id
  const templateIds = [...new Set(filteredData.map((item: any) => item.template_id).filter(Boolean))];
  let templatesMap: Map<string, string> = new Map();
  
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('id, name')
      .in('id', templateIds);
    
    if (templates) {
      templates.forEach(t => {
        templatesMap.set(t.id, t.name);
      });
    }
  }

  const emails: EmailHistoryItem[] = filteredData.map((item: any) => ({
    id: item.id,
    to_email: item.to_email,
    subject: item.subject,
    template_name: item.template_id ? templatesMap.get(item.template_id) || null : null,
    status: item.status,
    created_at: item.created_at,
    sent_at: item.sent_at,
    delivered_at: item.delivered_at,
    opened_at: item.opened_at,
    clicked_at: item.clicked_at,
    bounced_at: item.bounced_at,
    error_message: item.error_message,
    metadata: item.metadata || {},
    template_id: item.template_id,
  }));

  // Calculate totals - for search, we need to count all matches, not just fetched ones
  // For now, if searching, total is approximate (only counts fetched items)
  // This can be improved with a proper search implementation
  const total = filters.search 
    ? (data || []).filter((item: any) => {
        const searchTerm = filters.search!.trim().toLowerCase();
        const emailMatch = item.to_email?.toLowerCase().includes(searchTerm);
        const subjectMatch = item.subject?.toLowerCase().includes(searchTerm);
        return emailMatch || subjectMatch;
      }).length
    : (rawCount || 0);
  
  const totalPages = Math.ceil(total / pagination.limit);

  return {
    emails,
    total,
    page: pagination.page,
    totalPages,
  };
}

/**
 * Get email history for a specific player
 * Searches by player_id or family_id in metadata
 */
export async function getPlayerEmailHistory(
  playerId: string,
  familyId: string | null,
  pagination: EmailHistoryPagination = { page: 1, limit: 50 }
): Promise<EmailHistoryResult> {
  const supabase = await createClient();
  
  // Build query - search for emails with player_id or family_id in metadata
  let query = supabase
    .from('email_queue')
    .select(`
      id,
      to_email,
      subject,
      status,
      created_at,
      sent_at,
      delivered_at,
      opened_at,
      clicked_at,
      bounced_at,
      error_message,
      metadata,
      template_id
    `, { count: 'exact' });
  
  // Search in metadata using JSONB operators
  // First fetch a larger set, then filter by metadata
  // We'll fetch more than needed to account for filtering
  const fetchLimit = pagination.limit * 5; // Fetch 5x to account for filtering
  const fetchFrom = (pagination.page - 1) * pagination.limit;
  
  query = query
    .order('created_at', { ascending: false })
    .limit(fetchLimit);
  
  const { data: allData, error: fetchError } = await query;
  
  if (fetchError) {
    console.error('[getPlayerEmailHistory] Error fetching player email history:', fetchError);
    return {
      emails: [],
      total: 0,
      page: pagination.page,
      totalPages: 0,
    };
  }
  
  // Filter by metadata - check if player_id or family_id matches
  const filteredData = (allData || []).filter((item: any) => {
    const metadata = item.metadata || {};
    const emailPlayerId = metadata.player_id;
    const emailFamilyId = metadata.family_id;
    
    // Match if player_id matches OR family_id matches
    return emailPlayerId === playerId || (familyId && emailFamilyId === familyId);
  });
  
  // Get total count (we'll approximate it)
  const { count: totalCount } = await supabase
    .from('email_queue')
    .select('*', { count: 'exact', head: true });
  
  // Apply pagination to filtered results
  const paginatedData = filteredData.slice(fetchFrom, fetchFrom + pagination.limit);
  
  // Get template names for emails that have template_id
  const templateIds = [...new Set(paginatedData.map((item: any) => item.template_id).filter(Boolean))];
  let templatesMap: Map<string, string> = new Map();
  
  if (templateIds.length > 0) {
    const { data: templates } = await supabase
      .from('email_templates')
      .select('id, name')
      .in('id', templateIds);
    
    if (templates) {
      templates.forEach(t => {
        templatesMap.set(t.id, t.name);
      });
    }
  }
  
  const emails: EmailHistoryItem[] = paginatedData.map((item: any) => ({
    id: item.id,
    to_email: item.to_email,
    subject: item.subject,
    template_name: item.template_id ? templatesMap.get(item.template_id) || null : null,
    status: item.status,
    created_at: item.created_at,
    sent_at: item.sent_at,
    delivered_at: item.delivered_at,
    opened_at: item.opened_at,
    clicked_at: item.clicked_at,
    bounced_at: item.bounced_at,
    error_message: item.error_message,
    metadata: item.metadata || {},
    template_id: item.template_id,
  }));
  
  // Estimate total based on filtered results (approximate)
  const estimatedTotal = filteredData.length;
  const totalPages = Math.ceil(estimatedTotal / pagination.limit);
  
  return {
    emails,
    total: estimatedTotal,
    page: pagination.page,
    totalPages,
  };
}

