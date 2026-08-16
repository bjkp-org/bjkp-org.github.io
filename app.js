let sb = null;


/* ================================
   SUPABASE CONNECTION
================================ */

async function loadSB(){

  if(sb) return sb;

  if(typeof supabase === "undefined"){
    return null;
  }

  if(
    typeof SUPABASE_URL === "undefined" ||
    typeof SUPABASE_ANON_KEY === "undefined"
  ){
    return null;
  }

  sb = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return sb;
}


/* ================================
   SECURITY / HTML SAFE
================================ */

function safe(v){

  return String(v ?? "-").replace(
    /[&<>"]/g,
    m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;"
    }[m])
  );

}


/* ================================
   MEMBER ID
================================ */

function makeId(){

  return "BJKP-" +
    Math.random()
      .toString(36)
      .slice(2,8)
      .toUpperCase();

}


/* ================================
   MEMBER PHOTO UPLOAD
================================ */

async function uploadMemberPhoto(file,id){

  const c = await loadSB();

  if(!c){
    throw Error("Supabase connect नहीं है।");
  }

  if(
    !file ||
    !file.type.startsWith("image/")
  ){
    throw Error("कृपया फोटो चुनें।");
  }

  if(file.size > 5242880){

    throw Error(
      "फोटो 5 MB से छोटी होनी चाहिए।"
    );

  }

  const ext =
    (
      file.name
        .split(".")
        .pop() || "jpg"
    )
    .replace(/[^a-z0-9]/gi,"")
    .toLowerCase() || "jpg";


  const path =
    id +
    "/" +
    Date.now() +
    "." +
    ext;


  const {error} =
    await c.storage
      .from("member-photos")
      .upload(
        path,
        file,
        {
          upsert:false,
          contentType:file.type
        }
      );


  if(error){

    throw Error(
      "फोटो upload नहीं हुई: " +
      error.message
    );

  }


  return c.storage
    .from("member-photos")
    .getPublicUrl(path)
    .data
    .publicUrl;

}


/* ================================
   MEMBERSHIP APPLICATION
================================ */

async function submitMembership(e){

  e.preventDefault();


  const f =
    new FormData(e.target);

  const r =
    document.getElementById("result");

  const id =
    makeId();

  const photo =
    f.get("photo");


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

    status:
      "pending",

    photo_url:
      null

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


  const c =
    await loadSB();


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


    const {error} =
      await c
        .from("members")
        .insert([d]);


    if(error){

      throw Error(
        error.message
      );

    }


    e.target.reset();


    const preview =
      document.getElementById(
        "photoPreview"
      );


    if(preview){

      preview.hidden = true;

    }


    r.innerHTML =
      "<div class='about-grid'>" +
      "<article>" +
      "<h3>आवेदन सफल!</h3>" +
      "<p>Application ID: <b>" +
      safe(id) +
      "</b></p>" +
      "<p>Admin approval के बाद Digital ID जारी होगी।</p>" +
      "</article>" +
      "</div>";


  }catch(x){

    r.innerHTML =
      "<p>" +
      safe(x.message) +
      "</p>";

  }

}


