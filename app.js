let sb = null;

async function loadSB() {
  if (sb) return sb;
  if (typeof supabase === "undefined") {
    console.error("Supabase library not loaded.");
    return null;
  }
  if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") {
    console.error("Supabase config missing.");
    return null;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

function safe(value) {
  return String(value ?? "-")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

function makeId() {
  return "BJKP-" + Math.random().toString(36).slice(2,8).toUpperCase();
}

async function uploadMemberPhoto(file, memberId) {
  const client = await loadSB();
  if (!client) throw new Error("Supabase connect नहीं है।");
  if (!file) throw new Error("कृपया सदस्य की फोटो चुनें।");
  if (!file.type.startsWith("image/")) throw new Error("कृपया केवल image/photo file चुनें।");
  if (file.size > 5 * 1024 * 1024) throw new Error("फोटो 5 MB से छोटी होनी चाहिए।");

  const ext = (file.name.split(".").pop() || "jpg")
    .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = memberId + "/" + Date.now() + "." + ext;

  const { error } = await client.storage.from("member-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type
  });

  if (error) {
    console.error("Photo Upload Error:", error);
    throw new Error("फोटो upload नहीं हुई: " + error.message);
  }

  const { data } = client.storage.from("member-photos").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("फोटो का URL नहीं मिला।");

  return data.publicUrl;
}

function setupPhotoPreview() {
  const input = document.getElementById("memberPhoto");
  const preview = document.getElementById("photoPreview");
  if (!input || !preview) return;

  input.addEventListener("change", function () {
    const file = this.files?.[0];
    if (!file) {
      preview.hidden = true;
      preview.removeAttribute("src");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      preview.src = e.target.result;
      preview.hidden = false;
    };
    reader.readAsDataURL(file);
  });
}

async function submitMembership(e) {
  e.preventDefault();

  const form = e.target;
  const result = document.getElementById("result");
  const f = new FormData(form);
  const memberId = makeId();
  const photoFile = f.get("photo");

  const data = {
    member_id: memberId,
    name: f.get("name")?.toString().trim(),
    mobile: f.get("mobile")?.toString().trim(),
    email: f.get("email")?.toString().trim() || null,
    district: f.get("district")?.toString().trim(),
    role: f.get("role")?.toString().trim(),
    status: "pending",
    photo_url: null
  };

  if (!data.name) {
    result.innerHTML = '<p class="error">कृपया अपना नाम दर्ज करें।</p>';
    return;
  }
  if (!data.mobile) {
    result.innerHTML = '<p class="error">कृपया मोबाइल नंबर दर्ज करें।</p>';
    return;
  }
  if (!data.district) {
    result.innerHTML = '<p class="error">कृपया जिला दर्ज करें।</p>';
    return;
  }
  if (!photoFile || !photoFile.name) {
    result.innerHTML = '<p class="error">कृपया सदस्य की फोटो चुनें।</p>';
    return;
  }

  const client = await loadSB();
  if (!client) {
    result.innerHTML = '<p class="error">Database connect नहीं है। config.js जांचें।</p>';
    return;
  }

  result.innerHTML = '<p>फोटो upload और आवेदन जमा हो रहा है...</p>';

  try {
    data.photo_url = await uploadMemberPhoto(photoFile, memberId);

    const { error } = await client.from("members").insert([data]);

    if (error) {
      console.error("Membership Error:", error);
      result.innerHTML = '<p class="error">आवेदन जमा नहीं हुआ: ' + safe(error.message) + '</p>';
      return;
    }

    form.reset();
    const preview = document.getElementById("photoPreview");
    if (preview) {
      preview.hidden = true;
      preview.removeAttribute("src");
    }

    result.innerHTML =
      '<div class="idcard"><h3>BJKP सदस्यता आवेदन</h3>' +
      '<p>आवेदन सफलतापूर्वक जमा हुआ।</p>' +
      '<p><b>Application ID:</b> ' + safe(memberId) + '</p>' +
      '<p>इस ID को सुरक्षित रखें।</p>' +
      '<p>Admin approval के बाद Digital Member ID जारी होगी।</p></div>';
  } catch (err) {
    console.error("Membership/Photo Error:", err);
    result.innerHTML = '<p class="error">' + safe(err.message) + '</p>';
  }
}

function showDigitalCard(data) {
  const out = document.getElementById("verifyResult");
  if (!out) return;

  const verifyUrl =
    window.location.origin +
    window.location.pathname +
    "?verify=" +
    encodeURIComponent(data.member_id);

  const logoUrl = new URL("images/logo.png", window.location.href).href;
  const photoUrl = data.photo_url || "";

  out.innerHTML = `
    <div class="digital-card" id="digitalMemberCard">
      <div class="card-header">
        <img src="${logoUrl}" class="card-logo" alt="BJKP Logo">
        <div>
          <h2>भारतीय जन कल्याण पार्टी</h2>
          <p>राष्ट्र प्रथम • जन सेवा सर्वोपरि</p>
        </div>
      </div>

      <div class="card-title">DIGITAL MEMBER ID CARD</div>

      <div class="member-photo-box">
        ${
          photoUrl
            ? `<img src="${safe(photoUrl)}" class="member-photo" alt="सदस्य फोटो"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
               <div class="member-photo-placeholder" style="display:none;">फोटो उपलब्ध नहीं</div>`
            : `<div class="member-photo-placeholder">फोटो उपलब्ध नहीं</div>`
        }
      </div>

      <div class="member-info">
        <p><span>नाम</span><b>${safe(data.name)}</b></p>
        <p><span>Digital Member ID</span><b>${safe(data.member_id)}</b></p>
        <p><span>मोबाइल</span><b>${safe(data.mobile)}</b></p>
        <p><span>जिला</span><b>${safe(data.district)}</b></p>
        <p><span>भूमिका</span><b>${safe(data.role)}</b></p>
        <p><span>स्थिति</span><b class="approved-text">✓ APPROVED MEMBER</b></p>
      </div>

      <div class="qr-area">
        <div id="memberQRCode" class="member-qr"></div>
        <small>QR Scan करके सदस्यता सत्यापित करें</small>
      </div>

      <div class="card-footer">भारतीय जन कल्याण पार्टी (BJKP)</div>
    </div>

    <div class="card-buttons">
      <button class="btn" type="button" onclick="printMemberCard()">
        🖨️ ID Card Print / Save PDF
      </button>
    </div>`;

  if (typeof QRCode !== "undefined") {
    new QRCode(document.getElementById("memberQRCode"), {
      text: verifyUrl,
      width: 110,
      height: 110
    });
  } else {
    document.getElementById("memberQRCode").innerHTML =
      "<small>QR उपलब्ध नहीं है</small>";
  }
}

function printMemberCard() {
  const card = document.getElementById("digitalMemberCard");
  if (!card) {
    alert("पहले Member ID Verify करें।");
    return;
  }

  const w = window.open("", "_blank", "width=600,height=800");
  if (!w) {
    alert("Popup blocked है। Browser में popup allow करें।");
    return;
  }

  w.document.write(`<!doctype html><html lang="hi"><head>
  <meta charset="utf-8">
  <title>BJKP Digital Member ID</title>
  <style>
  *{box-sizing:border-box}
  body{margin:0;padding:30px;background:#eee;font-family:Arial,sans-serif}
  .digital-card{width:380px;margin:auto;background:#fff;border:2px solid #8b0000;border-radius:18px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.2)}
  .card-header{background:#a90000;color:#fff;padding:14px;display:flex;align-items:center;gap:12px}
  .card-logo{width:62px;height:62px;object-fit:contain;background:#fff;border-radius:50%}
  .card-header h2{margin:0;font-size:19px}
  .card-header p{margin:5px 0 0;font-size:11px}
  .card-title{text-align:center;font-weight:bold;padding:12px;color:#8b0000;border-bottom:1px solid #ddd}
  .member-photo-box{text-align:center;padding:15px 0 5px}
  .member-photo{width:95px;height:115px;object-fit:cover;border:2px solid #8b0000;border-radius:5px}
  .member-photo-placeholder{width:95px;height:115px;margin:auto;border:2px solid #8b0000;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#8b0000;background:#f5f5f5;font-size:11px}
  .member-info{padding:10px 25px}
  .member-info p{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #eee;padding:7px 0;margin:0;font-size:12px}
  .member-info span{color:#555}
  .approved-text{color:green}
  .qr-area{text-align:center;padding:10px}
  .member-qr{display:flex;justify-content:center}
  .qr-area small{display:block;margin-top:5px;font-size:10px}
  .card-footer{background:#8b0000;color:#fff;text-align:center;padding:8px;font-size:11px}
  @media print{body{background:#fff;padding:0}.digital-card{box-shadow:none}}
  </style></head><body>
  ${card.outerHTML}
  <script>window.onload=function(){setTimeout(function(){window.print()},700)};<\/script>
  </body></html>`);

  w.document.close();
}

async function verifyMember() {
  const input = document.getElementById("verifyId");
  const out = document.getElementById("verifyResult");
  if (!input || !out) return;

  const id = input.value.trim().toUpperCase();
  if (!id) {
    out.innerHTML = '<p class="error">कृपया Member ID डालें।</p>';
    return;
  }

  const client = await loadSB();
  if (!client) {
    out.innerHTML = '<p class="error">Database connect नहीं है।</p>';
    return;
  }

  out.innerHTML = '<p>सत्यापन हो रहा है...</p>';

  const { data, error } = await client
    .from("members")
    .select("member_id,name,mobile,email,district,role,status,approved_at,photo_url")
    .eq("member_id", id)
    .maybeSingle();

  if (error) {
    console.error("Verification Error:", error);
    out.innerHTML =
      '<p class="error">Database Error: ' + safe(error.message) + '</p>';
    return;
  }

  if (!data) {
    out.innerHTML =
      '<p class="error">यह Member ID रिकॉर्ड में नहीं मिली।</p>';
    return;
  }

  if (data.status !== "approved") {
    let statusText = data.status || "pending";
    if (statusText === "pending") statusText = "Pending";
    if (statusText === "rejected") statusText = "Rejected";

    out.innerHTML =
      '<div class="idcard"><h3>BJKP सदस्यता आवेदन</h3>' +
      '<p><b>Application ID:</b> ' + safe(data.member_id) + '</p>' +
      '<p><b>नाम:</b> ' + safe(data.name) + '</p>' +
      '<p><b>जिला:</b> ' + safe(data.district) + '</p>' +
      '<p><b>स्थिति:</b> ' + safe(statusText) + '</p>' +
      '<p>Admin approval के बाद Digital ID जारी होगी।</p></div>';
    return;
  }

  showDigitalCard(data);
}

async function adminLogin() {
  const client = await loadSB();
  const email = document.getElementById("adminEmail")?.value.trim();
  const password = document.getElementById("adminPassword")?.value;
  const loginMessage = document.getElementById("loginMsg");

  if (!client) {
    if (loginMessage) loginMessage.textContent = "Supabase config पहले भरें।";
    return;
  }

  if (!email || !password) {
    if (loginMessage) loginMessage.textContent = "Email और password डालें।";
    return;
  }

  if (loginMessage) loginMessage.textContent = "Login हो रहा है...";

  const { error } = await client.auth.signInWithPassword({email, password});

  if (error) {
    console.error("Login Error:", error);
    if (loginMessage) loginMessage.textContent = "Login failed: " + error.message;
    return;
  }

  const loginBox = document.getElementById("loginBox");
  const dashboard = document.getElementById("dashboard");

  if (loginBox) loginBox.hidden = true;
  if (dashboard) dashboard.hidden = false;

  await loadMembers();
}

async function adminLogout() {
  const client = await loadSB();
  if (client) await client.auth.signOut();
  location.reload();
}

async function loadMembers() {
  const client = await loadSB();
  if (!client) return;

  const {data,error} = await client
    .from("members")
    .select("*")
    .order("created_at",{ascending:false});

  if (error) {
    console.error("Load Members Error:",error);
    return;
  }

  const rows = data || [];
  const total = document.getElementById("total");
  const pending = document.getElementById("pending");
  const approved = document.getElementById("approved");
  const members = document.getElementById("members");

  if (total) total.textContent = rows.length;
  if (pending) pending.textContent = rows.filter(x=>x.status==="pending").length;
  if (approved) approved.textContent = rows.filter(x=>x.status==="approved").length;
  if (!members) return;

  members.innerHTML = rows.map(x => {
    let action = "—";
    if (x.status === "pending") {
      action =
        '<button class="btn approve" onclick="setStatus(\'' +
        safe(x.member_id) +
        '\',\'approved\')">Approve</button> ' +
        '<button class="btn reject" onclick="setStatus(\'' +
        safe(x.member_id) +
        '\',\'rejected\')">Reject</button>';
    }

    return `<tr>
      <td>${safe(x.member_id)}</td>
      <td>${safe(x.name)}</td>
      <td>${safe(x.mobile)}</td>
      <td>${safe(x.district)}</td>
      <td>${safe(x.status)}</td>
      <td>${action}</td>
    </tr>`;
  }).join("");
}

async function setStatus(id,status) {
  const client = await loadSB();
  if (!client) {
    alert("Database connect नहीं है।");
    return;
  }

  const updateData = {
    status,
    approved_at: status === "approved" ? new Date().toISOString() : null
  };

  const {error} = await client
    .from("members")
    .update(updateData)
    .eq("member_id",id);

  if (error) {
    console.error("Status Update Error:",error);
    alert("Status update नहीं हुआ: " + error.message);
    return;
  }

  alert(status === "approved" ? "सदस्य Approved हो गया।" : "सदस्य Rejected हो गया।");
  await loadMembers();
}

async function autoVerifyFromURL() {
  const id = new URLSearchParams(window.location.search).get("verify");
  if (!id) return;

  const input = document.getElementById("verifyId");
  if (input) input.value = id.toUpperCase();

  setTimeout(() => verifyMember(),500);
}

document.addEventListener("DOMContentLoaded", function() {
  setupPhotoPreview();

  const memberForm = document.getElementById("memberForm");
  if (memberForm) memberForm.addEventListener("submit",submitMembership);

  autoVerifyFromURL();
});
