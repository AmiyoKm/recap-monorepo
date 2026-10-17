# Embed Digest sections, not Activities

Recap stores one vector per Digest section (one Work Identity on one day) in Cloudflare Vectorize, made with Gemini embeddings at 768 dimensions. It does not embed each Activity. The free plan stores 5 million dimensions per account, about 6,500 vectors at 768 dimensions. Activities have no retention limit, so one vector per Activity fills the index in weeks, but Digest sections fill it in years. The reader is a later "ask my history" feature. Embed Activities only when semantic search on the Activity page is a real need.
