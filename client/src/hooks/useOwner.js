/**
 * React Query hooks for Owner-specific endpoints
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/auth';

/**
 * Fetch monitoring statistics (owner only)
 */
const fetchMonitoringStats = async () => {
  const response = await authenticatedFetch('/api/monitoring/stats');
  
  if (!response.ok) {
    throw new Error('Failed to fetch monitoring statistics');
  }
  
  return response.json();
};

/**
 * Fetch owner products (search)
 */
const fetchOwnerProducts = async (search = '') => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('query', search);
  
  const url = `/api/products/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await authenticatedFetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return response.json();
};

/**
 * Fetch owner statistics
 */
const fetchOwnerStatistics = async () => {
  const response = await authenticatedFetch('/api/statistics/products');
  
  if (!response.ok) {
    throw new Error('Failed to fetch statistics');
  }
  
  return response.json();
};

/**
 * Fetch product statistics
 */
const fetchProductStatistics = async (productId) => {
  const response = await authenticatedFetch(`/api/statistics/products/${productId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch product statistics');
  }
  
  return response.json();
};

/**
 * Fetch material prices
 */
const fetchMaterialPrices = async () => {
  const response = await authenticatedFetch('/api/material-prices');
  
  if (!response.ok) {
    throw new Error('Failed to fetch material prices');
  }
  
  return response.json();
};

/**
 * Fetch gold price by karat
 */
const fetchGoldPrice = async (karat) => {
  const response = await authenticatedFetch(`/api/material-prices/gold/${karat}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch gold price');
  }
  
  return response.json();
};

/**
 * Update material price
 */
const updateMaterialPrice = async (priceData) => {
  const response = await authenticatedFetch('/api/material-prices', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(priceData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update material price');
  }
  
  return response.json();
};

/**
 * Fetch owner wishlist with pagination and filters
 */
const fetchOwnerWishlist = async (params = {}) => {
  const { page = 1, limit = 20, sortBy = 'createdAt', status } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy: sortBy.toString(),
  });
  if (status) queryParams.append('status', status);
  
  const url = `/api/wishlist?${queryParams.toString()}`;
  const response = await authenticatedFetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch wishlist');
  }
  
  return response.json();
};

/**
 * Fetch wishlist unseen count
 */
const fetchWishlistUnseenCount = async () => {
  const response = await authenticatedFetch('/api/wishlist/unseen-count');
  
  if (!response.ok) {
    throw new Error('Failed to fetch wishlist unseen count');
  }
  
  return response.json();
};

/**
 * Delete wishlist request (owner only)
 */
const deleteWishlistRequest = async (id) => {
  const response = await authenticatedFetch(`/api/wishlist/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete wishlist request');
  }
  
  return response.json();
};

/**
 * Respond to wishlist request (owner only)
 */
