/**
 * React Query hooks for Products
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch, optionalAuthFetch } from '../utils/auth';

/**
 * Fetch products with pagination and filters
 * Uses optionalAuthFetch to send token if available (optionalAuth on server)
 */
const fetchProducts = async (params = {}) => {
  const { page = 1, limit = 10, search = '', materials = '', minPrice = '', maxPrice = '' } = params;
  
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) queryParams.append('search', search);
  if (materials) queryParams.append('materials', materials);
  if (minPrice) queryParams.append('minPrice', minPrice);
  if (maxPrice) queryParams.append('maxPrice', maxPrice);
  
  const url = `/api/products?${queryParams.toString()}`;
  const response = await optionalAuthFetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return response.json();
};

/**
 * Fetch single product by ID
 * Uses optionalAuthFetch to send token if available (optionalAuth on server)
 */
const fetchProduct = async (id) => {
  const response = await optionalAuthFetch(`/api/products/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch product');
  }
  
  return response.json();
};

/**
 * Fetch user's favorite products
 */
const fetchFavoriteProducts = async () => {
  const response = await authenticatedFetch(`/api/products/favorites/user`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch favorite products');
  }
  
  return response.json();
};

/**
 * Fetch favorite products count
 */
const fetchFavoriteCount = async () => {
  const response = await authenticatedFetch(`/api/products/favorites/count`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch favorite count');
  }
  
  return response.json();
};

/**
 * Toggle like on a product
 */
const toggleLike = async (productId) => {
  const response = await authenticatedFetch(`/api/products/${productId}/like`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error('Failed to toggle like');
  }
  
  return response.json();
};

/**
 * Hook to fetch products with caching
 * @param {object} params - Query parameters (page, limit, search, materials, minPrice, maxPrice)
 * @param {object} options - React Query options
 */
// Detect mobile for cache optimization
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
};

export const useProducts = (params = {}, options = {}) => {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => fetchProducts(params),
    // Increased staleTime for mobile to reduce network requests
    staleTime: isMobile() ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 min mobile, 5 min desktop
    gcTime: isMobile() ? 15 * 60 * 1000 : 10 * 60 * 1000, // 15 min mobile, 10 min desktop
    refetchOnMount: false, // Don't refetch if data is fresh (better for mobile performance)
    refetchOnWindowFocus: false, // Don't refetch on window focus (saves battery)
    // Use background refetching
    refetchInterval: false,
    ...options,
  });
};

/**
 * Hook to fetch single product with caching
 * @param {string} id - Product ID
 * @param {object} options - React Query options
 */
export const useProduct = (id, options = {}) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id, // Only fetch if id is provided
    // Increased staleTime for mobile
    staleTime: isMobile() ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 min mobile, 5 min desktop
    gcTime: isMobile() ? 15 * 60 * 1000 : 10 * 60 * 1000, // 15 min mobile, 10 min desktop
    refetchOnMount: false, // Don't refetch if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: false,
    ...options,
  });
};

/**
 * Hook to fetch user's favorite products with caching
 * @param {object} options - React Query options
 */
export const useFavoriteProducts = (options = {}) => {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavoriteProducts,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch favorite products count with caching
 * @param {object} options - React Query options
 */
export const useFavoriteCount = (options = {}) => {
  return useQuery({
    queryKey: ['favorites', 'count'],
    queryFn: fetchFavoriteCount,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to toggle like on a product
 */
export const useToggleLike = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleLike,
    onSuccess: (data, productId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'count'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

/**
 * Delete product (owner only)
 */
const deleteProduct = async (id) => {
  const response = await authenticatedFetch(`/api/products/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete product');
  }
  
  return response.json();
};

/**
 * Toggle pin product (owner only)
 */
const togglePinProduct = async (id) => {
  const response = await authenticatedFetch(`/api/products/${id}/pin`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to toggle pin');
  }
  
  return response.json();
};

/**
 * Toggle special product (owner only)
 */
