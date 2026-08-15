let newsClient=null;

function getClient(){
  if(newsClient) return newsClient;
  if(typeof supabase==="undefined" || typeof SUPABASE_URL==="undefined" || typeof SUPABASE_ANON_KEY==="undefined"){
    throw new Error("config.js में Supabase configuration नहीं मिली।");
  }
  newsClient=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  return newsClient;
}

function esc(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}

function formatDate(v){
  if(!v) return "";
  return new Intl.DateTimeFormat("hi-IN",{day:"2-digit",month:"long",year:"numeric"}).format(new Date(v));
}

async function loadNews(){
  const grid=document.getElementById("newsGrid");
  const empty=document.getElementById("empty");
  const error=document.getElementById("error");
  try{
    const c=getClient();
    const {data,error:err}=await c.from("news")
      .select("id,title,excerpt,content,image_url,published_at,created_at,slug")
      .eq("status","published")
      .order("published_at",{ascending:false});
    if(err) throw err;
    if(!data || !data.length){empty.classList.remove("hidden");return;}
    grid.innerHTML=data.map(n=>`
      <article class="news-card">
        ${n.image_url?`<img class="news-image" src="${esc(n.image_url)}" alt="${esc(n.title)}" onerror="this.style.display='none'">`:""}
        <div class="news-body">
          <div class="news-date">${esc(formatDate(n.published_at||n.created_at))}</div>
          <h3 class="news-title">${esc(n.title)}</h3>
          <p class="news-excerpt">${esc(n.excerpt||"")}</p>
          <a class="read-btn" href="news-detail.html?id=${encodeURIComponent(n.id)}">पूरी खबर पढ़ें</a>
        </div>
      </article>`).join("");
  }catch(e){
    error.textContent="News load नहीं हो सकी: "+e.message;
    error.classList.remove("hidden");
  }
}
document.addEventListener("DOMContentLoaded",loadNews);
