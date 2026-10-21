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

// One generated photo per brand in public/products, shared by every product of that brand.
const BRAND_IMAGES: Record<string, string> = {
  LG: '/products/lg-c3-oled-65.jpg',
  Samsung: '/products/samsung-s90c-65.jpg',
  Sony: '/products/sony-x80l-55.jpg',
  TCL: '/products/tcl-6series-75.jpg',
  Hisense: '/products/hisense-a6h-43.jpg',
  Vizio: '/products/vizio-pqx-65.jpg',
};

export function productImage(p: Product): string {
  return BRAND_IMAGES[p.brand] ?? BRAND_IMAGES.LG;
}
