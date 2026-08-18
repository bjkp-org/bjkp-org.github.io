(function(){
  let galleryClient = null;
  async function getGalleryClient(){
    if(galleryClient) return galleryClient;
    if(typeof supabase === 'undefined' || typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_ANON_KEY === 'undefined') return null;
    galleryClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return galleryClient;
  }

  function esc(v){return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function youtubeEmbed(url){
    try{
      const u=new URL(url);
      let id='';
      if(u.hostname.includes('youtu.be')) id=u.pathname.slice(1);
      if(u.hostname.includes('youtube.com')) id=u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}` : url;
    }catch(e){return url;}
  }

  function renderGallery(items){
    const grid=document.getElementById('galleryGrid');
    if(!grid) return;
    if(!items.length){
      grid.innerHTML='<div class="gallery-empty">अभी गैलरी में कोई सामग्री प्रकाशित नहीं है।</div>';
      return;
    }
    grid.innerHTML=items.map(item=>{
      const title=esc(item.title || 'BJKP कार्यक्रम');
      const desc=esc(item.description || '');
      if(item.media_type==='video'){
        const url=item.media_url||'';
        const embed=(/youtube\.com|youtu\.be|vimeo\.com/i.test(url)) ? youtubeEmbed(url) : url;
        const isFile=/\.(mp4|webm|ogg)(\?|$)/i.test(url);
        const media=isFile
          ? `<video controls preload="metadata" src="${esc(url)}"></video>`
          : `<iframe src="${esc(embed)}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        return `<article class="gallery-card"><div class="gallery-media">${media}<span class="gallery-type">▶ वीडियो</span></div><div class="gallery-body"><h3>${title}</h3>${desc?`<p>${desc}</p>`:''}</div></article>`;
      }
      return `<article class="gallery-card"><div class="gallery-media"><img src="${esc(item.media_url)}" alt="${title}" loading="lazy" onerror="this.closest('.gallery-media').classList.add('broken')"><span class="gallery-type">📷 फोटो</span></div><div class="gallery-body"><h3>${title}</h3>${desc?`<p>${desc}</p>`:''}</div></article>`;
    }).join('');
  }

  async function loadGallery(){
    const grid=document.getElementById('galleryGrid');
    if(!grid) return;
    const c=await getGalleryClient();
    if(!c){grid.innerHTML='<div class="gallery-empty">गैलरी अभी उपलब्ध नहीं है।</div>';return;}
    grid.innerHTML='<div class="gallery-loading">गैलरी लोड हो रही है...</div>';
    const {data,error}=await c.from('gallery_items').select('*').eq('published',true).order('display_order',{ascending:true}).order('created_at',{ascending:false});
    if(error){console.error('Gallery load error:',error);grid.innerHTML='<div class="gallery-empty">गैलरी लोड नहीं हो सकी।</div>';return;}
    renderGallery(data||[]);
  }

  window.loadGallery=loadGallery;
  document.addEventListener('DOMContentLoaded',loadGallery);
})();
