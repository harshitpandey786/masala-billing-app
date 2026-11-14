// Product photos from shindrajmasale.com's own store feed (thumbnails saved
// in public/products/). Matched to database products by normalized English
// name; anything without a match falls back to a plain initials tile.
const WEBSITE_PHOTOS = [
  ["Variety Combo", "/products/6367.jpeg"],
  ["Premium Combo", "/products/6364.jpeg"],
  ["Fish Combo", "/products/6362.png"],
  ["Malvani Combo", "/products/6359.jpeg"],
  ["Everyday Combo", "/products/6342.jpeg"],
  ["Shahi Panner Masala", "/products/6073.jpg"],
  ["Ghavan Pith", "/products/6067.jpg"],
  ["Amboli Pith", "/products/6061.jpg"],
  ["Basmati Modak Pith", "/products/6055.jpg"],
  ["Malvani Komdi Vade Pith", "/products/6049.jpg"],
  ["Hirvi Mirchi Kharda", "/products/6039.jpg"],
  ["Kolhapuri Lasun Thecha Chutney", "/products/5977.jpg"],
  ["Fish Fry Masala", "/products/5892.jpg"],
  ["Manchurian Pith", "/products/5886.jpg"],
  ["Thali Pith Bhajani", "/products/5880.jpg"],
  ["Udith Dangar Pith", "/products/5874.jpg"],
  ["Malvani Kulith Pith", "/products/5867.jpg"],
  ["Javas Chutney", "/products/5856.jpg"],
  ["Tilkut Chutney", "/products/5845.jpg"],
  ["Solapuri Shengdana Chutney", "/products/5836.jpg"],
  ["Lasun Khobra Chutney", "/products/5826.jpg"],
  ["Dhana – Jeera Powder", "/products/5809.jpg"],
  ["Induri Dhana Powder", "/products/5796.jpg"],
  ["Jeera Powder", "/products/5786.jpg"],
  ["Selam Halad Powder", "/products/5776.jpg"],
  ["Thikhat Lal Mirchi Powder", "/products/5765.jpg"],
  ["Kashmiri Mirchi Powder", "/products/5755.jpg"],
  ["Malvani Masala", "/products/5745.jpg"],
  ["Saoji Kala Masala", "/products/5735.jpg"],
  ["Nashik Kala Masala", "/products/5725.jpg"],
  ["Kolhapuri Masala", "/products/5715.jpg"],
  ["Fish Curry Masala", "/products/5705.jpg"],
  ["Malvani Chicken Masala", "/products/5688.jpg"],
  ["Agri Koli Masala", "/products/5677.jpg"],
  ["Malvani Mutton Masala", "/products/5665.jpg"],
  ["Brahmani Goda Masala", "/products/5652.jpg"],
  ["Satari Masala", "/products/5466.jpg"],
  ["Sunday Malvani Masala", "/products/5455.jpg"],
  ["Shindraj Super Malvani Masala", "/products/5444.jpg"],
  ["Mutton Masala", "/products/5428.jpg"],
  ["Kitchen King Masala", "/products/5416.jpg"],
  ["Usal Misal Masala", "/products/5400.jpg"],
  ["Sambar Masala", "/products/5388.jpg"],
  ["Chole Masala", "/products/5369.jpg"],
  ["Pav Bhaji Masala", "/products/5355.jpg"],
  ["Rajwadi Garam Masala", "/products/5342.jpg"],
  ["Royal Garam Masala", "/products/5332.jpg"],
  ["Gavati Tea Masala", "/products/5320.jpg"],
  ["Chicken Masala", "/products/5112.jpg"],
  ["Chicken Lollipop Masala", "/products/5101.jpg"],
  ["Chicken 65 Masala", "/products/5073.jpg"],
  ["Chat Masala", "/products/5060.jpg"],
];

const normalize = (name) =>
  (name || '')
    .toLowerCase()
    .replace(/&#?\w+;/g, ' ')
    .replace(/panner/g, 'paneer')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const BY_NAME = new Map(WEBSITE_PHOTOS.map(([name, src]) => [normalize(name), src]));

export function productImageFor(name) {
  const key = normalize(name);
  if (!key) return null;
  if (BY_NAME.has(key)) return BY_NAME.get(key);
  if (key.split(' ').length < 2) return null;
  for (const [known, src] of BY_NAME) {
    if (key.includes(known) || known.includes(key)) return src;
  }
  return null;
}