const toggleSpecialProduct = async (id) => {
  const response = await authenticatedFetch(`/api/products/${id}/special`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to toggle special');
  }
  
  return response.json();
};

/**
 * Hook to delete product (owner only)
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (data, productId) => {
      // Remove the individual product from cache first
      queryClient.removeQueries({ queryKey: ['product', productId] });
      
      // Update all product queries to remove the deleted product optimistically
      queryClient.setQueriesData(
        { queryKey: ['products'], exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          if (oldData.products && Array.isArray(oldData.products)) {
            const filteredProducts = oldData.products.filter(p => {
              const pId = p._id || p.id;
              return pId !== productId;
            });
            return {
              ...oldData,
              products: filteredProducts,
              totalProducts: Math.max(0, (oldData.totalProducts || 0) - 1),
              hasMore: filteredProducts.length < (oldData.totalProducts || 0) - 1
            };
          }
          return oldData;
        }
      );
      
      // Invalidate all product-related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['product'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['statistics'], exact: false });
      
      // Force refetch active queries to ensure UI is updated
      queryClient.refetchQueries({ queryKey: ['products'], exact: false, type: 'active' });
    },
  });
};

/**
 * Hook to toggle pin product (owner only)
 */
export const useTogglePin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: togglePinProduct,
    onMutate: async (productId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
    },
    onSuccess: (data, productId) => {
      // Update the individual product immediately (optimistic update)
      queryClient.setQueriesData(
        { queryKey: ['product', productId], exact: true },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pinned: data.pinned
          };
        }
      );
      
      // Update all product lists immediately (optimistic update)
      queryClient.setQueriesData(
        { queryKey: ['products'], exact: false },
        (oldData) => {
          if (!oldData || !oldData.products || !Array.isArray(oldData.products)) return oldData;
          
          const updatedProducts = oldData.products.map(p => {
            const pId = p._id || p.id;
            if (pId === productId) {
              return { ...p, pinned: data.pinned };
            }
            return p;
          });
          
          // Update stats if available
          let updatedStats = oldData.stats;
          if (oldData.stats) {
            const currentProduct = oldData.products.find(p => (p._id || p.id) === productId);
            const wasPinned = currentProduct?.pinned || false;
            const nowPinned = data.pinned;
            
            if (wasPinned !== nowPinned) {
              updatedStats = {
                ...oldData.stats,
                pinnedCount: nowPinned 
                  ? (oldData.stats.pinnedCount || 0) + 1
                  : Math.max(0, (oldData.stats.pinnedCount || 0) - 1)
              };
            }
          }
          
          return {
            ...oldData,
            products: updatedProducts,
            stats: updatedStats
          };
        }
      );
      
      // Invalidate and refetch in background (won't show loading state due to optimistic update)
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['product', productId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['statistics'], exact: false });
    },
  });
};

/**
 * Hook to toggle special product (owner only)
 */
export const useToggleSpecial = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleSpecialProduct,
    onMutate: async (productId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['products'] });
      await queryClient.cancelQueries({ queryKey: ['product', productId] });
    },
    onSuccess: (data, productId) => {
      // Update the individual product immediately (optimistic update)
      queryClient.setQueriesData(
        { queryKey: ['product', productId], exact: true },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            special: data.special
          };
        }
      );
      
      // Update all product lists immediately (optimistic update)
      queryClient.setQueriesData(
        { queryKey: ['products'], exact: false },
        (oldData) => {
          if (!oldData || !oldData.products || !Array.isArray(oldData.products)) return oldData;
          
          const updatedProducts = oldData.products.map(p => {
            const pId = p._id || p.id;
            if (pId === productId) {
              return { ...p, special: data.special };
            }
            return p;
          });
          
          return {
            ...oldData,
            products: updatedProducts
          };
        }
      );
      
      // Invalidate and refetch in background (won't show loading state due to optimistic update)
      queryClient.invalidateQueries({ queryKey: ['products'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['product', productId], exact: true });
      queryClient.invalidateQueries({ queryKey: ['statistics'], exact: false });
    },
  });
};

