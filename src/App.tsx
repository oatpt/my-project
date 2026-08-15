// File: src/App.tsx
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductSection from './components/ProductSection.tsx';
import Footer from './components/Footer';
import './App.css';
import { Product } from './types.ts';
import productsData from './data/products.json';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProductDetail from './components/ProductDetail.tsx';
import PriceList from './components/PriceList.tsx';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // In a real application, you would fetch from an API
    // For now, we'll use the sample data
    const fetchData = async () => {
      try {
        // เรียงจากสำเนา ไม่ใช่ตัว productsData เอง — ที่อื่นยังต้องใช้ลำดับตามไฟล์อยู่
        // (หน้าราคาเรียงรายการที่ตั้งราคาเองตามลำดับใน products.json)
        setProducts([...productsData].sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      } catch (error) {
        console.error('Error fetching product data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Router>
      <Header />
      <Routes>
        <Route 
          path="/" 
          element={
            <>
              <Hero />
              <ProductSection products={products} loading={loading} />
            </>
          } 
        />
        <Route
          path="/product-details/:productId"
          element={<ProductDetail products={products} loading={loading} />}
        />
        <Route
          path="/pricing"
          element={<PriceList products={products} loading={loading} />}
        />
        {/* ลิงก์เก่าอย่าง /quotation ให้กลับหน้าหลักแทนหน้าว่าง */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;