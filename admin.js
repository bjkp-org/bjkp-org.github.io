const configured=window.BJKP_SUPABASE_URL&&window.BJKP_SUPABASE_ANON_KEY&&window.supabase;
const db=configured?window.supabase.createClient(window.BJKP_SUPABASE_URL,window.BJKP_SUPABASE_ANON_KEY):null;
const $=id=>document.getElementById(id);
$("login").onclick=async()=>{if(!db){$("loginMsg").textContent="config.js में Supabase URL और anon key भरें.";return}const {data,error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){$("loginMsg").textContent=error.message;return}showDash()};
$("logout").onclick=async()=>{await db.auth.signOut();$("dash").classList.add("hidden");$("loginBox").classList.remove("hidden")};
function showDash(){$("loginBox").classList.add("hidden");$("dash").classList.remove("hidden");loadAll()}
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.add("hidden"));$(b.dataset.tab).classList.remove("hidden")});
function formInsert(form,table,fields,after){form.onsubmit=async e=>{e.preventDefault();const fd=new FormData(form),obj={};fields.forEach(k=>obj[k]=fd.get(k)||null);const {error}=await db.from(table).insert([obj]);if(error)alert(error.message);else{form.reset();after()}}}
formInsert($("newsForm"),"news",["title","published_at"],loadNews);
formInsert($("announcementForm"),"announcements",["title"],loadAnnouncements);
formInsert($("officerForm"),"officers",["name","role"],loadOfficers);
formInsert($("galleryForm"),"gallery",["title","image_url"],loadGallery);
formInsert($("videoForm"),"videos",["title","video_url"],loadVideos);
async function remove(table,id,fn){if(confirm("Delete करें?")){const {error}=await db.from(table).delete().eq("id",id);if(error)alert(error.message);else fn()}}
function rows(el,items,fn,label){$(el).innerHTML=items.map(x=>`<div class="row"><span>${x.title||x.name||x.role||x.mobile||""}</span><button class="danger" onclick='remove("${label}",${x.id},${fn.name})'>Delete</button></div>`).join("")}
async function loadNews(){const {data}=await db.from("news").select("*").order("published_at",{ascending:false});$("newsRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.title} — ${x.published_at||""}</span><button class="danger" onclick="remove('news',${x.id},loadNews)">Delete</button></div>`).join("")}
async function loadAnnouncements(){const {data}=await db.from("announcements").select("*").order("created_at",{ascending:false});$("announcementRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.title}</span><button class="danger" onclick="remove('announcements',${x.id},loadAnnouncements)">Delete</button></div>`).join("")}
async function loadOfficers(){const {data}=await db.from("officers").select("*").order("created_at",{ascending:true});$("officerRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.name} — ${x.role}</span><button class="danger" onclick="remove('officers',${x.id},loadOfficers)">Delete</button></div>`).join("")}
async function loadGallery(){const {data}=await db.from("gallery").select("*").order("created_at",{ascending:false});$("galleryRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.title||x.image_url}</span><button class="danger" onclick="remove('gallery',${x.id},loadGallery)">Delete</button></div>`).join("")}
async function loadVideos(){const {data}=await db.from("videos").select("*").order("created_at",{ascending:false});$("videoRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.title||x.video_url}</span><button class="danger" onclick="remove('videos',${x.id},loadVideos)">Delete</button></div>`).join("")}
async function loadMembers(){const {data}=await db.from("memberships").select("*").order("created_at",{ascending:false});$("memberRows").innerHTML=(data||[]).map(x=>`<div class="row"><span>${x.name} | ${x.mobile} | ${x.district||""}<br>${x.message||""}</span><button class="danger" onclick="remove('memberships',${x.id},loadMembers)">Delete</button></div>`).join("")}
async function loadAll(){await Promise.all([loadNews(),loadAnnouncements(),loadOfficers(),loadGallery(),loadVideos(),loadMembers()])}
if(db)db.auth.getSession().then(({data})=>{if(data.session)showDash()});