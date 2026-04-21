// Default seed data — used on first read if KV is empty
export const DEFAULT_DATA = {
  hero: {
    image: "rowing_tea_party.jpg",
    title: "Rowing Tea Party",
    year: 2023,
    num: "020"
  },
  bio: {
    quote: "Painting is the way I keep <em>the small things</em> from disappearing.",
    paragraphs: [
      "Born in China and now living in West Chester, Pennsylvania, <strong>Yingjie&nbsp;Li</strong> is a self-taught painter whose work draws from folklore, childhood memory, and the textures of everyday family life.",
      "A scientist by training — she holds a Ph.D. in Biochemistry from Rutgers, the State University of New Jersey — Yingjie has drawn and painted since childhood. Her practice moves fluidly between acrylic, oil, pen and ink, often layering narrative imagery with decorative detail and quiet, dreamlike palettes.",
      "She lives with her husband and two children, and is a member of the Chester County Art Association, where she has received awards and honors for her work."
    ]
  },
  exhibitions: [
    { name: "Chester County Art Association", location: "West Chester Galleries, Pennsylvania" },
    { name: "Exton Square Studio Gallery", location: "Exton, Pennsylvania" },
    { name: "Visual Expansion Gallery", location: "Pennsylvania", url: "https://visualexpansiongallery.com/yingjie-li/" },
    { name: "Barbara Moore Fine Art Gallery", location: "Pennsylvania" }
  ],
  contact: {
    email: "yingjie.ly@gmail.com",
    etsy: "https://www.etsy.com/shop/CuriousJCArt",
    gallery: "https://www.visualexpansiongallery.com/yingjie-li"
  },
  works: [
    { num: "001", file: "Art1_2013.jpg",           title: "Moon Dancer",              year: 2013, w: 1763, h: 2267 },
    { num: "002", file: "Art2_2014.jpg",           title: "Clock",                    year: 2014, w: 1275, h: 1568 },
    { num: "003", file: "Art3_2014.jpg",           title: "Pig in the Forest",        year: 2014, w: 2465, h: 1622 },
    { num: "004", file: "Art4_2015.jpg",           title: "Once Upon a Time",         year: 2015, w: 2183, h: 1832 },
    { num: "005", file: "Art5_2016.jpg",           title: "Girl on Pig",              year: 2016, w: 1773, h: 2255 },
    { num: "006", file: "Art6_2016.jpg",           title: "Relief",                   year: 2016, w: 1773, h: 2255 },
    { num: "007", file: "Art7_2016.jpg",           title: "Siren",                    year: 2016, w: 1773, h: 2255 },
    { num: "008", file: "Art8_2016.jpg",           title: "Train Is Coming to Town",  year: 2016, w: 2235, h: 1789 },
    { num: "009", file: "Art9_2017.jpg",           title: "Magic Forest",             year: 2017, w: 1826, h: 2190 },
    { num: "010", file: "Art10_2018.jpg",          title: "Hide and Seek",            year: 2018, w: 2705, h: 3305 },
    { num: "011", file: "Art11_2018.jpg",          title: "Tea Party",                year: 2018, w: 1985, h: 1655 },
    { num: "012", file: "Art12_2018.jpg",          title: "T Is for Terrific Things", year: 2018, w: 1939, h: 2061 },
    { num: "013", file: "a_friendly_recital.jpg",  title: "A Friendly Recital",       year: 2023, w: 1500, h: 1500, gallery: true },
    { num: "014", file: "bubble_buddies.jpg",      title: "Bubble Buddies",           year: 2023, w: 1500, h: 1500, gallery: true },
    { num: "015", file: "bunny_in_red.jpg",        title: "Bunny in Red",             year: 2023, w: 1500, h: 2091, gallery: true },
    { num: "016", file: "candy_wagon.jpg",         title: "Candy Wagon",              year: 2023, w: 1500, h: 1218, gallery: true },
    { num: "017", file: "forest_magic.jpg",        title: "Forest Magic",             year: 2023, w: 1500, h: 1192, gallery: true },
    { num: "018", file: "music_in_the_forest.jpg", title: "Music in the Forest",      year: 2023, w: 1500, h: 1889, gallery: true },
    { num: "019", file: "pig_ride.jpg",            title: "Pig Ride",                 year: 2023, w: 1493, h: 2031, gallery: true },
    { num: "020", file: "rowing_tea_party.jpg",    title: "Rowing Tea Party",         year: 2023, w: 1438, h: 1841, gallery: true },
    { num: "021", file: "rowing_with_a_friend.jpg",title: "Rowing With a Friend",     year: 2023, w: 1500, h: 1920, gallery: true },
    { num: "022", file: "sweet_dreams.jpg",        title: "Sweet Dreams",             year: 2023, w: 1500, h: 2093, gallery: true },
    { num: "023", file: "here_have_a_sip.jpg",     title: "Here, Have a Sip",         year: 2024, w: 1968, h: 1545, gallery: true }
  ]
};

const KEY = "site:data:v1";

export async function readData(env) {
  if (!env.YL_DATA) return DEFAULT_DATA;
  const raw = await env.YL_DATA.get(KEY);
  if (!raw) return DEFAULT_DATA;
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DATA;
  }
}

export async function writeData(env, data) {
  if (!env.YL_DATA) throw new Error("KV not bound");
  await env.YL_DATA.put(KEY, JSON.stringify(data));
}

export function nextWorkNum(works) {
  let max = 0;
  for (const w of works) {
    const n = parseInt(w.num, 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return String(max + 1).padStart(3, "0");
}
