// File: src/components/ProductCard.tsx
import { useNavigate } from 'react-router-dom';
import { Product } from '../types';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const navigate = useNavigate();
  const handleProductClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(`/product-details/${product.id}`);
    // เพิ่มบรรทัดนี้เพื่อให้แน่ใจว่าหน้าจะเลื่อนไปที่ด้านบนเมื่อ navigate
    window.scrollTo(0, 0);
  };
  
  return (
    <div className="product-card">
      <div className="product-image">
        <img src={product.picture} alt={product.name} />
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        
        <a href={`/product-details/${product.id}`} className="product-link" onClick={handleProductClick}>
          รายละเอียดเพิ่มเติม
        </a>
      </div>
    </div>
  );
};

export default ProductCard;