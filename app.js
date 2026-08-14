let sb = null;

async function loadSB() {
  if (sb) return sb;
  if (typeof supabase === "undefined") return null;
  if (typeof SUPABASE_URL === "undefined" || typeof SUPABASE_ANON_KEY === "undefined") return null;
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return sb;
}

function safe(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function makeId() {
  return "BJKP-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/* Member application + direct phone photo upload.
   Supabase Storage bucket required: member-photos
   Bucket should be Public.
   members table needs photo_url TEXT column.
*/
async function submitMembership(e) {
  e.preventDefault();

  const form = e.target;
  const result = document.getElementById("result");
  const f = new FormData(form);
  const client = await loadSB();

  if (!client) {
    result.innerHTML = '<p class="error">Database connect नहीं है। config.js जांचें।</p>';
    return;
  }

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

  if (!data.name || !data.mobile || !data.district) {
    result.innerHTML = '<p class="error">नाम, मोबाइल और जिला भरना जरूरी है।</p>';
    return;
  }

  if (photoFile && photoFile.size > 0) {
    if (!photoFile.type.startsWith("image/")) {
      result.innerHTML = '<p class="error">कृपया JPG, PNG या WEBP फोटो चुनें।</p>';
      return;
    }
    if (photoFile.size > 5 * 1024 * 1024) {
      result.innerHTML = '<p class="error">फोटो अधिकतम 5 MB की होनी चाहिए।</p>';
      return;
    }

    result.innerHTML = '<p>फोटो upload हो रही है...</p>';

    const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${memberId}.${ext}`;

    const { error: uploadError } = await client.storage
      .from("member-photos")
      .upload(path, photoFile, { upsert: true, contentType: photoFile.type });

    if (uploadError) {
      console.error(uploadError);
      result.innerHTML = '<p class="error">फोटो upload नहीं हुई: ' + safe(uploadError.message) + '</p>';
      return;
    }

    const { data: publicData } = client.storage
      .from("member-photos")
      .getPublicUrl(path);

    data.photo_url = publicData.publicUrl;
  }

  result.innerHTML = '<p>आवेदन जमा हो रहा है...</p>';

  const { error } = await client.from("members").insert([data]);

  if (error) {
    console.error(error);
    result.innerHTML = '<p class="error">Error: ' + safe(error.message) + '</p>';
    return;
  }

  form.reset();
  result.innerHTML =
    '<div class="idcard">' +
    '<h3>BJKP सदस्यता आवेदन</h3>' +
    '<p>आवेदन सफलतापूर्वक जमा हुआ।</p>' +
    '<p><b>Application ID:</b> ' + safe(memberId) + '</p>' +
    '<p>Admin approval के बाद Digital Member ID जारी होगी।</p>' +
    '</div>';
}

function showDigitalCard(data) {
  const out = document.getElementById("verifyResult");
  if (!out) return;

  const verifyUrl = window.location.origin + window.location.pathname +
    "?verify=" + encodeURIComponent(data.member_id);

  const logoUrl = new URL("images/logo.png", window.location.href).href;
  const photoHtml = data.photo_url
    ? `<img src="${safe(data.photo_url)}" class="member-photo" alt="सदस्य फोटो">`
    : `<div class="member-photo-placeholder">BJKP</div>`;

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

      <div class="member-photo-box">${photoHtml}</div>

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
    </div>
  `;

  if (typeof QRCode !== "undefined") {
    new QRCode(document.getElementById("memberQRCode"), {
      text: verifyUrl, width: 110, height: 110
    });
  }
}

function printMemberCard() {
  const card = document.getElementById("digitalMemberCard");
  if (!card) {
    alert("पहले Member ID Verify करें।");
    return;
  }

  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (!printWindow) {
    alert("Popup blocked है। Browser में popup allow करें।");
    return;
  }

  printWindow.document.write(`
    <!doctype html><html lang="hi"><head><meta charset="utf-8">
    <title>BJKP Digital Member ID</title>
    <style>
      *{box-sizing:border-box}
      body{margin:0;padding:30px;background:#eee;font-family:Arial,sans-serif}
      .digital-card{width:380px;margin:auto;background:#fff;border:2px solid #8b0000;border-radius:18px;overflow:hidden}
      .card-header{background:#a90000;color:#fff;padding:14px;display:flex;align-items:center;gap:12px}
      .card-logo{width:48px;height:48px;object-fit:contain;background:#fff;border-radius:50%}
      .card-header h2{margin:0;font-size:18px}.card-header p{margin:5px 0 0;font-size:11px}
      .card-title{text-align:center;font-weight:bold;padding:10px;color:#8b0000;border-bottom:1px solid #ddd}
      .member-photo-box{text-align:center;padding:12px 0 5px}
      .member-photo{width:85px;height:105px;object-fit:cover;border:2px solid #8b0000;border-radius:8px}
      .member-photo-placeholder{width:85px;height:105px;margin:auto;border:2px solid #8b0000;display:flex;align-items:center;justify-content:center;font-weight:bold;color:#8b0000;background:#f5f5f5}
      .member-info{padding:8px 22px}.member-info p{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #eee;padding:6px 0;margin:0;font-size:11px}
      .member-info span{color:#555}.approved-text{color:green}.qr-area{text-align:center;padding:8px}.member-qr{display:flex;justify-content:center}.qr-area small{display:block;margin-top:4px;font-size:9px}
      .card-footer{background:#8b0000;color:#fff;text-align:center;padding:7px;font-size:10px}
      @media print{body{background:#fff;padding:0}.digital-card{box-shadow:none}}
    </style></head><body>${card.outerHTML}
    <script>window.onload=function(){setTimeout(function(){window.print()},700)};<\/script>
    </body></html>
  `);
  printWindow.document.close();
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
    out.innerHTML = '<p class="error">Database Error: ' + safe(error.message) + '</p>';
    return;
  }

  if (!data) {
    out.innerHTML = '<p class="error">यह Member ID रिकॉर्ड में नहीं मिली।</p>';
    return;
  }

  if (data.status !== "approved") {
    out.innerHTML = `<div class="idcard">
      <h3>BJKP सदस्यता आवेदन</h3>
      <p><b>Application ID:</b> ${safe(data.member_id)}</p>
      <p><b>नाम:</b> ${safe(data.name)}</p>
      <p><b>जिला:</b> ${safe(data.district)}</p>
      <p><b>स्थिति:</b> ${safe(data.status || "pending")}</p>
      <p>Admin approval के बाद Digital ID जारी होगी।</p>
    </div>`;
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

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    if (loginMessage) loginMessage.textContent = "Login failed: " + error.message;
    return;
  }

  document.getElementById("loginBox")?.setAttribute("hidden", "");
  const dashboard = document.getElementById("dashboard");
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

  const { data, error } = await client
    .from("members").select("*").order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const rows = data || [];
  document.getElementById("total")?.replaceChildren(document.createTextNode(rows.length));
  document.getElementById("pending")?.replaceChildren(document.createTextNode(rows.filter(x => x.status === "pending").length));
  document.getElementById("approved")?.replaceChildren(document.createTextNode(rows.filter(x => x.status === "approved").length));

  const membersElement = document.getElementById("members");
  if (!membersElement) return;

  membersElement.innerHTML = rows.map(x => `
    <tr>
      <td>${safe(x.member_id)}</td>
      <td>${safe(x.name)}</td>
      <td>${safe(x.mobile)}</td>
      <td>${safe(x.district)}</td>
      <td>${safe(x.status)}</td>
      <td>${x.photo_url ? '<span class="photo-ok">Photo ✓</span>' : 'No photo'}</td>
      <td>${x.status === "pending"
        ? `<button class="btn approve" onclick="setStatus('${safe(x.member_id)}','approved')">Approve</button>
           <button class="btn reject" onclick="setStatus('${safe(x.member_id)}','rejected')">Reject</button>`
        : "—"}</td>
    </tr>
  `).join("");
}

async function setStatus(id, status) {
  const client = await loadSB();
  if (!client) return;

  const { error } = await client.from("members")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null
    })
    .eq("member_id", id);

  if (error) {
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
  setTimeout(() => verifyMember(), 500);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("memberForm")?.addEventListener("submit", submitMembership);
  autoVerifyFromURL();
});
