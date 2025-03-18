// File: src/components/Footer.tsx
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© {new Date().getFullYear()} Protech Service and Solution Co., Ltd..</p>
        <p>ที่อยู่ 55/53 หมู่ที่ 3 ตำบลบางพูด อำเภอปากเกร็ด จ.นนทบุรี 11120</p>
      </div>
    </footer>
  );
};

export default Footer;