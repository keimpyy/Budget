-- One-time import for Budget Veenstra.xlsx into the normalized Supabase tables.
-- Update household_key below if your shared household uses a different value.

do $$
declare
  target_household_key text := 'veenstra-household';
begin
  delete from public.budget_items where household_key = target_household_key;
  delete from public.categories where household_key = target_household_key;
  delete from public.income_items where household_key = target_household_key;
  delete from public.loans where household_key = target_household_key;

  insert into public.income_items (id, household_key, name, amount, sort_order)
  values
    ('inc_kt', target_household_key, 'KT', 2950.0, 1),
    ('inc_ryanne', target_household_key, 'Ryanne', 1500.0, 2);

  insert into public.categories (id, household_key, name, sort_order)
  values
    ('cat_woning', target_household_key, 'Woning', 1),
    ('cat_huishouden', target_household_key, 'Huishouden', 2),
    ('cat_auto', target_household_key, 'Auto', 3),
    ('cat_telefoon', target_household_key, 'Telefoon', 4),
    ('cat_streaming', target_household_key, 'Streaming', 5),
    ('cat_zorgverzekering', target_household_key, 'Zorgverzekering', 6),
    ('cat_leningen', target_household_key, 'Leningen', 7),
    ('cat_1775584490457_29996', target_household_key, 'Honden', 8),
    ('cat_overige_uitgaven', target_household_key, 'Overige uitgaven', 9);

  insert into public.budget_items (id, household_key, category_id, name, amount, sort_order)
  values
    ('bud_woning_vitens', target_household_key, 'cat_woning', 'Vitens', 20.0, 1),
    ('bud_woning_assudeuren', target_household_key, 'cat_woning', 'Assudeuren', 55.0, 2),
    ('bud_woning_taf', target_household_key, 'cat_woning', 'TAF', 10.0, 3),
    ('bud_woning_hypotheek', target_household_key, 'cat_woning', 'Florius', 1250.0, 4),
    ('bud_woning_gas_elektra', target_household_key, 'cat_woning', 'GreenChoice', 250.0, 5),
    ('bud_huishouden_boodschappen', target_household_key, 'cat_huishouden', 'Boodschappen', 500.0, 1),
    ('bud_huishouden_wasmiddelen', target_household_key, 'cat_huishouden', 'Wasmiddelen', 35.0, 2),
    ('bud_auto_benzine', target_household_key, 'cat_auto', 'Benzine', 310.0, 1),
    ('bud_auto_peugeot', target_household_key, 'cat_auto', 'Peugeot', 46.0, 2),
    ('bud_auto_cactus', target_household_key, 'cat_auto', 'Cactus', 46.0, 3),
    ('bud_auto_wegenbelasting_1', target_household_key, 'cat_auto', 'Wegenbelasting 1', 31.0, 4),
    ('bud_auto_wegenbelasting_2', target_household_key, 'cat_auto', 'Wegenbelasting 2', 31.0, 5),
    ('bud_telefoon_ryanne_ben', target_household_key, 'cat_telefoon', 'Ryanne (Ben)', 35.0, 1),
    ('bud_telefoon_kt_youfone', target_household_key, 'cat_telefoon', 'KT (Youfone)', 7.5, 2),
    ('bud_streaming_videoland', target_household_key, 'cat_streaming', 'Videoland', 6.0, 1),
    ('bud_streaming_podimo', target_household_key, 'cat_streaming', 'Podimo', 10.0, 2),
    ('bud_streaming_hbo', target_household_key, 'cat_streaming', 'HBO', 5.0, 3),
    ('bud_streaming_prime', target_household_key, 'cat_streaming', 'Prime', 5.0, 4),
    ('bud_zorgverzekering_vgz', target_household_key, 'cat_zorgverzekering', 'VGZ', 250.0, 1),
    ('bud_leningen_auto_leningen', target_household_key, 'cat_leningen', 'Auto leningen', 500.0, 1),
    ('bud_leningen_anko_emmy', target_household_key, 'cat_leningen', 'Anko/Emmy', 150.0, 2),
    ('bud_1775584492841_58135', target_household_key, 'cat_1775584490457_29996', 'Voer', 25.0, 1),
    ('bud_overige_uitgaven_ing_kosten', target_household_key, 'cat_overige_uitgaven', 'ING kosten', 20.0, 1),
    ('bud_overige_uitgaven_gem_bel', target_household_key, 'cat_overige_uitgaven', 'Gemeentelijke bel.', 120.0, 2);

  insert into public.loans (id, household_key, name, total, paid, color, sort_order)
  values
    ('l1', target_household_key, 'Cactus', 2700.0, 750.0, '#7c6af7', 1),
    ('l2', target_household_key, 'Peugeot', 7500.0, 0.0, '#7c6af7', 2);
end $$;
