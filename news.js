async function loadHomeNews(){
  const grid = document.getElementById("newsGrid");
  if(!grid) return;

  try{
    if(typeof supabase === "undefined" ||
       typeof SUPABASE_URL === "undefined" ||
       typeof SUPABASE_ANON_KEY === "undefined"){
      grid.innerHTML = '<div class="news-empty">समाचार सेवा उपलब्ध नहीं है।</div>';
      return;
    }

    const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const {data,error} = await client
      .from("news")
      .select("id,title,excerpt,content,image_url,published_at,created_at,status")
      .eq("status","published")
      .order("published_at",{ascending:false,nullsLast:true})
      .order("created_at",{ascending:false})
      .limit(6);

    if(error) throw error;

    if(!data || data.length === 0){
      grid.innerHTML = '<div class="news-empty">अभी कोई प्रकाशित समाचार उपलब्ध नहीं है।</div>';
      return;
    }

    grid.innerHTML = data.map(item=>{
      const title = escapeNews(item.title || "समाचार");
      const text = escapeNews(item.excerpt || item.content || "");
      const date = formatNewsDate(item.published_at || item.created_at);
      const image = item.image_url
        ? `<img src="${escapeAttr(item.image_url)}" alt="${escapeAttr(item.title || "समाचार")}" onerror="this.style.display='none'">`
        : "";

      return `
        <article class="news-card">
          ${image}
          <div class="news-card-body">
            <div class="news-date">${date}</div>
            <h3>${title}</h3>
            <p>${text}</p>
          </div>
        </article>
      `;
    }).join("");

  }catch(err){
    console.error("News load error:",err);
    grid.innerHTML = '<div class="news-empty">समाचार लोड नहीं हो सके। कृपया बाद में पुनः प्रयास करें।</div>';
  }
}

function escapeNews(value){
  return String(value ?? "").replace(/[&<>"]/g,m=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;"
  }[m]));
}

function escapeAttr(value){
  return escapeNews(value).replace(/'/g,"&#39;");
}

function formatNewsDate(value){
  if(!value) return "";
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("hi-IN",{
    day:"2-digit",
    month:"long",
    year:"numeric"
  });
}

document.addEventListener("DOMContentLoaded",loadHomeNews);