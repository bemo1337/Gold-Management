// Product type definitions
export interface DiamondStone {
  id: string;
  type: string;
  color: string;
  count: number;
  caratPrice: number;
  currency: 'USD' | 'SYP';
  totalPrice: number;
  weight: number;
}

export interface Product {
  id: string;
  name: string;
  material: 'gold' | 'silver' | 'diamond';
  diamonds?: DiamondStone[];
  productType: string;
  sizes?: string[];
  setComponents?: string[];
  description: string;
  carat: string;
  weight: number;
  craftingFee?: number;
  pricePerGram: number;
  currency: 'USD' | 'SYP';
  totalPrice: number;
  images: string[];
  isPinned: boolean;
  createdAt: Date;
}

export interface DiamondFormData {
  stones: DiamondStone[];
  totalStoneWeight: number;
  totalStonePrice: number;
} 
