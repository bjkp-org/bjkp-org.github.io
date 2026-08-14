let sb = null;

/* ================================
   SUPABASE CONNECTION
================================ */

async function loadSB() {
  if (sb) return sb;

  if (typeof supabase === "undefined") {
    console.error("Supabase library not loaded.");
    return null;
  }

  if (
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined"
  ) {
    console.error("Supabase config missing.");
    return null;
  }

  sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return sb;
}


/* ================================
   GENERATE MEMBER ID
================================ */

function makeId() {
  return "BJKP-" +
    Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase();
}


/* ================================
   MEMBER APPLICATION
================================ */

async function submitMembership(e) {

  e.preventDefault();

  const form = e.target;
  const result = document.getElementById("result");

  const f = new FormData(form);

  const memberId = makeId();

  const data = {
    member_id: memberId,
    name: f.get("name")?.toString().trim(),
    mobile: f.get("mobile")?.toString().trim(),
    email: f.get("email")?.toString().trim() || null,
    district: f.get("district")?.toString().trim(),
    role: f.get("role")?.toString().trim(),
    status: "pending"
  };

  /* Basic validation */

  if (!data.name) {
    result.innerHTML =
      '<p class="error">कृपया अपना नाम दर्ज करें।</p>';
    return;
  }

  if (!data.mobile) {
    result.innerHTML =
      '<p class="error">कृपया मोबाइल नंबर दर्ज करें।</p>';
    return;
  }

  if (!data.district) {
    result.innerHTML =
      '<p class="error">कृपया जिला दर्ज करें।</p>';
    return;
  }

  const client = await loadSB();

  if (!client) {
    result.innerHTML =
      '<p class="error">Database connect नहीं है। config.js जांचें।</p>';
    return;
  }

  result.innerHTML =
    '<p>आवेदन जमा हो रहा है...</p>';

  const { data: insertedData, error } =
    await client
      .from("members")
      .insert([data])
      .select()
      .single();

  if (error) {

    console.error("Membership Error:", error);

    result.innerHTML =
      '<p class="error">Error: ' +
      error.message +
      '</p>';

    return;
  }

  /* Reset form */

  form.reset();

  /* Success message */

  result.innerHTML =
    '<div class="idcard">' +
      '<h3>BJKP सदस्यता आवेदन</h3>' +
      '<p>आवेदन सफलतापूर्वक जमा हुआ।</p>' +
      '<p><b>Application ID:</b> ' +
      memberId +
      '</p>' +
      '<p>इस ID को सुरक्षित रखें।</p>' +
      '<p>Admin approval के बाद Digital Member ID जारी होगी।</p>' +
    '</div>';
}


/* ================================
   MEMBER VERIFICATION
================================ */

async function verifyMember() {

  const input =
    document.getElementById("verifyId");

  const out =
    document.getElementById("verifyResult");

  if (!input || !out) {
    console.error("Verification elements not found.");
    return;
  }

  const id =
    input.value.trim().toUpperCase();

  if (!id) {

    out.innerHTML =
      '<p class="error">कृपया Member ID डालें।</p>';

    return;
  }

  const client = await loadSB();

  if (!client) {

    out.innerHTML =
      '<p class="error">Database connect नहीं है।</p>';

    return;
  }

  out.innerHTML =
    '<p>सत्यापन हो रहा है...</p>';

  const { data, error } =
    await client
      .from("members")
      .select(
        "member_id,name,mobile,email,district,role,status,approved_at"
      )
      .eq("member_id", id)
      .maybeSingle();

  if (error) {

    console.error("Verification Error:", error);

    out.innerHTML =
      '<p class="error">Database Error: ' +
      error.message +
      '</p>';

    return;
  }

  if (!data) {

    out.innerHTML =
      '<p class="error">यह Member ID रिकॉर्ड में नहीं मिली।</p>';

    return;
  }

  /* Pending / rejected */

  if (data.status !== "approved") {

    let statusText = data.status || "pending";

    if (statusText === "pending") {
      statusText = "Pending";
    }

    if (statusText === "rejected") {
      statusText = "Rejected";
    }

    out.innerHTML =
      '<div class="idcard">' +
        '<h3>BJKP सदस्यता आवेदन</h3>' +
        '<p><b>Application ID:</b> ' +
        data.member_id +
        '</p>' +
        '<p><b>नाम:</b> ' +
        (data.name || "-") +
        '</p>' +
        '<p><b>जिला:</b> ' +
        (data.district || "-") +
        '</p>' +
        '<p><b>स्थिति:</b> ' +
        statusText +
        '</p>' +
        '<p>Admin approval के बाद Digital ID जारी होगी।</p>' +
      '</div>';

    return;
  }

  /* Approved member */

  out.innerHTML =
    '<div class="idcard">' +
      '<h3>भारतीय जन कल्याण पार्टी</h3>' +

      '<p>' +
      '<b>Digital Member ID:</b> ' +
      data.member_id +
      '</p>' +

      '<p>' +
      '<b>नाम:</b> ' +
      (data.name || "-") +
      '</p>' +

      '<p>' +
      '<b>मोबाइल:</b> ' +
      (data.mobile || "-") +
      '</p>' +

      '<p>' +
      '<b>ईमेल:</b> ' +
      (data.email || "-") +
      '</p>' +

      '<p>' +
      '<b>जिला:</b> ' +
      (data.district || "-") +
      '</p>' +

      '<p>' +
      '<b>भूमिका:</b> ' +
      (data.role || "-") +
      '</p>' +

      '<p class="success">' +
      '✓ Approved Member' +
      '</p>' +

      '<p>' +
      '<b>सदस्यता सत्यापित है।</b>' +
      '</p>' +

    '</div>';
}


