/**
 * React Query hooks for User
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/auth';

/**
 * Fetch user profile
 */
const fetchUserProfile = async () => {
  const response = await authenticatedFetch('/api/users/profile');
  
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  
  return response.json();
};

/**
 * Update user profile
 */
const updateUserProfile = async (profileData) => {
  const response = await authenticatedFetch('/api/users/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update profile');
  }
  
  return response.json();
};

/**
 * Change password
 */
const changePassword = async (passwordData) => {
  const response = await authenticatedFetch('/api/users/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(passwordData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to change password');
  }
  
  return response.json();
};

/**
 * Delete account
 */
const deleteAccount = async () => {
  const response = await authenticatedFetch('/api/users/account', {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete account');
  }
  
  return response.json();
};

/**
 * Hook to fetch user profile with caching
 * @param {object} options - React Query options
 */
export const useUserProfile = (options = {}) => {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: fetchUserProfile,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to update user profile
 */
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

/**
 * Hook to change password
 */
export const useChangePassword = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
};

/**
 * Hook to delete account
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      // Clear all cache on account deletion
      queryClient.clear();
    },
  });
};

/**
 * Fetch all users (owner only)
 */
const fetchAllUsers = async () => {
  const response = await authenticatedFetch('/api/users');
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json();
};

/**
 * Search users (owner only)
 */
const searchUsers = async (query) => {
  const response = await authenticatedFetch(`/api/users/search?query=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error('Failed to search users');
  }
  
  return response.json();
};

/**
 * Hook to fetch all users with caching (owner only)
 * @param {object} options - React Query options
 */
export const useAllUsers = (options = {}) => {
  return useQuery({
    queryKey: ['users', 'all'],
    queryFn: fetchAllUsers,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to search users with caching (owner only)
 * @param {string} query - Search query
 * @param {object} options - React Query options
 */
export const useSearchUsers = (query, options = {}) => {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers(query),
    enabled: !!query && query.trim().length > 0,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

