// File: src/App.tsx
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import ProductSection from './components/ProductSection.tsx';
import Footer from './components/Footer';
import './App.css';
import { Product } from './types.ts';
import productsData from './data/products.json';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ProductDetail from './components/ProductDetail.tsx';
import Quotation from './components/Quotation.tsx';

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // In a real application, you would fetch from an API
    // For now, we'll use the sample data
    const fetchData = async () => {
      try {
        productsData.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(productsData);
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
          path="/quotation" 
          element={<Quotation products={products} loading={loading}  />} 
        />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;