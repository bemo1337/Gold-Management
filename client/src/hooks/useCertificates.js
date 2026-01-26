/**
 * React Query hooks for Certificates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch, publicFetch, optionalAuthFetch } from '../utils/auth';

/**
 * Fetch customer certificates
 */
const fetchCustomerCertificates = async () => {
  const response = await authenticatedFetch('/api/certificates/customer/my-certificates');
  
  if (!response.ok) {
    throw new Error('Failed to fetch certificates');
  }
  
  return response.json();
};

/**
 * Fetch owner certificates
 */
const fetchOwnerCertificates = async () => {
  const response = await authenticatedFetch('/api/certificates');
  
  if (!response.ok) {
    throw new Error('Failed to fetch certificates');
  }
  
  return response.json();
};

/**
 * Fetch single certificate by ID (public endpoint)
 */
const fetchCertificate = async (id) => {
  const response = await publicFetch(`/api/certificates/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch certificate');
  }
  
  return response.json();
};

/**
 * Verify certificate
 */
const verifyCertificate = async (id) => {
  const response = await publicFetch(`/api/certificates/verify/${id}`);
  
  if (!response.ok) {
    throw new Error('Failed to verify certificate');
  }
  
  return response.json();
};

/**
 * Transfer certificate
 */
const transferCertificate = async ({ id, email }) => {
  const response = await authenticatedFetch(`/api/certificates/${id}/transfer`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to transfer certificate');
  }
  
  return response.json();
};

/**
 * Hook to fetch customer certificates with caching
 * @param {object} options - React Query options
 */
export const useCustomerCertificates = (options = {}) => {
  return useQuery({
    queryKey: ['certificates', 'customer'],
    queryFn: fetchCustomerCertificates,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch owner certificates with caching
 * @param {object} options - React Query options
 */
export const useOwnerCertificates = (options = {}) => {
  return useQuery({
    queryKey: ['certificates', 'owner'],
    queryFn: fetchOwnerCertificates,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

/**
 * Hook to fetch single certificate with caching
 * @param {string} id - Certificate ID
 * @param {object} options - React Query options
 */
export const useCertificate = (id, options = {}) => {
  return useQuery({
    queryKey: ['certificate', id],
    queryFn: () => fetchCertificate(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to verify certificate
 */
export const useVerifyCertificate = () => {
  return useMutation({
    mutationFn: verifyCertificate,
  });
};

/**
 * Hook to transfer certificate
 */
export const useTransferCertificate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: transferCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
};