const respondToWishlist = async ({ id, responseData }) => {
  const response = await authenticatedFetch(`/api/wishlist/${id}/response`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(responseData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to respond to wishlist request');
  }
  
  return response.json();
};

/**
 * Mark wishlist as seen
 */
const markWishlistAsSeen = async () => {
  const response = await authenticatedFetch('/api/wishlist/mark-seen', {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark wishlist as seen');
  }
  
  return response.json();
};

/**
 * Fetch favorite alerts
 */
const fetchFavoriteAlerts = async () => {
  const response = await authenticatedFetch('/api/favorite-alerts');
  
  if (!response.ok) {
    throw new Error('Failed to fetch favorite alerts');
  }
  
  return response.json();
};

/**
 * Fetch reservations unseen count
 */
const fetchReservationsUnseenCount = async () => {
  const response = await authenticatedFetch('/api/reservations/unseen-count');
  
  if (!response.ok) {
    throw new Error('Failed to fetch reservations unseen count');
  }
  
  return response.json();
};

/**
 * Mark reservations as seen
 */
const markReservationsAsSeen = async () => {
  const response = await authenticatedFetch('/api/reservations/mark-seen', {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Failed to mark reservations as seen');
  }
  
  return response.json();
};

/**
 * Hook to fetch owner products with caching
 * @param {string} search - Search query
 * @param {object} options - React Query options
 */
export const useOwnerProducts = (search = '', options = {}) => {
  return useQuery({
    queryKey: ['products', 'owner', search],
    queryFn: () => fetchOwnerProducts(search),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch owner statistics with caching
 * @param {object} options - React Query options
 */
export const useOwnerStatistics = (options = {}) => {
  return useQuery({
    queryKey: ['statistics', 'products'],
    queryFn: fetchOwnerStatistics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch product statistics with caching
 * @param {string} productId - Product ID
 * @param {object} options - React Query options
 */
export const useProductStatistics = (productId, options = {}) => {
  return useQuery({
    queryKey: ['statistics', 'product', productId],
    queryFn: () => fetchProductStatistics(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch material prices with caching
 * @param {object} options - React Query options
 */
export const useMaterialPrices = (options = {}) => {
  return useQuery({
    queryKey: ['material-prices'],
    queryFn: fetchMaterialPrices,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    ...options,
  });
};

/**
 * Hook to fetch gold price by karat with caching
 * @param {string} karat - Gold karat
 * @param {object} options - React Query options
 */
export const useGoldPrice = (karat, options = {}) => {
  return useQuery({
    queryKey: ['material-prices', 'gold', karat],
    queryFn: () => fetchGoldPrice(karat),
    enabled: !!karat,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    ...options,
  });
};

/**
 * Hook to update material price
 */
export const useUpdateMaterialPrice = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateMaterialPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-prices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

/**
 * Hook to fetch owner certificates (re-export from useCertificates)
 */
export { useOwnerCertificates } from './useCertificates';

/**
 * Hook to fetch owner wishlist with caching
 * @param {object} params - Query parameters (page, limit, sortBy, status)
 * @param {object} options - React Query options
 */
export const useOwnerWishlist = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['wishlist', 'owner', params],
    queryFn: () => fetchOwnerWishlist(params),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch wishlist unseen count with caching
 * @param {object} options - React Query options
 */
export const useWishlistUnseenCount = (options = {}) => {
  return useQuery({
    queryKey: ['wishlist', 'unseen-count'],
    queryFn: fetchWishlistUnseenCount,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to delete wishlist request (owner only)
 */
export const useDeleteWishlistRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteWishlistRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'owner'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'unseen-count'] });
    },
  });
};

/**
 * Hook to respond to wishlist request (owner only)
 */
export const useRespondToWishlist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: respondToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'owner'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'unseen-count'] });
    },
  });
};

/**
 * Hook to mark wishlist as seen
 */
export const useMarkWishlistAsSeen = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markWishlistAsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

/**
 * Hook to fetch favorite alerts with caching
 * @param {object} options - React Query options
 */
export const useFavoriteAlerts = (options = {}) => {
  return useQuery({
    queryKey: ['favorite-alerts'],
    queryFn: fetchFavoriteAlerts,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch reservations unseen count with caching
 * @param {object} options - React Query options
 */
export const useReservationsUnseenCount = (options = {}) => {
  return useQuery({
    queryKey: ['reservations', 'unseen-count'],
    queryFn: fetchReservationsUnseenCount,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

/**
 * Hook to mark reservations as seen
 */
export const useMarkReservationsAsSeen = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markReservationsAsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

/**
 * Fetch visit statistics (owner only)
 */
const fetchVisitStatistics = async () => {
  const response = await authenticatedFetch('/api/visits/statistics');
  
  if (!response.ok) {
    throw new Error('Failed to fetch visit statistics');
  }
  
  return response.json();
};

/**
 * Hook to fetch monitoring statistics (owner only)
 * Refreshes every 30 seconds for real-time monitoring
 */
export const useMonitoringStats = (options = {}) => {
  return useQuery({
    queryKey: ['monitoring', 'stats'],
    queryFn: fetchMonitoringStats,
    staleTime: 30 * 1000, // 30 seconds - refresh frequently for monitoring
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
    ...options,
  });
};

/**
 * Hook to fetch visit statistics (owner only)
 * Cached for 5 minutes (matches server-side cache)
 */
export const useVisitStatistics = (options = {}) => {
  return useQuery({
    queryKey: ['visits', 'statistics'],
    queryFn: fetchVisitStatistics,
    staleTime: 5 * 60 * 1000, // 5 minutes - matches server cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    ...options,
  });
};

/**
 * Fetch locked users list (owner only)
 */
const fetchLockedUsers = async () => {
  const response = await authenticatedFetch('/api/users/admin/users/locked');
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch locked users' }));
    throw new Error(error.message || 'Failed to fetch locked users');
  }
  return response.json();
};

/**
 * Unlock user account (owner only)
 */
const unlockUser = async (userId) => {
  const response = await authenticatedFetch(
    `/api/users/admin/users/${userId}/unlock`,
    { method: 'POST' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to unlock user' }));
    throw new Error(error.message || 'Failed to unlock user');
  }
  return response.json();
};

/**
 * Hook to fetch locked users (owner only)
 * No caching - security data must be fresh
 */
export const useLockedUsers = (options = {}) => {
  return useQuery({
    queryKey: ['lockedUsers'],
    queryFn: fetchLockedUsers,
    staleTime: 0, // Always fetch fresh data (security)
    gcTime: 0, // Don't cache security data
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds (optional)
    ...options,
  });
};

/**
 * Hook to unlock user account (owner only)
 */
export const useUnlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unlockUser,
    onSuccess: () => {
      // Invalidate locked users query to refresh the list
      queryClient.invalidateQueries(['lockedUsers']);
    },
  });
};

