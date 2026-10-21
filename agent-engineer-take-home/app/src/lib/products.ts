import productsJson from '../../data/products.json';

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface Product {
  id: string;
  brand: string;
  model: string;
  name: string;
  price: number;
  size: number;
  displayType: string;
  resolution: string;
  refreshRate: number;
  hdr: string[];
  smartPlatform: string;
  ports: { hdmi: number; usb: number };
  rating: number;
  reviewCount: number;
  inStock: boolean;
  deliveryDays: number;
  quantityAvailable: number;
  highlights: string[];
  reviews: Review[];
}

const products = productsJson as Product[];

export function getAllProducts(): Product[] {
  return products;
}

export function getProductById(id: string): Product | undefined {
  return products.find(p => p.id === id);
}
