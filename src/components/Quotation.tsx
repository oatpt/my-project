// File: src/components/Quotation.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Quotation.css';
import { Product } from '../types';

interface ProductQuotationProps {
    products: Product[];
    loading: boolean;
}
const Quotation = ({ products, loading }: ProductQuotationProps) => {
    const [formData, setFormData] = useState({
        product: 'MediaSphere',
        name: '',
        email: '',
        phone: '',
        message: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // In a real application, you would send this data to your backend
        console.log('Form submitted:', formData);

        // Show success message
        alert('ขอบคุณสำหรับการติดต่อ เราจะติดต่อกลับโดยเร็วที่สุด');

        // Reset form
        setFormData({
            product: 'MediaSphere',
            name: '',
            email: '',
            phone: '',
            message: ''
        });
    };

    return (
        <section className="section quotation-section">
            {loading ? (
                <div className="loading">กำลังโหลด...</div>
            ) : (
                <>
                    <h2 className="section-title">ใบเสนอ<span>ราคา</span></h2>

                    <div className="contact-form">
                        <h3>ติดต่อสอบถามราคาเพิ่มเติม</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="product">เลือกระบบที่สนใจ:</label>
                                <select
                                    id="product"
                                    name="product"
                                    value={formData.product}
                                    onChange={handleChange}
                                >
                                    {products.map(product => (
                                        <option key={product.id} value={product.name}>{product.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="name">ชื่อ:</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    placeholder="กรุณากรอกชื่อ"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">อีเมล:</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder="กรุณากรอกอีเมล"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="phone">เบอร์โทรศัพท์:</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    placeholder="กรุณากรอกเบอร์โทรศัพท์"
                                    value={formData.phone}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="message">รายละเอียดเพิ่มเติม:</label>
                                <textarea
                                    id="message"
                                    name="message"
                                    placeholder="ระบุรายละเอียดที่ต้องการสอบถาม"
                                    value={formData.message}
                                    onChange={handleChange}
                                ></textarea>
                            </div>

                            <button type="submit">ส่งข้อความ</button>
                        </form>
                    </div>
                </>
            )}

            <Link to="/" className="back-link">
                <i className="fas fa-arrow-left"></i> กลับหน้าหลัก
            </Link>
        </section>
    );
};

export default Quotation;