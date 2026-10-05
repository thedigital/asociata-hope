-- The Romanian descriptions imported from Wix for the about and in memoriam pages were one generic
-- sentence shared by both: each page now has its own (`seo.descriptions`, src/i18n/ui.ts), like the
-- other languages. A description written in the admin since then is a different text and is kept.
UPDATE `page_translations` SET `seo_description` = NULL
WHERE `locale` = 'ro' AND `seo_description` = 'Asociatia pentu protectia animalelor HOPE - Bucuresti - Adoptii caini - Adoptii pisici';
