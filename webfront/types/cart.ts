export type CartItem = {
  productId: string;
  variantId: string;
  name: string;
  image?: string;
  description?: string;
  size?: number;
  price: number;
  quantity: number;
};
