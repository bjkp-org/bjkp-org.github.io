let c=null;

function client(){
 if(c) return c;
 if(typeof supabase==="undefined"||typeof SUPABASE_URL==="undefined"||typeof SUPABASE_ANON_KEY==="undefined") throw new Error("config.js सही नहीं है।");
 c=supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);return c;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function fmt(v){return v?new Intl.DateTimeFormat("hi-IN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)):"—";}

async function login(){
 const msg=document.getElementById("loginMsg");
 try{
  const {error}=await client().auth.signInWithPassword({email:document.getElementById("email").value.trim(),password:document.getElementById("password").value});
  if(error) throw error;msg.textContent="Login सफल।";showDashboard();
 }catch(e){msg.textContent="Login failed: "+e.message}
}
async function logout(){await client().auth.signOut();location.reload();}
function showDashboard(){document.getElementById("loginBox").classList.add("hidden");document.getElementById("dashboard").classList.remove("hidden");loadList();}
function newNews(){
 document.getElementById("newsId").value="";document.getElementById("title").value="";document.getElementById("excerpt").value="";document.getElementById("content").value="";document.getElementById("image_url").value="";
 const d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());document.getElementById("published_at").value=d.toISOString().slice(0,16);
 document.getElementById("status").value="draft";document.getElementById("formTitle").textContent="नया समाचार";document.getElementById("formMsg").textContent="";
}
async function loadList(){
 const box=document.getElementById("newsList");
 try{
  const {data,error}=await client().from("news").select("*").order("created_at",{ascending:false});
  if(error) throw error;if(!data.length){box.innerHTML="अभी कोई news नहीं है।";return}
  box.innerHTML=data.map(n=>`<div class="news-item"><h3>${esc(n.title)}</h3><small>${esc(fmt(n.published_at||n.created_at))} • ${esc(n.status)}</small><br><button onclick='editNews(${JSON.stringify(n).replace(/'/g,"&#39;")})'>Edit</button><button class="danger" onclick="deleteNews('${n.id}')">Delete</button></div>`).join("");
 }catch(e){box.textContent="List load error: "+e.message}
}
function editNews(n){
 document.getElementById("newsId").value=n.id;document.getElementById("title").value=n.title||"";document.getElementById("excerpt").value=n.excerpt||"";document.getElementById("content").value=n.content||"";document.getElementById("image_url").value=n.image_url||"";document.getElementById("status").value=n.status||"draft";
 if(n.published_at){const d=new Date(n.published_at);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());document.getElementById("published_at").value=d.toISOString().slice(0,16)}
 document.getElementById("formTitle").textContent="समाचार Edit करें";window.scrollTo({top:0,behavior:"smooth"});
}
async function saveNews(){
 const msg=document.getElementById("formMsg");
 try{
  const id=document.getElementById("newsId").value;
  const payload={title:document.getElementById("title").value.trim(),excerpt:document.getElementById("excerpt").value.trim(),content:document.getElementById("content").value.trim(),image_url:document.getElementById("image_url").value.trim()||null,status:document.getElementById("status").value,published_at:document.getElementById("published_at").value?new Date(document.getElementById("published_at").value).toISOString():null};
  if(!payload.title||!payload.content){msg.textContent="Title और पूरी खबर जरूरी है।";return}
  const res=id?await client().from("news").update(payload).eq("id",id):await client().from("news").insert(payload);
  if(res.error) throw res.error;msg.textContent="✓ News save हो गई।";newNews();await loadList();
 }catch(e){msg.textContent="Save error: "+e.message}
}
async function deleteNews(id){
 if(!confirm("क्या यह समाचार delete करना है?")) return;
 const {error}=await client().from("news").delete().eq("id",id);if(error){alert(error.message);return}loadList();
}
async function boot(){
 try{const {data:{session}}=await client().auth.getSession();if(session)showDashboard();}catch(e){document.getElementById("loginMsg").textContent=e.message}
}
boot();
