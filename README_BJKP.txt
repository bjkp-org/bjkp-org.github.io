BJKP updated script.js

इस ZIP में नया script.js है। यह:
1. फोन की Gallery/File picker से फोटो चुनता है।
2. फोटो को Supabase Storage के member-photos bucket में upload करता है।
3. फोटो का public URL members.photo_url में save करता है।
4. Approved Member Verify करने पर ID Card में वही फोटो दिखाता है।

जरूरी:
- Bucket का नाम: member-photos
- members table में photo_url column पहले से मौजूद होना चाहिए।
- index.html में photo input का id="memberPhoto" और name="photo" होना चाहिए।
- Storage policies upload और public/select के लिए काम करनी चाहिए।
