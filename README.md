# AI News Hub

เว็บรวมข่าว AI และเทคโนโลยี อัปเดตรายสัปดาห์ ฉบับภาษาไทย
ออกแบบให้ host บน **GitHub Pages** ฟรี ไม่ต้องใช้ build tool พิเศษ

> **Live site:** _(เพิ่มลิงก์หลัง deploy บน GitHub Pages)_

---

## โครงสร้างโปรเจกต์

```
.
├── index.html              # หน้าแรก รวมรายการฉบับทั้งหมด
├── issues/                 # ฉบับรายสัปดาห์ที่ผ่าน build แล้ว (มี top-bar กลับหน้าแรก)
│   ├── issue-01.html
│   └── issue-02.html
├── data/
│   └── issues.json         # manifest — สร้างจาก build.py
├── assets/
│   ├── style.css           # ดีไซน์หน้าแรก (TechBrief style)
│   └── app.js              # search + filter + render
├── AI-news_1.html          # ไฟล์ source ฉบับที่ 1 (drop ไว้ที่ root)
├── AI-news_2.html          # ไฟล์ source ฉบับที่ 2
├── build.py                # script รวบรวม source → issues/ + manifest
├── rss.xml                 # RSS feed (สร้างอัตโนมัติ)
├── .nojekyll               # บอก GitHub Pages ห้าม Jekyll process
└── README.md               # ไฟล์นี้
```

---

## เพิ่มฉบับใหม่ (ทำทุกสัปดาห์)

1. **วางไฟล์ HTML ฉบับใหม่** ที่ root ของโปรเจกต์ ตั้งชื่อเป็น `AI-news_<N>.html`
   ตัวอย่าง: `AI-news_3.html`, `AI-news_4.html` ฯลฯ
   - ไฟล์ต้องใช้โครงสร้าง TechBrief เหมือนเดิม (มี `<title>`, `.site-meta strong`, `.hero-primary` ฯลฯ)
   - `build.py` จะ extract metadata อัตโนมัติจาก:
     - `<title>` → ชื่อเรื่อง
     - `.site-meta strong` → วันที่ภาษาไทย (เช่น `22 เมษายน 2569`)
     - `สัปดาห์ที่ N` → เลขสัปดาห์
     - `.hero-primary .hl` + `.dk` → headline + excerpt
     - `class="hl"` ทั้งหมด → list หัวข่าวสำหรับ search

2. **รัน build script**
   ```bash
   python build.py
   ```
   จะได้ผลลัพธ์เป็น:
   - `issues/issue-NN.html` — copy ของไฟล์ source พร้อม inject top-bar
   - `data/issues.json` — manifest ที่ index.html ใช้
   - `rss.xml` — RSS feed ที่อัปเดตแล้ว

3. **เปิดทดสอบในเครื่อง** (browser block `fetch()` กับ `file://` ต้องเปิดผ่าน server)
   ```bash
   python -m http.server 8000
   ```
   เปิด <http://localhost:8000>

4. **Push ขึ้น GitHub**
   ```bash
   git add .
   git commit -m "Add issue NN: <ชื่อเรื่อง>"
   git push
   ```
   GitHub Pages จะ deploy อัตโนมัติภายในไม่กี่นาที

---

## วิธี deploy บน GitHub Pages (ครั้งแรก)

1. สร้าง repo ใหม่บน GitHub (เช่น `ai-news-hub`)
2. Push โค้ดทั้งหมดในโฟลเดอร์นี้ขึ้น repo:
   ```bash
   cd C:/ProjectX/X.18
   git init
   git add .
   git commit -m "Initial commit: AI News Hub"
   git branch -M main
   git remote add origin https://github.com/<username>/<repo>.git
   git push -u origin main
   ```
3. บน GitHub: **Settings → Pages → Source: Deploy from branch → Branch: main / (root) → Save**
4. รอ ~1 นาที เว็บจะ live ที่ `https://<username>.github.io/<repo>/`

---

## Features ของเว็บ

| Feature | รายละเอียด |
|---------|------------|
| 🎯 หน้าแรกแบบนิตยสาร | ใช้ดีไซน์ TechBrief เดียวกัน (Sarabun + Playfair Display) |
| ⭐ Hero ฉบับล่าสุด | ดึงจากฉบับที่มีวันที่ใหม่สุดอัตโนมัติ |
| 🔍 Search box | ค้นหาในชื่อฉบับ, headline และ keywords |
| 📅 Filter ตามเดือน | dropdown รวบรวมเดือนที่มีฉบับเผยแพร่ |
| 📡 RSS feed | `rss.xml` สร้างอัตโนมัติทุกครั้งที่ build |
| 🔙 Top-bar กลับหน้าแรก | inject ลงในทุกไฟล์ฉบับโดยไม่แตะ source |
| 📱 Responsive | ใช้งานบนมือถือได้ |
| 🎬 Animation | fade-in เบา ๆ เมื่อ scroll |

---

## ปรับแต่ง / Tips

- **เปลี่ยนสี theme** → แก้ที่ `assets/style.css` ตัวแปร `--accent` และ `--accent2`
- **เปลี่ยนชื่อเว็บ** → แก้ใน `index.html` (`<div class="site-name">`) และ `<title>`
- **ลบฉบับ** → ลบไฟล์ `AI-news_N.html` ที่ root แล้วรัน `python build.py` ใหม่ (script จะ regenerate ทั้งหมด — แต่ไฟล์เก่าใน `issues/` ต้องลบเอง)
- **เก็บไฟล์ source แยก** → ย้าย `AI-news_*.html` ไปไว้ใน folder `source/` แล้วแก้ `build.py` ที่บรรทัด `for entry in ROOT.iterdir()` ให้ scan folder นั้นแทน

---

## ข้อกำหนด

- **Python 3.8+** สำหรับรัน `build.py` (ใช้แค่ standard library ไม่ต้อง pip install)
- **Browser ที่รองรับ ES6** (Chrome, Firefox, Safari, Edge เวอร์ชันใหม่ทั้งหมด)

---

สร้างโดย **คุณวัช** ร่วมกับ Claude (Peter)