/* ================================
   DIGITAL MEMBER CARD
================================ */

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
          ?
          '<img src="' +
          safe(p) +
          '">'
          :
          "फोटो उपलब्ध नहीं"
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
        safe(
          d.party_level_text || "—"
        ) +
        '</b>' +
        '</p>' +


        '<p>' +
        '<span>पद</span>' +
        '<b>' +
        safe(
          d.party_position_text || "—"
        ) +
        '</b>' +
        '</p>' +


        '<p>' +
        '<span>स्थिति</span>' +
        '<b>✓ APPROVED</b>' +
        '</p>' +

      '</div>' +


      '<div id="memberQRCode"></div>' +

    '</div>';


  if(
    typeof QRCode !== "undefined"
  ){

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


/* ================================
   MEMBER VERIFICATION
================================ */

async function verifyMember(){

  const id =
    document
      .getElementById(
        "verifyId"
      )
      ?.value
      .trim()
      .toUpperCase();


  const o =
    document.getElementById(
      "verifyResult"
    );


  if(!id){

    o.innerHTML =
      "<p>Member ID डालें।</p>";

    return;

  }


  const c =
    await loadSB();


  if(!c){

    o.innerHTML =
      "<p>Database connect नहीं है।</p>";

    return;

  }


  const {
    data,
    error
  } =
    await c
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


  if(
    data.status !==
    "approved"
  ){

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
      "<p>Admin approval के बाद Digital ID जारी होगी।</p>" +
      "</article>" +
      "</div>";

    return;

  }


  showDigitalCard(data);

}


/* ================================
   ADMIN LOGIN
================================ */

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
    document.getElementById(
      "loginMsg"
    );


  if(!c){

    if(msg)
      msg.textContent =
        "Supabase config नहीं मिली।";

    return;

  }


  if(msg)
    msg.textContent =
      "Login हो रहा है...";


  const {error} =
    await c.auth.signInWithPassword({

      email,
      password

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


/* ================================
   ADMIN LOGOUT
================================ */

async function adminLogout(){

  const c =
    await loadSB();


  if(c)
    await c.auth.signOut();


  location.reload();

}


/* ================================
   PARTY LEVELS
================================ */

const PARTY_LEVELS = [

  "राष्ट्रीय स्तर",

  "प्रदेश स्तर",

  "मंडल/नगर स्तर",

  "जिला स्तर",

  "ब्लॉक स्तर",

  "ग्राम/वार्ड स्तर"

];


/* ================================
   PARTY POSITIONS
================================ */

const PARTY_POSITIONS = {

  "राष्ट्रीय स्तर":[

    "राष्ट्रीय अध्यक्ष",
    "राष्ट्रीय कार्यकारी अध्यक्ष",
    "राष्ट्रीय उपाध्यक्ष",
    "राष्ट्रीय महासचिव",
    "राष्ट्रीय सचिव",
    "राष्ट्रीय कोषाध्यक्ष",
    "राष्ट्रीय संगठन महासचिव",
    "राष्ट्रीय प्रवक्ता",
    "राष्ट्रीय मीडिया प्रभारी",
    "राष्ट्रीय आईटी/सोशल मीडिया प्रभारी",
    "राष्ट्रीय कार्यकारिणी सदस्य"

  ],


  "प्रदेश स्तर":[

    "प्रदेश अध्यक्ष",
    "प्रदेश कार्यकारी अध्यक्ष",
    "प्रदेश उपाध्यक्ष",
    "प्रदेश महासचिव",
    "प्रदेश सचिव",
    "प्रदेश कोषाध्यक्ष",
    "प्रदेश संगठन महासचिव",
    "प्रदेश प्रवक्ता",
    "प्रदेश मीडिया प्रभारी",
    "प्रदेश आईटी/सोशल मीडिया प्रभारी",
    "प्रदेश कार्यकारिणी सदस्य"

  ],


  "मंडल/नगर स्तर":[

    "मंडल/नगर अध्यक्ष",
    "मंडल/नगर उपाध्यक्ष",
    "मंडल/नगर महासचिव",
    "मंडल/नगर सचिव",
    "मंडल/नगर कोषाध्यक्ष",
    "मंडल/नगर प्रवक्ता",
    "मंडल/नगर कार्यकारिणी सदस्य"

  ],


  "जिला स्तर":[

    "जिला अध्यक्ष",
    "जिला कार्यकारी अध्यक्ष",
    "जिला उपाध्यक्ष",
    "जिला महासचिव",
    "जिला सचिव",
    "जिला कोषाध्यक्ष",
    "जिला संगठन महासचिव",
    "जिला प्रवक्ता",
    "जिला मीडिया प्रभारी",
    "जिला आईटी/सोशल मीडिया प्रभारी",
    "जिला कार्यकारिणी सदस्य"

  ],


  "ब्लॉक स्तर":[

    "ब्लॉक अध्यक्ष",
    "ब्लॉक उपाध्यक्ष",
    "ब्लॉक महासचिव",
    "ब्लॉक सचिव",
    "ब्लॉक कोषाध्यक्ष",
    "ब्लॉक कार्यकारिणी सदस्य"

  ],


  "ग्राम/वार्ड स्तर":[

    "ग्राम/वार्ड अध्यक्ष",
    "ग्राम/वार्ड उपाध्यक्ष",
    "ग्राम/वार्ड महासचिव",
    "ग्राम/वार्ड सचिव",
    "ग्राम/वार्ड कोषाध्यक्ष",
    "ग्राम/वार्ड कार्यकारिणी सदस्य"

  ]

};


/* ================================
   APPROVAL UI
================================ */

function partyLevelOptions(){

  return (

    '<option value="">पार्टी स्तर चुनें</option>' +

    PARTY_LEVELS
      .map(
        x =>
          '<option value="' +
          safe(x) +
          '">' +
          safe(x) +
          '</option>'
      )
      .join("")

  );

}


function positionOptions(level){

  const list =
    PARTY_POSITIONS[level] ||
    [
      "सामान्य सदस्य",
      "स्वयंसेवक"
    ];


  return (

    '<option value="">पद चुनें</option>' +

    list
      .map(
        x =>
          '<option value="' +
          safe(x) +
          '">' +
          safe(x) +
          '</option>'
      )
      .join("")

  );

}


/* ================================
   OPEN APPROVAL
================================ */

function approveMember(id){

  const box =
    document.getElementById(
      "approveBox-" + id
    );


  if(box)
    box.hidden = false;

}


/* ================================
   CLOSE APPROVAL
================================ */

function cancelApprove(id){

  const box =
    document.getElementById(
      "approveBox-" + id
    );


  if(box)
    box.hidden = true;

}


/* ================================
   CHANGE LEVEL
================================ */

function changePartyLevel(id){

  const level =
    document.getElementById(
      "level-" + id
    );


  const position =
    document.getElementById(
      "position-" + id
    );


  if(!level || !position)
    return;


  position.innerHTML =
    positionOptions(
      level.value
    );

}


/* ================================
   FINAL APPROVE
================================ */

async function confirmApprove(id){

  const level =
    document.getElementById(
      "level-" + id
    )?.value;


  const position =
    document.getElementById(
      "position-" + id
    )?.value;


  if(!level){

    alert(
      "पहले पार्टी स्तर चुनें।"
    );

    return;

  }


  if(!position){

    alert(
      "पहले पद चुनें।"
    );

    return;

  }


  const c =
    await loadSB();


  if(!c)
    return;


  const {
    error
  } =
    await c
      .from("members")
      .update({

        status:
          "approved",

        approved_at:
          new Date().toISOString(),

        party_level_text:
          level,

        party_position_text:
          position

      })
      .eq(
        "member_id",
        id
      );


  if(error){

    alert(
      "Approval failed: " +
      error.message
    );

    return;

  }


  alert(
    "✅ सदस्य Approved\n\n" +
    "पार्टी स्तर: " +
    level +
    "\nपद: " +
    position
  );


  loadMembers();

}


/* ================================
   REJECT
================================ */

async function rejectMember(id){

  if(
    !confirm(
      "क्या आप इस आवेदन को Reject करना चाहते हैं?"
    )
  )
    return;


  const c =
    await loadSB();


  if(!c)
    return;


  const {
    error
  } =
    await c
      .from("members")
      .update({

        status:
          "rejected",

        approved_at:
          null

      })
      .eq(
        "member_id",
        id
      );


  if(error){

    alert(
      error.message
    );

    return;

  }


  loadMembers();

}


/* ================================
   LOAD MEMBERS
================================ */

async function loadMembers(){

  const c =
    await loadSB();


  if(!c)
    return;


  const {
    data,
    error
  } =
    await c
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
      error
    );

    return;

  }


  const rows =
    data || [];


  const total =
    document.getElementById(
      "total"
    );


  const pending =
    document.getElementById(
      "pending"
    );


  const approved =
    document.getElementById(
      "approved"
    );


  if(total)
    total.textContent =
      rows.length;


  if(pending)
    pending.textContent =
      rows.filter(
        x =>
          x.status ===
          "pending"
      ).length;


  if(approved)
    approved.textContent =
      rows.filter(
        x =>
          x.status ===
          "approved"
      ).length;


  const m =
    document.getElementById(
      "members"
    );


  if(!m)
    return;


  m.innerHTML =
    rows
      .map(x => {

        const position =
          x.party_position_text ||
          "—";


        const level =
          x.party_level_text ||
          "—";


        let action = "—";


        if(
          x.status ===
          "pending"
        ){

          action =

            '<button class="btn" ' +
            'onclick="approveMember(\'' +
            safe(x.member_id) +
            '\')">' +
            'Approve' +
            '</button> ' +

            '<button class="btn red" ' +
            'onclick="rejectMember(\'' +
            safe(x.member_id) +
            '\')">' +
            'Reject' +
            '</button>' +

            '<div id="approveBox-' +
            safe(x.member_id) +
            '" hidden ' +
            'style="margin-top:10px;padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;">' +

              '<b>सदस्य को पद दें</b>' +

              '<select id="level-' +
              safe(x.member_id) +
              '" ' +
              'onchange="changePartyLevel(\'' +
              safe(x.member_id) +
              '\')" ' +
              'style="display:block;width:100%;margin:8px 0;padding:10px;">' +

                partyLevelOptions() +

              '</select>' +

              '<select id="position-' +
              safe(x.member_id) +
              '" ' +
              'style="display:block;width:100%;margin:8px 0;padding:10px;">' +

                '<option value="">पहले पार्टी स्तर चुनें</option>' +

              '</select>' +

              '<button class="btn red" ' +
              'onclick="confirmApprove(\'' +
              safe(x.member_id) +
              '\')">' +
              '✓ Final Approve' +
              '</button> ' +

              '<button class="btn" ' +
              'onclick="cancelApprove(\'' +
              safe(x.member_id) +
              '\')">' +
              'Cancel' +
              '</button>' +

            '</div>';

        }


        return (

          '<tr>' +

            '<td>' +
            safe(x.member_id) +
            '</td>' +

            '<td>' +
            safe(x.name) +
            '</td>' +

            '<td>' +
            safe(x.mobile) +
            '</td>' +

            '<td>' +
            safe(x.district) +
            '</td>' +

            '<td>' +
            safe(x.status) +
            '</td>' +

            '<td>' +
            safe(level) +
            '</td>' +

            '<td>' +
            safe(position) +
            '</td>' +

            '<td>' +
            action +
            '</td>' +

          '</tr>'

        );

      })
      .join("");

}


/* ================================
   AUTO VERIFY
================================ */

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


/* ================================
   PAGE LOAD
================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

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


    loadSB().then(
      async c => {

        if(!c)
          return;


        const {
          data
        } =
          await c.auth.getSession();


        if(
          data?.session
        ){

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

      }
    );

  }
);
