const hasSupabase = window.BJKP_SUPABASE_URL && window.BJKP_SUPABASE_ANON_KEY && window.supabase;
const sb = hasSupabase ? window.supabase.createClient(window.BJKP_SUPABASE_URL, window.BJKP_SUPABASE_ANON_KEY) : null;

const demoNews=[
 {date:"08 मई 2026",title:"BJKP की जिला स्तरीय बैठक सम्पन्न"},
 {date:"05 मई 2026",title:"युवा सम्मेलन में भारी जनभागीदारी"},
 {date:"01 मई 2026",title:"स्वच्छ भारत अभियान में BJKP की भागीदारी"}
];
const demoAnnouncements=[
 {title:"राष्ट्रीय कार्यकारिणी की महत्वपूर्ण बैठक"},
 {title:"सदस्यता अभियान की शुरुआत"},
 {title:"युवा नेतृत्व प्रशिक्षण शिविर"}
];

function renderNews(rows){document.getElementById("newsList").innerHTML=(rows.length?rows:demoNews).map(x=>`<div class="news-item"><div class="date">${x.date||""}</div><div>${x.title}</div></div>`).join("")}
function renderAnnouncements(rows){document.getElementById("announcementList").innerHTML=(rows.length?rows:demoAnnouncements).map(x=>`<div class="notice">📣 ${x.title}</div>`).join("")}
async function loadContent(){
 if(!sb){renderNews([]);renderAnnouncements([]);return}
 const [{data:n},{data:a},{data:g},{data:v},{data:o}]=await Promise.all([
  sb.from("news").select("*").order("published_at",{ascending:false}).limit(6),
  sb.from("announcements").select("*").order("created_at",{ascending:false}).limit(6),
  sb.from("gallery").select("*").order("created_at",{ascending:false}).limit(12),
  sb.from("videos").select("*").order("created_at",{ascending:false}).limit(6),
  sb.from("officers").select("*").order("created_at",{ascending:true}).limit(12)
 ]);
 renderNews(n||[]);renderAnnouncements(a||[]);
 if(g?.length) document.getElementById("galleryList").innerHTML=g.map(x=>`<img src="${x.image_url}" alt="${x.title||'BJKP'}">`).join("");
 if(v?.length) document.getElementById("videoList").innerHTML=v.map(x=>`<div class="video-card"><iframe src="${x.video_url}" title="${x.title||'BJKP video'}" allowfullscreen></iframe><b>${x.title||""}</b></div>`).join("");
 if(o?.length) document.getElementById("officerList").innerHTML=o.map(x=>`<article class="mini"><b>${x.role||""}</b><span>${x.name||""}</span></article>`).join("");
}
document.getElementById("menu").onclick=()=>document.getElementById("links").classList.toggle("open");
document.querySelectorAll(".links a").forEach(a=>a.onclick=()=>document.getElementById("links").classList.remove("open"));
document.getElementById("joinForm").addEventListener("submit",async e=>{
 e.preventDefault();const f=new FormData(e.target);const msg=document.getElementById("joinMsg");
 if(!sb){msg.textContent="Demo mode: Supabase जोड़ने के बाद आवेदन database में सेव होगा.";return}
 const {error}=await sb.from("memberships").insert([{name:f.get("name"),mobile:f.get("mobile"),district:f.get("district"),message:f.get("message")}]);
 msg.textContent=error?"आवेदन नहीं भेजा गया: "+error.message:"धन्यवाद! आपका आवेदन भेज दिया गया है।";if(!error)e.target.reset();
});
loadContent();