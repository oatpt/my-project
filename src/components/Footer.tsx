// File: src/components/Footer.tsx
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>© {new Date().getFullYear()} ECLAT CORPORATION. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;