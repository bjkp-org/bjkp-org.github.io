async function loadHomeNews(){
  const grid=document.getElementById("newsGrid");
  if(!grid)return;
  try{
    if(typeof supabase==="undefined"||typeof SUPABASE_URL==="undefined"||typeof SUPABASE_ANON_KEY==="undefined"){
      grid.innerHTML='<div class="news-empty">समाचार सेवा उपलब्ध नहीं है।</div>';return;
    }
    const client=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
    const {data,error}=await client.from("news").select("id,title,excerpt,content,image_url,published_at,created_at,status").eq("status","published").order("published_at",{ascending:false,nullsLast:true}).order("created_at",{ascending:false}).limit(6);
    if(error)throw error;
    if(!data||data.length===0){grid.innerHTML='<div class="news-empty">अभी कोई प्रकाशित समाचार उपलब्ध नहीं है।</div>';return;}
    grid.innerHTML=data.map((item,index)=>{
      const title=escapeNews(item.title||"समाचार");
      const text=escapeNews(item.excerpt||item.content||"समाचार का विवरण उपलब्ध नहीं है।");
      const date=formatNewsDate(item.published_at||item.created_at);
      const rawText=String(item.content||item.excerpt||"");
      const image=item.image_url
        ? `<div class="news-media"><span class="news-badge">BJKP NEWS</span><img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.title||"समाचार")}" onerror="this.parentElement.innerHTML='<div class=\"news-placeholder\"><div>BJKP NEWS</div></div>'"></div>`
        : `<div class="news-media"><span class="news-badge">BJKP NEWS</span><div class="news-placeholder"><img src="images/logo.png" alt="BJKP"><div>भारतीय जन कल्याण पार्टी</div></div></div>`;
      return `<article class="news-card">${image}<div class="news-card-body"><div class="news-date">${date}</div><h3>${title}</h3><p>${text}</p><button class="news-read" type="button" data-news-index="${index}">पूरी खबर पढ़ें →</button></div></article>`;
    }).join("");
    window.BJKP_NEWS=data;
    document.querySelectorAll(".news-read").forEach(btn=>btn.addEventListener("click",()=>openNewsModal(Number(btn.dataset.newsIndex))));
  }catch(err){
    console.error("News load error:",err);
    grid.innerHTML='<div class="news-empty">समाचार लोड नहीं हो सके। कृपया बाद में पुनः प्रयास करें।</div>';
  }
}

function openNewsModal(index){
  const item=window.BJKP_NEWS?.[index];
  if(!item)return;
  const modal=document.getElementById("newsModal");
  const media=document.getElementById("newsModalMedia");
  document.getElementById("newsModalTitle").textContent=item.title||"समाचार";
  document.getElementById("newsModalDate").textContent=formatNewsDate(item.published_at||item.created_at);
  document.getElementById("newsModalText").textContent=item.content||item.excerpt||"";
  media.innerHTML=item.image_url?`<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.title||"समाचार")}" onerror="this.style.display='none'">`:"";
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
}

function closeNewsModal(){
  const modal=document.getElementById("newsModal");
  if(!modal)return;
  modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.style.overflow="";
}

function escapeNews(value){return String(value??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}
function escapeAttr(value){return escapeNews(value).replace(/'/g,"&#39;");}
function formatNewsDate(value){if(!value)return "";const d=new Date(value);if(Number.isNaN(d.getTime()))return "";return d.toLocaleDateString("hi-IN",{day:"2-digit",month:"long",year:"numeric"});}

document.addEventListener("DOMContentLoaded",()=>{
  loadHomeNews();
  document.getElementById("newsModalClose")?.addEventListener("click",closeNewsModal);
  document.getElementById("newsModal")?.addEventListener("click",e=>{if(e.target.id==="newsModal")closeNewsModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeNewsModal();});
});
