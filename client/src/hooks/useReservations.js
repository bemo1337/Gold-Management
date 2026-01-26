/**
 * React Query hooks for Reservations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/auth';

/**
 * Fetch customer reservations
 */
const fetchCustomerReservations = async (filters = {}) => {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  
  const url = `/api/reservations/my-reservations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await authenticatedFetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch reservations');
  }
  
  return response.json();
};

/**
 * Fetch owner reservations with pagination and filters
 */
const fetchOwnerReservations = async (filters = {}) => {
  const { page = 1, limit = 10, status } = filters;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (status) queryParams.append('status', status);
  
  const url = `/api/reservations?${queryParams.toString()}`;
  const response = await authenticatedFetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch reservations');
  }
  
  return response.json();
};

/**
 * Fetch single reservation by ID
 */
const fetchReservation = async (id) => {
  const response = await authenticatedFetch(`/api/reservations/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch reservation');
  }
  
  return response.json();
};

/**
 * Create reservation
 */
const createReservation = async (reservationData) => {
  const response = await authenticatedFetch('/api/reservations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reservationData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create reservation');
  }
  
  return response.json();
};

/**
 * Cancel reservation
 */
const cancelReservation = async (id) => {
  const response = await authenticatedFetch(`/api/reservations/${id}/cancel`, {
    method: 'PATCH',
  });
  
  if (!response.ok) {
    throw new Error('Failed to cancel reservation');
  }
  
  return response.json();
};

/**
 * Approve reservation (owner only)
 */
const approveReservation = async (id) => {
  const response = await authenticatedFetch(`/api/reservations/${id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to approve reservation');
  }
  
  return response.json();
};

/**
 * Reject reservation (owner only)
 */
const rejectReservation = async (id) => {
  const response = await authenticatedFetch(`/api/reservations/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to reject reservation');
  }
  
  return response.json();
};

/**
 * Delete reservation
 */
const deleteReservation = async (id) => {
  const response = await authenticatedFetch(`/api/reservations/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete reservation');
  }
  
  return response.json();
};

/**
 * Hook to fetch customer reservations with caching
 * @param {object} filters - Filter parameters
 * @param {object} options - React Query options
 */
export const useCustomerReservations = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['reservations', 'customer', filters],
    queryFn: () => fetchCustomerReservations(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch owner reservations with caching
 * @param {object} filters - Filter parameters
 * @param {object} options - React Query options
 */
export const useOwnerReservations = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: ['reservations', 'owner', filters],
    queryFn: () => fetchOwnerReservations(filters),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
};

/**
 * Hook to fetch single reservation with caching
 * @param {string} id - Reservation ID
 * @param {object} options - React Query options
 */
export const useReservation = (id, options = {}) => {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => fetchReservation(id),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to create reservation
 */
export const useCreateReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

/**
 * Hook to cancel reservation
 */
export const useCancelReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

/**
 * Hook to approve reservation (owner only)
 */
export const useApproveReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: approveReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

/**
 * Hook to reject reservation (owner only)
 */
export const useRejectReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: rejectReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

/**
 * Hook to delete reservation
 */
export const useDeleteReservation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });
};

