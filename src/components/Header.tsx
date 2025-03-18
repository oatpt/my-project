// File: src/components/Header.tsx
import {  useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <header className="header">
      <nav className="nav">
        <div className="logo">
          <a href="/" onClick={(e) => handleNavClick(e, '/')}>
            <img src="pic/logo-PSSS.jpg" alt="logo" />
          </a>
        </div>
        <ul className="nav-links">
          <li>
            <a href="/" onClick={(e) => handleNavClick(e, '/')}>
              หน้าหลัก
            </a>
          </li>
          <li>
            <a href="/quotation" onClick={(e) => handleNavClick(e, '/quotation')}>
              ใบเสนอราคา
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;