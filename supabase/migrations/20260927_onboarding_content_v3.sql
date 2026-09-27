-- Refresh the v3 publisher copy to describe the functional first-run setup.
update public.ai_onboarding_config
set published_content = jsonb_build_object(
  'title_en','Welcome to ElDukkan',
  'title_ar','أهلاً بك في الدكان',
  'intro_en','Set up your language, shopping preferences and store display, then learn the real storefront with an interactive guided tour.',
  'intro_ar','اختار اللغة وتفضيلات التسوق وشكل المتجر، وبعدها اتعلم استخدام الدكان من خلال جولة تفاعلية حقيقية.',
  'steps', jsonb_build_array(
    jsonb_build_object('id','welcome','badge_en','Welcome','badge_ar','أهلاً بك','title_en','Set up your store','title_ar','ظبط متجرك','body_en','Choose the things that make ElDukkan easier to use for you.','body_ar','اختار الحاجات اللي هتخلي استخدام ElDukkan أسهل ليك.'),
    jsonb_build_object('id','language','badge_en','Language','badge_ar','اللغة','title_en','Choose your language','title_ar','اختار لغتك','body_en','Use the storefront in English or Arabic and switch later any time.','body_ar','استخدم المتجر بالعربي أو الإنجليزي وتقدر تغيّرها بعدين.'),
    jsonb_build_object('id','account','badge_en','Account','badge_ar','الحساب','title_en','Keep your shopping together','title_ar','خلّي تسوقك مترتب','body_en','Sign in to keep orders, wishlist and shopping preferences together, or continue as a guest.','body_ar','سجّل دخول عشان تجمع طلباتك والمفضلة والتفضيلات، أو كمّل كضيف.'),
    jsonb_build_object('id','preferences','badge_en','Preferences','badge_ar','التفضيلات','title_en','Tell us how you shop','title_ar','قول لنا بتتسوق إزاي','body_en','Pick categories, a typical budget, shopping style and how much guidance you want.','body_ar','اختار الفئات والميزانية وطريقة التسوق ومستوى الإرشاد اللي يناسبك.'),
    jsonb_build_object('id','appearance','badge_en','Display','badge_ar','الشكل','title_en','Make it comfortable','title_ar','خلّي الشكل مريح','body_en','Choose light or dark mode and Modern or Easy Mode.','body_ar','اختار الوضع الفاتح أو الداكن وشكل المتجر الحديث أو السهل.'),
    jsonb_build_object('id','tour','badge_en','Practice','badge_ar','تدريب','title_en','Use the real storefront','title_ar','استخدم المتجر بجد','body_en','Search, open a product, add to cart, view checkout and meet the assistant yourself.','body_ar','دوّر وافتح منتج وأضفه للسلة وشوف مكان الشراء وتعرف على المساعد بنفسك.'),
    jsonb_build_object('id','ready','badge_en','Ready','badge_ar','جاهز','title_en','Start shopping','title_ar','ابدأ التسوق','body_en','Your setup is complete.','body_ar','الإعداد خلص.')
  )
),
draft_content = jsonb_build_object(
  'title_en','Welcome to ElDukkan',
  'title_ar','أهلاً بك في الدكان',
  'intro_en','Set up your language, shopping preferences and store display, then learn the real storefront with an interactive guided tour.',
  'intro_ar','اختار اللغة وتفضيلات التسوق وشكل المتجر، وبعدها اتعلم استخدام الدكان من خلال جولة تفاعلية حقيقية.',
  'steps', jsonb_build_array()
),
updated_at = now()
where id = true and published_version = 3 and published_content->>'title_en' = 'Welcome to ElDukkan';
