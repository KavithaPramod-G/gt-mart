# EAS build profiles ↔ Supabase environments
#
# | eas.json profile | Git branch   | Supabase env file        |
# |------------------|--------------|--------------------------|
# | preview          | develop      | staging.env (dev project)|
# | production       | master       | production.env (live)    |
#
# After creating dev Supabase: fill staging.env, then copy EXPO_PUBLIC_* into preview below.
