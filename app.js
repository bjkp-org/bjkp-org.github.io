let sb = null;


/* =========================================================
   SUPABASE CONNECTION
========================================================= */

async function loadSB(){

  if(sb) return sb;

  if(typeof supabase === "undefined"){
    console.error("Supabase library नहीं मिली।");
    return null;
  }

  if(
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined"
  ){
    console.error("config.js में Supabase settings नहीं मिलीं।");
    return null;
  }

  sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return sb;
}


/* =========================================================
   SAFE HTML
========================================================= */

function safe(v){

  return String(v ?? "-").replace(
    /[&<>"]/g,
    function(m){

      return {
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;"
      }[m];

    }
  );
}


/* =========================================================
   MEMBER ID
========================================================= */

function makeId(){

  return "BJKP-" +
    Math.random()
      .toString(36)
      .slice(2,8)
      .toUpperCase();

}


/* =========================================================
   MEMBER PHOTO UPLOAD
========================================================= */

async function uploadMemberPhoto(file,id){

  const c = await loadSB();

  if(!c)
    throw Error("Supabase connect नहीं है।");

  if(!file || !file.type.startsWith("image/"))
    throw Error("कृपया फोटो चुनें।");

  if(file.size > 5242880)
    throw Error("फोटो 5 MB से छोटी होनी चाहिए।");

  const ext =
    (
      file.name.split(".").pop() || "jpg"
    )
    .replace(/[^a-z0-9]/gi,"")
    .toLowerCase() || "jpg";

  const path =
    id + "/" +
    Date.now() +
    "." +
    ext;

  const {
    error
  } = await c.storage
    .from("member-photos")
    .upload(
      path,
      file,
      {
        upsert:false,
        contentType:file.type
      }
    );

  if(error)
    throw Error(
      "फोटो upload नहीं हुई: " +
      error.message
    );

  return c.storage
    .from("member-photos")
    .getPublicUrl(path)
    .data
    .publicUrl;
}


/* =========================================================
   MEMBERSHIP APPLICATION
========================================================= */

async function submitMembership(e){

  e.preventDefault();

  const f = new FormData(e.target);

  const r =
    document.getElementById("result");

  const id = makeId();

  const photo = f.get("photo");

  const d = {

    member_id:id,

    name:
      f.get("name")?.trim(),

    mobile:
      f.get("mobile")?.trim(),

    email:
      f.get("email")?.trim() || null,

    district:
      f.get("district")?.trim(),

    role:
      f.get("role")?.trim(),

    status:"pending",

    photo_url:null

  };


  if(
    !d.name ||
    !d.mobile ||
    !d.district ||
    !photo?.name
  ){

    r.innerHTML =
      "<p>सभी जरूरी जानकारी और फोटो भरें।</p>";

    return;
  }


  const c = await loadSB();

  if(!c){

    r.innerHTML =
      "<p>Database connect नहीं है।</p>";

    return;
  }


  try{

    r.innerHTML =
      "<p>फोटो upload हो रही है...</p>";


    d.photo_url =
      await uploadMemberPhoto(
        photo,
        id
      );


    const {
      error
    } = await c
      .from("members")
      .insert([d]);


    if(error)
      throw Error(error.message);


    e.target.reset();


    const preview =
      document.getElementById(
        "photoPreview"
      );

    if(preview)
      preview.hidden = true;


    r.innerHTML =
      "<div class='about-grid'>" +

      "<article>" +

      "<h3>आवेदन सफल!</h3>" +

      "<p>Application ID: <b>" +
      safe(id) +
      "</b></p>" +

      "<p>" +
      "Admin द्वारा स्तर और पद निर्धारित करके approval दिया जाएगा।" +
      "</p>" +

      "</article>" +

      "</div>";


  }catch(x){

    r.innerHTML =
      "<p>" +
      safe(x.message) +
      "</p>";

  }

}


/* =========================================================
   DIGITAL MEMBER CARD
========================================================= */

function showDigitalCard(d){

  const o =
    document.getElementById(
      "verifyResult"
    );

  const p =
    d.photo_url || "";

  const u =
    location.origin +
    location.pathname +
    "?verify=" +
    encodeURIComponent(
      d.member_id
    );


  o.innerHTML =

    '<div class="idcard">' +

      '<div class="idhead">' +

        '<img src="images/logo.png">' +

        '<div>' +

          '<b>भारतीय जन कल्याण पार्टी</b>' +

          '<small>' +
          'राष्ट्र प्रथम • जन सेवा सर्वोपरि' +
          '</small>' +

        '</div>' +

      '</div>' +


      '<h3>DIGITAL MEMBER ID CARD</h3>' +


      '<div class="idphoto">' +

        (
          p
          ? '<img src="' +
            safe(p) +
            '">'
          : "फोटो उपलब्ध नहीं"
        ) +

      '</div>' +


      '<div class="idinfo">' +

        '<p>' +
        '<span>नाम</span>' +
        '<b>' +
        safe(d.name) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>Member ID</span>' +
        '<b>' +
        safe(d.member_id) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>मोबाइल</span>' +
        '<b>' +
        safe(d.mobile) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>जिला</span>' +
        '<b>' +
        safe(d.district) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>पार्टी स्तर</span>' +
        '<b>' +
        safe(d.party_level_text) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>पद</span>' +
        '<b>' +
        safe(d.party_position_text) +
        '</b>' +
        '</p>' +

        '<p>' +
        '<span>स्थिति</span>' +
        '<b>✓ APPROVED</b>' +
        '</p>' +

      '</div>' +

      '<div id="memberQRCode"></div>' +

    '</div>';


  if(typeof QRCode !== "undefined"){

    new QRCode(
      document.getElementById(
        "memberQRCode"
      ),
      {
        text:u,
        width:100,
        height:100
      }
    );

  }

}


/* =========================================================
   VERIFY MEMBER
========================================================= */

async function verifyMember(){

  const input =
    document.getElementById(
      "verifyId"
    );

  const o =
    document.getElementById(
      "verifyResult"
    );


  const id =
    input?.value
      .trim()
      .toUpperCase();


  if(!id){

    o.innerHTML =
      "<p>Member ID डालें।</p>";

    return;
  }


  const c = await loadSB();

  if(!c){

    o.innerHTML =
      "<p>Database connect नहीं है।</p>";

    return;
  }


  const {
    data,
    error
  } = await c
    .from("members")
    .select(
      "member_id,name,mobile,email,district,role,status,approved_at,photo_url,party_level_text,party_position_text"
    )
    .eq(
      "member_id",
      id
    )
    .maybeSingle();


  if(error){

    o.innerHTML =
      "<p>" +
      safe(error.message) +
      "</p>";

    return;
  }


  if(!data){

    o.innerHTML =
      "<p>Member ID नहीं मिली।</p>";

    return;
  }


  if(data.status !== "approved"){

    o.innerHTML =

      "<div class='about-grid'>" +

      "<article>" +

      "<h3>BJKP सदस्यता आवेदन</h3>" +

      "<p>नाम: " +
      safe(data.name) +
      "</p>" +

      "<p>स्थिति: " +
      safe(data.status) +
      "</p>" +

      "<p>" +
      "Admin approval के बाद Digital ID जारी होगी।" +
      "</p>" +

      "</article>" +

      "</div>";

    return;
  }


  showDigitalCard(data);

}


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function adminLogin(){

  const c =
    await loadSB();


  const email =
    document
      .getElementById(
        "adminEmail"
      )
      ?.value
      .trim();


  const password =
    document
      .getElementById(
        "adminPassword"
      )
      ?.value;


  const msg =
    document
      .getElementById(
        "loginMsg"
      );


  if(!c){

    if(msg)
      msg.textContent =
        "Supabase connect नहीं है।";

    return;
  }


  if(!email || !password){

    if(msg)
      msg.textContent =
        "Email और Password डालें।";

    return;
  }


  if(msg)
    msg.textContent =
      "Login हो रहा है...";


  const {
    error
  } = await c.auth.signInWithPassword({

    email:email,

    password:password

  });


  if(error){

    if(msg)
      msg.textContent =
        "Login failed: " +
        error.message;

    return;
  }


  document
    .getElementById(
      "loginBox"
    )
    ?.setAttribute(
      "hidden",
      ""
    );


  document
    .getElementById(
      "dashboard"
    )
    ?.removeAttribute(
      "hidden"
    );


  loadMembers();

}


/* =========================================================
   ADMIN LOGOUT
========================================================= */

async function adminLogout(){

  const c =
    await loadSB();

  if(c)
    await c.auth.signOut();

  location.reload();

}


/* =========================================================
   PARTY LEVELS + POSITIONS
========================================================= */

const PARTY_POSITIONS = {

  "राष्ट्रीय स्तर":[

    "राष्ट्रीय अध्यक्ष",

    "कार्यकारी राष्ट्रीय अध्यक्ष",

    "राष्ट्रीय उपाध्यक्ष",

    "राष्ट्रीय महासचिव",

    "राष्ट्रीय सचिव",

    "राष्ट्रीय कोषाध्यक्ष",

    "राष्ट्रीय संगठन महासचिव",

    "राष्ट्रीय प्रवक्ता",

    "राष्ट्रीय कार्यकारिणी सदस्य"

  ],


  "प्रदेश स्तर":[

    "प्रदेश अध्यक्ष",

    "कार्यकारी प्रदेश अध्यक्ष",

    "प्रदेश उपाध्यक्ष",

    "प्रदेश महासचिव",

    "प्रदेश सचिव",

    "प्रदेश कोषाध्यक्ष",

    "प्रदेश संगठन महासचिव",

    "प्रदेश प्रवक्ता",

    "प्रदेश कार्यकारिणी सदस्य"

  ],


  "मंडल स्तर":[

    "मंडल अध्यक्ष",

    "मंडल उपाध्यक्ष",

    "मंडल महासचिव",

    "मंडल सचिव",

    "मंडल कोषाध्यक्ष",

    "मंडल संगठन मंत्री",

    "मंडल प्रवक्ता",

    "मंडल कार्यकारिणी सदस्य"

  ],


  "जिला स्तर":[

    "जिलाध्यक्ष",

    "जिला उपाध्यक्ष",

    "जिला महासचिव",

    "जिला सचिव",

    "जिला कोषाध्यक्ष",

    "जिला संगठन मंत्री",

    "जिला प्रवक्ता",

    "जिला कार्यकारिणी सदस्य"

  ],


  "तहसील/ब्लॉक स्तर":[

    "तहसील अध्यक्ष",

    "ब्लॉक अध्यक्ष",

    "तहसील उपाध्यक्ष",

    "ब्लॉक उपाध्यक्ष",

    "तहसील महासचिव",

    "ब्लॉक महासचिव",

    "तहसील सचिव",

    "ब्लॉक सचिव",

    "तहसील संगठन मंत्री",

    "ब्लॉक संगठन मंत्री",

    "कार्यकारिणी सदस्य"

  ],


  "ग्राम/वार्ड स्तर":[

    "ग्राम अध्यक्ष",

    "वार्ड अध्यक्ष",

    "ग्राम उपाध्यक्ष",

    "वार्ड उपाध्यक्ष",

    "ग्राम सचिव",

    "वार्ड सचिव",

    "ग्राम संगठन मंत्री",

    "वार्ड संगठन मंत्री",

    "कार्यकारिणी सदस्य"

  ]

};


/* =========================================================
   CREATE LEVEL SELECT
========================================================= */

function createLevelSelect(id){

  let html =
    '<select id="level-' +
    safe(id) +
    '" onchange="updatePositionOptions(\'' +
    safe(id) +
    '\')">';

  html +=
    '<option value="">स्तर चुनें</option>';


  Object.keys(
    PARTY_POSITIONS
  ).forEach(function(level){

    html +=
      '<option value="' +
      safe(level) +
      '">' +
      safe(level) +
      '</option>';

  });


  html += "</select>";

  return html;

}


/* =========================================================
   CREATE POSITION SELECT
========================================================= */

function createPositionSelect(id){

  return (

    '<select id="position-' +
    safe(id) +
    '">' +

    '<option value="">पहले स्तर चुनें</option>' +

    '</select>'

  );

}


/* =========================================================
   UPDATE POSITION OPTIONS
========================================================= */

function updatePositionOptions(id){

  const levelSelect =
    document.getElementById(
      "level-" + id
    );


  const positionSelect =
    document.getElementById(
      "position-" + id
    );


  if(!levelSelect || !positionSelect)
    return;


  const level =
    levelSelect.value;


  positionSelect.innerHTML =
    '<option value="">पद चुनें</option>';


  if(!level)
    return;


  const positions =
    PARTY_POSITIONS[level] || [];


  positions.forEach(
    function(position){

      const option =
        document.createElement(
          "option"
        );

      option.value =
        position;

      option.textContent =
        position;

      positionSelect.appendChild(
        option
      );

    }
  );

}


/* =========================================================
   LOAD MEMBERS
========================================================= */

async function loadMembers(){

  const c =
    await loadSB();


  if(!c)
    return;


  const {
    data,
    error
  } = await c
    .from("members")
    .select("*")
    .order(
      "created_at",
      {
        ascending:false
      }
    );


  if(error){

    console.error(
      "Members load error:",
      error
    );

    const m =
      document.getElementById(
        "members"
      );

    if(m){

      m.innerHTML =
        "<tr><td colspan='8'>" +
        safe(error.message) +
        "</td></tr>";

    }

    return;
  }


  const rows =
    data || [];


  /* STATS */

  const totalEl =
    document.getElementById(
      "total"
    );

  const pendingEl =
    document.getElementById(
      "pending"
    );

  const approvedEl =
    document.getElementById(
      "approved"
    );


  if(totalEl)
    totalEl.textContent =
      rows.length;


  if(pendingEl)
    pendingEl.textContent =
      rows.filter(
        x => x.status === "pending"
      ).length;


  if(approvedEl)
    approvedEl.textContent =
      rows.filter(
        x => x.status === "approved"
      ).length;


  const m =
    document.getElementById(
      "members"
    );


  if(!m)
    return;


  if(!rows.length){

    m.innerHTML =
      "<tr><td colspan='8'>" +
      "कोई सदस्य आवेदन नहीं है।" +
      "</td></tr>";

    return;
  }


  m.innerHTML =
    rows.map(function(x){

      const id =
        String(x.member_id || "");


      if(x.status === "pending"){

        return (

          "<tr>" +

          "<td>" +
          safe(x.member_id) +
          "</td>" +

          "<td>" +
          safe(x.name) +
          "</td>" +

          "<td>" +
          safe(x.mobile) +
          "</td>" +

          "<td>" +
          safe(x.district) +
          "</td>" +

          "<td>" +
          safe(x.status) +
          "</td>" +

          "<td>" +

            '<div class="position-box">' +

              createLevelSelect(id) +

              '<div class="position-info">' +
              "सदस्य के लिए स्तर चुनें" +
              "</div>" +

            "</div>" +

          "</td>" +

          "<td>" +

            '<div class="position-box">' +

              createPositionSelect(id) +

            "</div>" +

          "</td>" +

          "<td>" +

            '<button class="approve-btn" ' +
            'onclick="approveMember(\'' +
            safe(id) +
            '\')">' +

            "✓ Approve" +

            "</button> " +

            '<button class="reject-btn" ' +
            'onclick="rejectMember(\'' +
            safe(id) +
            '\')">' +

            "✕ Reject" +

            "</button>" +

          "</td>" +

          "</tr>"

        );

      }


      return (

        "<tr>" +

        "<td>" +
        safe(x.member_id) +
        "</td>" +

        "<td>" +
        safe(x.name) +
        "</td>" +

        "<td>" +
        safe(x.mobile) +
        "</td>" +

        "<td>" +
        safe(x.district) +
        "</td>" +

        "<td>" +
        safe(x.status) +
        "</td>" +

        "<td>" +
        safe(x.party_level_text || "-") +
        "</td>" +

        "<td>" +
        safe(x.party_position_text || "-") +
        "</td>" +

        "<td>—</td>" +

        "</tr>"

      );

    }).join("");

}


/* =========================================================
   APPROVE MEMBER WITH POSITION
========================================================= */

async function approveMember(id){

  const levelSelect =
    document.getElementById(
      "level-" + id
    );


  const positionSelect =
    document.getElementById(
      "position-" + id
    );


  if(!levelSelect){

    alert(
      "पार्टी स्तर का चयन नहीं मिला।"
    );

    return;
  }


  const level =
    levelSelect.value;


  const position =
    positionSelect?.value;


  if(!level){

    alert(
      "पहले पार्टी स्तर चुनें।"
    );

    levelSelect.focus();

    return;
  }


  if(!position){

    alert(
      "पहले पद चुनें।"
    );

    positionSelect?.focus();

    return;
  }


  const confirmText =

    "क्या आप इस सदस्य को\n\n" +

    "स्तर: " +
    level +
    "\n" +

    "पद: " +
    position +
    "\n\n" +

    "के साथ APPROVE करना चाहते हैं?";


  if(!confirm(confirmText))
    return;


  const c =
    await loadSB();


  if(!c)
    return;


  const {
    error
  } = await c
    .from("members")
    .update({

      status:"approved",

      party_level_text:
        level,

      party_position_text:
        position,

      approved_at:
        new Date().toISOString()

    })
    .eq(
      "member_id",
      id
    );


  if(error){

    alert(
      "Approval failed:\n" +
      error.message
    );

    return;
  }


  alert(
    "सदस्य सफलतापूर्वक Approved हो गया।\n\n" +
    "पद: " +
    position
  );


  await loadMembers();

}


/* =========================================================
   REJECT MEMBER
========================================================= */

async function rejectMember(id){

  if(
    !confirm(
      "क्या आप इस सदस्य के आवेदन को Reject करना चाहते हैं?"
    )
  ){

    return;

  }


  const c =
    await loadSB();


  if(!c)
    return;


  const {
    error
  } = await c
    .from("members")
    .update({

      status:"rejected",

      party_level_text:null,

      party_position_text:null,

      approved_at:null

    })
    .eq(
      "member_id",
      id
    );


  if(error){

    alert(
      "Reject failed:\n" +
      error.message
    );

    return;
  }


  alert(
    "सदस्य का आवेदन Reject कर दिया गया।"
  );


  await loadMembers();

}


/* =========================================================
   AUTO VERIFY
========================================================= */

function autoVerifyFromURL(){

  const id =
    new URLSearchParams(
      location.search
    ).get("verify");


  if(id){

    const input =
      document.getElementById(
        "verifyId"
      );


    if(input){

      input.value =
        id;

      setTimeout(
        verifyMember,
        400
      );

    }

  }

}


/* =========================================================
   PAGE START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function(){

    const f =
      document.getElementById(
        "memberForm"
      );


    if(f){

      f.addEventListener(
        "submit",
        submitMembership
      );

    }


    autoVerifyFromURL();


    /* ADMIN PAGE */

    const dashboard =
      document.getElementById(
        "dashboard"
      );


    const loginBox =
      document.getElementById(
        "loginBox"
      );


    if(
      dashboard &&
      loginBox
    ){

      const c =
        await loadSB();


      if(!c)
        return;


      const {
        data
      } =
        await c.auth.getSession();


      if(data?.session){

        loginBox.setAttribute(
          "hidden",
          ""
        );

        dashboard.removeAttribute(
          "hidden"
        );

        loadMembers();

      }

    }

  }
);
