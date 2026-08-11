// File: src/components/ProductDetail.tsx
import { useParams, Link } from 'react-router-dom';
import { Product } from '../types';
import './ProductDetail.css';

interface ProductDetailProps {
    products: Product[];
    loading: boolean;
}

/** ดึงนามสกุลไฟล์มาแสดงเป็นป้ายบนปุ่ม เช่น "/files/a/quotation.pdf" -> "PDF" */
const fileExtension = (path: string): string => {
    const name = path.split('/').pop() ?? '';
    const dot = name.lastIndexOf('.');
    return dot > 0 ? name.slice(dot + 1).toUpperCase() : 'FILE';
};

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

            {product.attachments && product.attachments.length > 0 && (
                <div className="attachments">
                    <h3 className="attachments-title">เอกสารดาวน์โหลด</h3>
                    <ul className="attachment-list">
                        {product.attachments.map((attachment) => (
                            <li key={attachment.file}>
                                <a
                                    className="attachment-link"
                                    href={attachment.file}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <span className="attachment-ext">{fileExtension(attachment.file)}</span>
                                    <span className="attachment-name">{attachment.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <p className="product-description">
                {product.description}
            </p>
            {product.id === '1537eafd-1202-413c-bf11-943710948aa2' ? (<div>
                <img src={'/pic/product-brief-wd-purple-pro-sata-hdd_Page_1.jpg'} className='imageDetail'/>
                <img src={'/pic/product-brief-wd-purple-pro-sata-hdd_Page_2.jpg'} className='imageDetail'/>
            </div>) :
                (
                    <div>
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
                    </div>
                )
            }
            <Link to="/" className="back-link">
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </Link>
        </section>
    );
};

export default ProductDetail;