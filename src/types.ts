// File: src/types.ts
interface Productlist{
  name: string;
  list: string[];
}

export interface Product {
  id: string;
  name: string;
  picture: string;
  description: string;
  feature: Productlist[];
  technical: Productlist[];
}