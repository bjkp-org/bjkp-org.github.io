(function(){
  let client=null;
  async function sb(){
    if(client) return client;
    if(typeof supabase==='undefined' || typeof SUPABASE_URL==='undefined' || typeof SUPABASE_ANON_KEY==='undefined') return null;
    client=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
    return client;
  }
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  function msg(text,ok=false){const el=document.getElementById('galleryMsg');if(el){el.textContent=text;el.className=ok?'gallery-success':'gallery-error';}}

  async function uploadFile(file){
    const c=await sb();
    if(!c) throw new Error('Supabase connect नहीं है।');
    if(!file) return null;
    if(!['image/','video/'].some(x=>file.type.startsWith(x))) throw new Error('केवल image या video file चुनें।');
    const limit=file.type.startsWith('video/')?50:8;
    if(file.size>limit*1024*1024) throw new Error(`फाइल ${limit} MB से छोटी होनी चाहिए।`);
    const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
    const path=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const {error}=await c.storage.from('party-gallery').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error) throw new Error('फाइल upload नहीं हुई: '+error.message);
    const {data}=c.storage.from('party-gallery').getPublicUrl(path);
    if(!data?.publicUrl) throw new Error('फाइल का URL नहीं मिला।');
    return data.publicUrl;
  }

  async function loadGalleryAdmin(){
    const c=await sb(); const tbody=document.getElementById('galleryRows'); if(!c||!tbody) return;
    const {data,error}=await c.from('gallery_items').select('*').order('display_order',{ascending:true}).order('created_at',{ascending:false});
    if(error){tbody.innerHTML=`<tr><td colspan="7">${esc(error.message)}</td></tr>`;return;}
    const rows=data||[];
    tbody.innerHTML=rows.length?rows.map(x=>`<tr>
      <td>${x.media_type==='video'?'▶️':'📷'}</td><td>${esc(x.title)}</td><td>${esc(x.media_type)}</td>
      <td>${x.published?'✅ प्रकाशित':'⏸️ छिपा'}</td><td>${esc(x.display_order)}</td>
      <td><a href="${esc(x.media_url)}" target="_blank" rel="noopener">देखें</a></td>
      <td><button class="gallery-small-btn" onclick="editGalleryItem('${esc(x.id)}')">संपादित</button> <button class="gallery-small-btn danger" onclick="deleteGalleryItem('${esc(x.id)}')">हटाएँ</button></td>
    </tr>`).join(''):'<tr><td colspan="7" class="gallery-empty-cell">अभी कोई gallery item नहीं है।</td></tr>';
    window.__galleryItems=rows;
  }

  function resetGalleryForm(){
    document.getElementById('galleryForm')?.reset();
    const id=document.getElementById('galleryId'); if(id) id.value='';
    const submit=document.getElementById('gallerySubmit'); if(submit) submit.textContent='गैलरी में जोड़ें';
    const preview=document.getElementById('galleryPreview'); if(preview){preview.hidden=true;preview.removeAttribute('src');}
    msg('');
  }

  window.editGalleryItem=function(id){
    const x=(window.__galleryItems||[]).find(i=>i.id===id); if(!x)return;
    document.getElementById('galleryId').value=x.id;
    document.getElementById('galleryTitle').value=x.title||'';
    document.getElementById('galleryType').value=x.media_type||'image';
    document.getElementById('galleryUrl').value=x.media_url||'';
    document.getElementById('galleryDescription').value=x.description||'';
    document.getElementById('galleryOrder').value=x.display_order??0;
    document.getElementById('galleryPublished').checked=!!x.published;
    document.getElementById('gallerySubmit').textContent='गैलरी अपडेट करें';
    window.scrollTo({top:document.getElementById('galleryManager').offsetTop-20,behavior:'smooth'});
  };

  window.deleteGalleryItem=async function(id){
    if(!confirm('क्या आप इस gallery item को हटाना चाहते हैं?')) return;
    const c=await sb(); if(!c)return;
    const {error}=await c.from('gallery_items').delete().eq('id',id);
    if(error){msg('हटाया नहीं जा सका: '+error.message);return;}
    msg('Gallery item हट गया।',true); await loadGalleryAdmin();
  };

  async function saveGallery(e){
    e.preventDefault();
    const c=await sb(); if(!c){msg('Supabase connect नहीं है।');return;}
    const form=e.target, id=document.getElementById('galleryId').value.trim();
    const title=document.getElementById('galleryTitle').value.trim();
    const type=document.getElementById('galleryType').value;
    const url=document.getElementById('galleryUrl').value.trim();
    const file=document.getElementById('galleryFile').files?.[0];
    const description=document.getElementById('galleryDescription').value.trim();
    const order=parseInt(document.getElementById('galleryOrder').value,10)||0;
    const published=document.getElementById('galleryPublished').checked;
    if(!title){msg('शीर्षक दर्ज करें।');return;}
    if(!id && !file && !url){msg('फोटो/वीडियो file upload करें या Media URL डालें।');return;}
    msg('सहेजा जा रहा है...');
    try{
      let mediaUrl=url;
      if(file) mediaUrl=await uploadFile(file);
      const payload={title,media_type:type,media_url:mediaUrl,description,display_order:order,published,updated_at:new Date().toISOString()};
      let result;
      if(id) result=await c.from('gallery_items').update(payload).eq('id',id);
      else result=await c.from('gallery_items').insert([payload]);
      if(result.error) throw new Error(result.error.message);
      msg(id?'Gallery अपडेट हो गई।':'Gallery में जोड़ दिया गया।',true); resetGalleryForm(); await loadGalleryAdmin();
    }catch(err){console.error(err);msg(err.message||'Gallery save नहीं हुई।');}
  }

  window.loadGalleryAdmin=loadGalleryAdmin;

  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('galleryForm');
    form?.addEventListener('submit',saveGallery);
    document.getElementById('galleryReset')?.addEventListener('click',resetGalleryForm);
    const file=document.getElementById('galleryFile'); const preview=document.getElementById('galleryPreview');
    file?.addEventListener('change',()=>{const f=file.files?.[0];if(!f){preview.hidden=true;return} if(f.type.startsWith('image/')){preview.src=URL.createObjectURL(f);preview.hidden=false}else preview.hidden=true;});
    loadGalleryAdmin();
  });
})();
