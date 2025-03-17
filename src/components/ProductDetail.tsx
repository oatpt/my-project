// File: src/components/ProductDetail.tsx
import { useParams, Link } from 'react-router-dom';
import { Product } from '../types';
import './ProductDetail.css';

interface ProductDetailProps {
    products: Product[];
    loading: boolean;
}

const ProductDetail = ({ products, loading }: ProductDetailProps) => {
    const { productId } = useParams<{ productId: string }>();

    if (loading) {
        return (
            <section className="section product-detail">
                <div className="loading">กำลังโหลด...</div>
            </section>
        );
    }

    // Find the product with the matching ID
    const product = products.find(p => p.id === String(productId));

    // If product not found
    if (!product) {
        return (
            <section className="section product-detail">
                <h2 className="section-title">ไม่พบสินค้า</h2>
                <p>ขออภัย ไม่พบสินค้าที่คุณกำลังค้นหา</p>
                <Link to="/" className="back-link">
                    <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
                </Link>
            </section>
        );
    }

    return (
        <section className="section product-detail">



            <h2 className="section-title">
                <span>รายละเอียดผลิตภัณฑ์</span><br />
                {product.name}
            </h2>

            <p className="product-description">
                {product.description}
            </p>

            <div className="detail-section">
                {product.feature.map((feature, index) => (
                    <div key={index}>
                        <p className='name'>{feature.name}</p>
                        <ul>
                            {feature.list.map((feature, index2) => (
                                <li key={index2}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="additional-content">
                {product.technical.map((feature, index) => (
                    <div key={index}>
                        <p className='name'>{feature.name}</p>
                        <ul>
                            {feature.list.map((feature, index2) => (
                                <li key={index2}>{feature}</li>
                            ))}
                        </ul>
                    </div>
                ))}

            </div>

            <Link to="/" className="back-link">
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </Link>
        </section>
    );
};

export default ProductDetail;