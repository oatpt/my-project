// File: src/components/ProductSection.tsx
import { Product } from '../types.ts';
import ProductCard from './ProductCard';
import './ProductSection.css';

interface ProductSectionProps {
  products: Product[];
  loading: boolean;
}

const ProductSection = ({ products, loading }: ProductSectionProps) => {
  return (
    <section id="products" className="section products">
      <h2 className="section-title">ผลิตภัณฑ์และ<span>บริการ</span></h2>
      
      {loading ? (
        <div className="loading">กำลังโหลด...</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          <div>
            
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductSection;