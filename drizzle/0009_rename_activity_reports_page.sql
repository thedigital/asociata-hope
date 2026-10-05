-- The page of the 2024 report becomes the page of the activity reports, one section per year: same
-- row, so the SEO fields written in the admin are kept. `/raport-2024` answers 301 to the new address in
-- every language: rules of the `redirects` table, listed in /admin/redirects.
UPDATE `pages` SET `slug` = 'rapoarte-de-activitate' WHERE `slug` = 'raport-2024';
--> statement-breakpoint
UPDATE `page_translations` SET `title` = 'rapoarte-de-activitate' WHERE `title` = 'raport-2024';
--> statement-breakpoint
INSERT OR IGNORE INTO `redirects` (`from_path`, `to_path`, `status`) VALUES
  ('/raport-2024', '/rapoarte-de-activitate', 301),
  ('/en/raport-2024', '/en/rapoarte-de-activitate', 301),
  ('/fr/raport-2024', '/fr/rapoarte-de-activitate', 301),
  ('/de/raport-2024', '/de/rapoarte-de-activitate', 301);
