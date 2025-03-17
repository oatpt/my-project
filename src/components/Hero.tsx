// File: src/components/Hero.tsx
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero">
      <div className="hero-content">
        <div className="hero-text">
          <h1>บริษัท <span>เอคลาท์ คอร์เปอร์เรชั่น</span> จำกัด</h1>
          <p>
            ผู้นำด้านโซลูชั่นระบบมัลติมีเดียและเทคโนโลยีสารสนเทศครบวงจร มุ่งมั่นพัฒนาระบบที่ตอบโจทย์ธุรกิจสมัยใหม่
            ด้วยเทคโนโลยีล้ำสมัยที่ผสานการทำงานได้อย่างไร้รอยต่อ
          </p>
          <a href="#products" className="cta-button">ดูผลิตภัณฑ์และบริการ</a>
        </div>
        <div className="hero-image">
          <img src="/pic/bg.jpg" alt="Eclat Corporation Technology" />
        </div>
      </div>
    </section>
  );
};

export default Hero;