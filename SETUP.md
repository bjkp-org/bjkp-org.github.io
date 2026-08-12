# BJKP Live System Setup

## 1. Supabase
Supabase में नया project बनाएं।
SQL Editor में `schema.sql` पूरा paste करके Run करें।

## 2. Admin account
Supabase Dashboard → Authentication → Users में अपना admin email/password user बनाएं।

## 3. Frontend config
`config.js` में:
SUPABASE_URL = आपके project का Project URL
SUPABASE_ANON_KEY = आपके project का publishable/anon key

**service_role key कभी भी GitHub/frontend में न डालें।**

## 4. Supabase JS library
index.html और admin.html में closing body से पहले यह line जोड़ें:
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
और उसके बाद app.js रखें।

## 5. GitHub
सभी files को अपनी existing GitHub Pages repository में upload/replace करें।
GitHub Pages अपने-आप updated site publish करेगा।

## 6. Result
- Public: index.html → online membership
- Admin: admin.html → login + pending/approved/rejected members
- Approved member: BJKP digital ID / verification
