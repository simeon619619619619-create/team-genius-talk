-- Insert scraped fashion brands
DO $$
DECLARE
  nid uuid;
BEGIN
  SELECT id INTO nid FROM business_niches WHERE name = 'Мода и облекло';
  IF nid IS NULL THEN RAISE EXCEPTION 'Niche not found'; END IF;

  INSERT INTO business_directory (niche_id, company_name, website, email, phone, instagram, facebook, city, country, description, tags, source, verified) VALUES
    (nid, 'Teadore P.', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Български бранд за ръчно изработени дрехи с минималистичен стил', ARRAY['дизайнерски','ръчна изработка'], 'web_scrape', false),
    (nid, 'Bloomstars', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Качествени памучни тениски с нежни послания', ARRAY['тениски','памук'], 'web_scrape', false),
    (nid, 'They ARE', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Естетично красиви дрехи подчертаващи женската фигура', ARRAY['дамски','дизайнерски'], 'web_scrape', false),
    (nid, 'Make a Point', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Персонализирани чанти и раници', ARRAY['чанти','аксесоари'], 'web_scrape', false),
    (nid, 'Lilian Edwards', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Цветни ръчно изработени дрехи', ARRAY['ръчна изработка'], 'web_scrape', false),
    (nid, 'Double Hope', NULL, NULL, NULL, '@db.hope', NULL, 'София', 'България', 'Тениски с послания', ARRAY['тениски'], 'web_scrape', false),
    (nid, 'PARAMIDONNA', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Премиум бански', ARRAY['бански','премиум'], 'web_scrape', false),
    (nid, 'KNAPP', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Артистични дрехи с умели шарки', ARRAY['артистични','streetwear'], 'web_scrape', false),
    (nid, 'Fold Your Mind', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Ръчно изработени тениски минималистичен стил', ARRAY['тениски','минимализъм'], 'web_scrape', false),
    (nid, 'Maison Tina', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Елегантност от миналото в модерни стилове', ARRAY['елегантен','женствен'], 'web_scrape', false),
    (nid, 'Love by Iris', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Произведен в България с европейски материали', ARRAY['made in BG'], 'web_scrape', false),
    (nid, '05 Studio', NULL, NULL, NULL, '@05.studio', NULL, 'София', 'България', 'Минималистично бельо и бански', ARRAY['бельо','бански'], 'web_scrape', false),
    (nid, 'Zornitsa Baeva', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Висша мода вдъхновена от фолклор', ARRAY['висша мода','фолклор'], 'web_scrape', false),
    (nid, 'Denina Martin Collection', 'https://shop.deninamartin.com/bg/', NULL, NULL, NULL, NULL, 'София', 'България', 'Модна линия на блогърка с класически дизайни', ARRAY['блогър','класически'], 'web_scrape', false),
    (nid, 'SIM K Denimwear', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Бутикови модели от рециклиран деним', ARRAY['деним','устойчива мода'], 'web_scrape', false),
    (nid, 'MagdalenaAlex', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Дизайнерски бранд с бохо дух', ARRAY['бохо','естествени материи'], 'web_scrape', false),
    (nid, 'BENMODEL', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Модна колекция с разнообразие', ARRAY['колекции'], 'web_scrape', false),
    (nid, 'Follow Me', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Еко авангардни дамски дрехи от лен', ARRAY['еко','лен'], 'web_scrape', false),
    (nid, 'Linen Fairy Tales', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Устойчиви ленени дрехи за модерни жени', ARRAY['лен','устойчива мода'], 'web_scrape', false),
    (nid, 'Bakka Organica', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Устойчиво бельо от натурален коноп', ARRAY['коноп','бельо','еко'], 'web_scrape', false),
    (nid, 'TEODOR', 'https://teodor.bg', NULL, NULL, NULL, NULL, 'София', 'България', 'Мъжка мода от 1989 - костюми и ризи', ARRAY['мъжка мода','костюми'], 'web_scrape', false),
    (nid, '45 Str.', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Независим streetwear бранд от 2012', ARRAY['streetwear'], 'web_scrape', false),
    (nid, 'WE YONIC', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Фолклорни елементи в съвременен streetwear', ARRAY['streetwear','фолклор'], 'web_scrape', false),
    (nid, 'Mellini', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Бутик за бизнес жени с италиански платове', ARRAY['бизнес','бутик'], 'web_scrape', false),
    (nid, 'Mon Cher', 'https://mon-cher.eu', NULL, NULL, NULL, 'https://facebook.com/MonCherbyCB', 'София', 'България', 'Премиум бутик за дамски дрехи', ARRAY['премиум','бутик'], 'web_scrape', false),
    (nid, 'Avenew', 'https://avenew.bg', 'office@radekscollection.com', '+359 884 82 28 58', '@radekscollection', NULL, 'Стара Загора', 'България', 'Mid-market дамски дрехи', ARRAY['mid-market','дамски'], 'web_scrape', false),
    (nid, 'NL4YOU', 'https://nlforyou.bg', NULL, NULL, NULL, NULL, 'София', 'България', 'Луксозно бельо бански облекло', ARRAY['луксозен','бельо'], 'web_scrape', false),
    (nid, 'Saint Marten', 'https://saintmarten.com', NULL, NULL, NULL, NULL, 'София', 'България', 'Еко премиум дрехи и аксесоари', ARRAY['еко','премиум'], 'web_scrape', false),
    (nid, 'DAYTONA', 'https://daytona.bg', NULL, NULL, NULL, NULL, 'София', 'България', 'Онлайн магазин за модни дрехи 30+ години', ARRAY['онлайн','30+ години'], 'web_scrape', false),
    (nid, 'Ephos', 'https://ephos-bg.com', NULL, NULL, NULL, NULL, 'София', 'България', 'Уникални дамски дрехи онлайн', ARRAY['уникални','дамски'], 'web_scrape', false),
    (nid, 'Vanya Fashion', 'https://vanyafashion.eu', NULL, NULL, NULL, NULL, 'София', 'България', 'Богат асортимент дамски модели', ARRAY['онлайн','дамски'], 'web_scrape', false),
    (nid, 'INDIGO Fashion', NULL, NULL, NULL, '@indigo.bg', NULL, 'София', 'България', 'Модна марка с активно Instagram присъствие', ARRAY['Instagram','мода'], 'web_scrape', false),
    (nid, 'Bimini', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Български бранд за дрехи', ARRAY['casual'], 'web_scrape', false),
    (nid, 'Aristo Fashion', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Българска модна марка', ARRAY['мода'], 'web_scrape', false),
    (nid, 'Fashion Studio Daicheli', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Модно студио за дизайнерски дрехи', ARRAY['студио','дизайнерски'], 'web_scrape', false),
    (nid, 'Mirella Bratova', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Българска модна дизайнерка', ARRAY['дизайнер'], 'web_scrape', false),
    (nid, 'Miss Match', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Българска модна марка', ARRAY['мода'], 'web_scrape', false),
    (nid, 'Romantica Fashion', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Романтична мода', ARRAY['романтичен','дамски'], 'web_scrape', false),
    (nid, 'VЯRA by MUSE SHOP', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Платформа обединяваща 100+ български дизайнери', ARRAY['платформа','мултибранд'], 'web_scrape', false),
    (nid, 'Chef-Doeuvre', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Премиум шалове с артистични дизайни', ARRAY['шалове','аксесоари'], 'web_scrape', false),
    (nid, 'Beti Bones Lingerie', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Ръчно дизайнирано бельо', ARRAY['бельо','ръчна изработка'], 'web_scrape', false),
    (nid, 'Kragche', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Качествени бели тениски с минималистични детайли', ARRAY['тениски','минимализъм'], 'web_scrape', false),
    (nid, 'Diadema BG', NULL, NULL, NULL, NULL, NULL, 'София', 'България', 'Висококачествени тиари и диадеми', ARRAY['аксесоари','тиари'], 'web_scrape', false)
  ON CONFLICT DO NOTHING;
END $$;
