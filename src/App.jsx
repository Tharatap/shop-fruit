import React, { useEffect, useState } from "react";
import "./App.css";

/**
 * Fruit shop (single-page)
 * - ข้อมูลผลไม้ 10 ชนิด (ราคาตลาดโดยประมาณ ปี 2025)
 * - เพิ่มลงตะกร้า, ปรับจำนวน, ลบ
 * - คำนวณยอดรวม, ภาษี 7%, ค่าส่ง (50 บาท, ฟรีเมื่อ >= 500)
 * - เก็บตะกร้าใน localStorage (persist)
 */

const PRODUCTS = [
  { id: 1, name: "ทุเรียน (หมอนทอง)", price: 130.0, image: "https://tse3.mm.bing.net/th/id/OIP.ERuXh45vdhNRvMmUK2c7vAHaE8?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" },
  { id: 2, name: "มังคุด", price: 60.0, image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQql3SrDOkT6AzRY3iLtP48DDyZDNeLyO-_uPVXEGI43V2gO5R8JZv6SGw3assccQLtm4h5L-5tXhyFcBpFmSKhEkbzcYjGhicgQ2xldQ&s=10" },
  { id: 3, name: "ลำไย", price: 48.0, image: "https://watermark.lovepik.com/photo/20211125/large/lovepik-longan-picture_501055319.jpg" },
  { id: 4, name: "มะม่วง (หลายพันธุ์)", price: 85.0, image: "https://farm.vayo.co.th/blog/wp-content/uploads/2022/07/%E0%B8%A1%E0%B8%B0%E0%B8%A1%E0%B9%88%E0%B8%A7%E0%B8%87%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B9%84%E0%B8%A1%E0%B9%89%E0%B8%AA%E0%B8%B5%E0%B8%97%E0%B8%AD%E0%B8%87-01-scaled.jpg" },
  { id: 5, name: "แก้วมังกร", price: 50.0, image: "https://orgboxthailand.com/wp-content/uploads/2020/09/Organic-Fruits_0016_whitedragonfruit.png" },
  { id: 6, name: "สับปะรด", price: 25.0, image: "https://png.pngtree.com/png-clipart/20250120/original/pngtree-pineapple-the-tropical-fruit-packed-with-health-benefits-png-image_19952095.png" },
  { id: 7, name: "ฝรั่ง (กิมจู)", price: 28.0, image: "https://th.bing.com/th/id/R.e8d968bffebdf53fb4095c24e4733714?rik=2JRDx6dluC1rlQ&pid=ImgRaw&r=0" },
  { id: 8, name: "มะละกอ", price: 20.0, image: "https://tse4.mm.bing.net/th/id/OIP.cQNOEJHis-AAuHnbHIpjnAHaEK?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" },
  { id: 9, name: "ส้ม / ส้มโอ", price: 22.0, image: "https://tse1.mm.bing.net/th/id/OIP.VIVYwIvxzpYI2FwJ4KQVBwHaFE?cb=12&rs=1&pid=ImgDetMain&o=7&rm=3" },
  { id: 10, name: "กล้วย (กล้วยหอม)", price: 30.0, image: "https://i-kinn.com/wp-content/uploads/2021/08/bananas-3700718_1920-768x513.jpg" },
];

const TAX_RATE = 0.07;
const SHIPPING_FLAT = 50;
const FREE_SHIPPING_OVER = 500;
const STORAGE_KEY = "fruit_shop_cart_v1";

function formatTHB(value) {
  // Format as THB currency (฿) with 2 decimals
  try {
    return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
  } catch {
    return `฿${Number(value).toFixed(2)}`;
  }
}

export default function App() {
  // cart: Map productId -> { product, quantity }
  const [cartMap, setCartMap] = useState(new Map());
  const [toast, setToast] = useState(null);

  // load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const arr = JSON.parse(raw); // [{ id, quantity }]
        const m = new Map();
        arr.forEach((it) => {
          const prod = PRODUCTS.find((p) => p.id === it.id);
          if (prod) m.set(it.id, { product: prod, quantity: it.quantity });
        });
        setCartMap(m);
      } catch (e) {
        console.warn("Failed to parse cart from storage", e);
      }
    }
  }, []);

  // persist cart when cartMap changes
  useEffect(() => {
    const arr = [];
    cartMap.forEach(({ product, quantity }) => arr.push({ id: product.id, quantity }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }, [cartMap]);

  function addToCart(productId, qty = 1) {
    const prod = PRODUCTS.find((p) => p.id === productId);
    if (!prod) return;
    setCartMap((prev) => {
      const next = new Map(prev);
      const entry = next.get(productId);
      if (entry) entry.quantity += qty;
      else next.set(productId, { product: prod, quantity: qty });
      return next;
    });
    flash(`${prod.name} ถูกเพิ่มลงตะกร้า`);
  }

  function changeQty(productId, qty) {
    setCartMap((prev) => {
      const next = new Map(prev);
      const entry = next.get(productId);
      if (!entry) return prev;
      entry.quantity = qty;
      if (entry.quantity <= 0) next.delete(productId);
      return next;
    });
  }

  function removeItem(productId) {
    setCartMap((prev) => {
      const next = new Map(prev);
      next.delete(productId);
      return next;
    });
  }

  function calculateTotals() {
    let itemsTotal = 0;
    cartMap.forEach(({ product, quantity }) => {
      itemsTotal += product.price * quantity;
    });
    const tax = itemsTotal * TAX_RATE;
    const shipping = itemsTotal === 0 || itemsTotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FLAT;
    const grandTotal = itemsTotal + tax + shipping;
    return { itemsTotal, tax, shipping, grandTotal };
  }

  function flash(message, timeout = 1400) {
    setToast(message);
    setTimeout(() => setToast(null), timeout);
  }

  const totals = calculateTotals();
  const totalCount = Array.from(cartMap.values()).reduce((s, e) => s + e.quantity, 0);

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand">
          <div className="logo">ผล</div>
          <div>
            <h1>ตลาดผลไม้ — ผลไม้เศรษฐกิจไทย</h1>
            <div className="muted">ราคาประมาณ (บาท/กก.) — ตัวอย่างเพื่อสาธิต</div>
          </div>
        </div>

        <div className="actions">
          <button
            className="cart-btn"
            onClick={() => {
              // scroll to cart
              const el = document.querySelector(".cart-sidebar");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ตะกร้า <span className="cart-count">{totalCount}</span>
          </button>
        </div>
      </header>

      <main className="layout">
        <section className="product-area">
          <div className="toolbar">
            <h2>รายการผลไม้</h2>
            <div className="muted">เลือกสินค้ากด "เพิ่มลงตะกร้า"</div>
          </div>

          <div className="grid-products">
            {PRODUCTS.map((p) => (
              <article className="card" key={p.id}>
                <div className="thumb-wrap">
                  <img src={p.image} alt={p.name} loading="lazy" />
                </div>
                <div className="card-body">
                  <h3 className="product-title">{p.name}</h3>
                  <div className="muted">
                    ราคา: <span className="price">{formatTHB(p.price)}</span> / กก.
                  </div>
                  <div className="card-row">
                    <div className="muted">น้ำหนักตัวอย่าง: 1 กก.</div>
                    <button className="btn add-btn" onClick={() => addToCart(p.id, 1)}>
                      เพิ่มลงตะกร้า
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="cart-sidebar">
          <h2>ตะกร้าสินค้า</h2>

          <div className="cart-list">
            {cartMap.size === 0 ? (
              <div className="muted">ตะกร้าว่าง — เพิ่มสินค้าเพื่อเริ่มคำสั่งซื้อ</div>
            ) : (
              Array.from(cartMap.values()).map(({ product, quantity }) => (
                <div className="cart-item" key={product.id}>
                  <img src={product.image} alt={product.name} />
                  <div className="item-info">
                    <div className="item-title">{product.name}</div>
                    <div className="muted">
                      {formatTHB(product.price)} / กก. · จำนวน: <strong>x{quantity}</strong>
                    </div>
                    <div className="muted">ยอดย่อย: <strong>{formatTHB(product.price * quantity)}</strong></div>
                  </div>
                  <div className="item-controls">
                    <button className="qty-btn" onClick={() => changeQty(product.id, quantity - 1)}>-</button>
                    <button className="qty-btn" onClick={() => changeQty(product.id, quantity + 1)}>+</button>
                    <button className="remove-btn" onClick={() => removeItem(product.id)}>ลบ</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="summary">
            <div className="line">
              <span>ยอดรวมสินค้า</span>
              <span>{formatTHB(totals.itemsTotal)}</span>
            </div>
            <div className="line">
              <span>ค่าจัดส่ง</span>
              <span>{formatTHB(totals.shipping)}</span>
            </div>
            <div className="line">
              <span>ภาษี (7%)</span>
              <span>{formatTHB(totals.tax)}</span>
            </div>
            <div className="line grand">
              <span>ยอดรวมสุทธิ</span>
              <span>{formatTHB(totals.grandTotal)}</span>
            </div>

            <button
              className="checkout-btn"
              onClick={() => {
                if (totals.itemsTotal === 0) {
                  alert("ตะกร้าว่าง — กรุณาเพิ่มสินค้า");
                  return;
                }
                // ตัวอย่าง: ตอนนี้ยังไม่เชื่อมระบบจ่ายเงินจริง
                alert(`ไปหน้าชำระเงิน (ตัวอย่าง)\nยอดรวมสุทธิ: ${formatTHB(totals.grandTotal)}`);
              }}
            >
              ไปชำระเงิน
            </button>
          </div>
        </aside>
      </main>

      <footer className="site-footer">ข้อมูลตัวอย่างจัดทำเพื่อสาธิต — ปรับแต่งได้ตามต้องการ</footer>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