/* ================================
   ADMIN LOGIN
================================ */

async function adminLogin() {

  const client = await loadSB();

  const email =
    document.getElementById("adminEmail")?.value.trim();

  const password =
    document.getElementById("adminPassword")?.value;

  const loginMessage =
    document.getElementById("loginMsg");

  if (!client) {

    if (loginMessage) {
      loginMessage.textContent =
        "Supabase config पहले भरें।";
    }

    return;
  }

  if (!email || !password) {

    if (loginMessage) {
      loginMessage.textContent =
        "Email और password डालें।";
    }

    return;
  }

  if (loginMessage) {
    loginMessage.textContent =
      "Login हो रहा है...";
  }

  const { error } =
    await client.auth.signInWithPassword({
      email: email,
      password: password
    });

  if (error) {

    console.error("Login Error:", error);

    if (loginMessage) {
      loginMessage.textContent =
        "Login failed: " + error.message;
    }

    return;
  }

  const loginBox =
    document.getElementById("loginBox");

  const dashboard =
    document.getElementById("dashboard");

  if (loginBox) {
    loginBox.hidden = true;
  }

  if (dashboard) {
    dashboard.hidden = false;
  }

  await loadMembers();
}


/* ================================
   ADMIN LOGOUT
================================ */

async function adminLogout() {

  const client = await loadSB();

  if (client) {
    await client.auth.signOut();
  }

  location.reload();
}


/* ================================
   LOAD MEMBERS FOR ADMIN
================================ */

async function loadMembers() {

  const client = await loadSB();

  if (!client) return;

  const {
    data,
    error
  } = await client
    .from("members")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (error) {

    console.error(
      "Load Members Error:",
      error
    );

    return;
  }

  const rows = data || [];

  /* Dashboard counters */

  const totalElement =
    document.getElementById("total");

  const pendingElement =
    document.getElementById("pending");

  const approvedElement =
    document.getElementById("approved");

  const membersElement =
    document.getElementById("members");

  if (totalElement) {
    totalElement.textContent =
      rows.length;
  }

  if (pendingElement) {
    pendingElement.textContent =
      rows.filter(
        x => x.status === "pending"
      ).length;
  }

  if (approvedElement) {
    approvedElement.textContent =
      rows.filter(
        x => x.status === "approved"
      ).length;
  }

  /* Members table */

  if (!membersElement) return;

  membersElement.innerHTML =
    rows.map(x => {

      let action = "—";

      if (x.status === "pending") {

        action =
          '<button class="btn approve" ' +
          'onclick="setStatus(\'' +
          x.member_id +
          '\',\'approved\')">' +
          'Approve' +
          '</button> ' +

          '<button class="btn reject" ' +
          'onclick="setStatus(\'' +
          x.member_id +
          '\',\'rejected\')">' +
          'Reject' +
          '</button>';
      }

      return `
        <tr>
          <td>${x.member_id || "-"}</td>
          <td>${x.name || "-"}</td>
          <td>${x.mobile || "-"}</td>
          <td>${x.district || "-"}</td>
          <td>${x.status || "-"}</td>
          <td>${action}</td>
        </tr>
      `;

    }).join("");
}


/* ================================
   APPROVE / REJECT MEMBER
================================ */

async function setStatus(id, status) {

  const client = await loadSB();

  if (!client) {
    alert("Database connect नहीं है।");
    return;
  }

  const updateData = {
    status: status,
    approved_at:
      status === "approved"
        ? new Date().toISOString()
        : null
  };

  const { error } =
    await client
      .from("members")
      .update(updateData)
      .eq("member_id", id);

  if (error) {

    console.error(
      "Status Update Error:",
      error
    );

    alert(
      "Status update नहीं हुआ: " +
      error.message
    );

    return;
  }

  alert(
    status === "approved"
      ? "सदस्य Approved हो गया।"
      : "सदस्य Rejected हो गया।"
  );

  await loadMembers();
}


/* ================================
   PAGE INITIALIZATION
================================ */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    const memberForm =
      document.getElementById("memberForm");

    if (memberForm) {

      memberForm.addEventListener(
        "submit",
        submitMembership
      );
    }

  }
);
