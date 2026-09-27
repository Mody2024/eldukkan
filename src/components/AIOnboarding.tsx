import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { ArrowLeft, ArrowRight, Check, CircleUserRound, Eye, Gift, Globe2, Heart, Lightbulb, Loader2, LockKeyhole, Moon, Search, ShoppingBag, Sparkles, Sun, UserRound, X, Zap } from 'lucide-react';

type Stage = 'welcome' | 'language' | 'account' | 'preferences' | 'appearance' | 'tour' | 'ready';
type Preferences = {
  categories: string[];
  budget: 'under_500' | '500_1500' | '1500_3000' | '3000_plus';
  goal: 'specific' | 'browse' | 'compare';
  assistant: 'self' | 'ask' | 'guided';
};
type Config = { enabled: boolean; version: number; titleEn: string; titleAr: string; introEn: string; introAr: string };

const DONE_KEY = 'eldukkan-onboarding-completed-v3';
const PROGRESS_KEY = 'eldukkan-onboarding-progress-v3';
const PREFS_KEY = 'eldukkan-shopping-preferences-v1';
const defaultPreferences: Preferences = { categories: [], budget: '500_1500', goal: 'browse', assistant: 'ask' };

const copy = {
  en: {
    setup: 'First-time setup', welcome: 'Welcome to ElDukkan', welcomeSub: 'Set up the store around the way you actually shop.',
    welcomeBullets: ['Choose your language and reading comfort.', 'Save useful shopping preferences for better recommendations.', 'Take a real interactive tour — you will use the controls yourself.'],
    start: 'Set up my store', skip: 'Skip setup', back: 'Back', continue: 'Continue',
    language: 'Pick your language', languageSub: 'You can change it later from the header.', english: 'English', arabic: 'العربية',
    account: 'Make shopping easier', accountSub: 'An account keeps your orders, wishlist and preferences together. You can still shop as a guest.',
    signedIn: 'Already signed in', signedInAs: 'Signed in as {email}', signIn: 'Sign in', createAccount: 'Create account', guest: 'Continue as guest',
    email: 'Email', password: 'Password', google: 'Continue with Google', signedUp: 'Account created. Check your email if confirmation is required, then continue.',
    preferences: 'Tell us how you shop', preferencesSub: 'These are optional shopping preferences, not sensitive personal data.',
    categories: 'What do you usually shop for?', categoriesHint: 'Pick up to 5', budget: 'Typical budget', under500: 'Under EGP 500',
    b500_1500: 'EGP 500–1,500', b1500_3000: 'EGP 1,500–3,000', b3000Plus: 'EGP 3,000+',
    goal: 'How do you like to shop?', specific: 'I know what I want', specificDesc: 'I usually search for a specific thing.',
    browse: 'I like to browse', browseDesc: 'Show me options and let me explore.', compare: 'Help me compare', compareDesc: 'Help me weigh different options.',
    assistant: 'How should the assistant help?', assistantSelf: 'Only when I ask', assistantAsk: 'Suggest help when useful', assistantGuided: 'Guide me step by step',
    appearance: 'Make the store comfortable', appearanceSub: 'Choose the display now. You can change it any time.', light: 'Light', lightDesc: 'Bright, clean and easy to scan.',
    dark: 'Dark', darkDesc: 'Lower-light interface for darker rooms.', modern: 'Modern', modernDesc: 'Clean marketplace layout.', easy: 'Easy Mode', easyDesc: 'Larger controls and simpler hierarchy.',
    tour: 'Learn the real store', tourSub: 'Not a slideshow. We will highlight the exact control to use next.',
    tourSteps: ['Search', 'Open a product', 'Add to cart', 'Open the cart', 'See checkout', 'Meet the AI assistant'],
    startTour: 'Start interactive tour', skipTour: 'I already know how to use it', tourRunning: 'Follow the highlight',
    ready: 'You are ready to shop', readySub: 'Your choices are saved. The practice item was removed so your original cart stays untouched.', startShopping: 'Start shopping',
    reviewLater: 'You can change these choices later from your account or store controls.', authError: 'Could not complete sign-in right now.',
    saved: 'Preferences saved', noCategories: 'Categories will appear here when the live catalog is available.', loading: 'Preparing your setup…',
    searchExample: 'Search for a real product', originalCart: 'Your original cart will be restored after the practice.',
  },
  ar: {
    setup: 'إعداد أول مرة', welcome: 'أهلاً بك في ElDukkan', welcomeSub: 'خلّينا نضبط المتجر على الطريقة اللي بتحب تتسوق بيها.',
    welcomeBullets: ['اختار اللغة وطريقة العرض المريحة ليك.', 'احفظ تفضيلات تسوق مفيدة عشان الاقتراحات تكون أحسن.', 'اعمل جولة تفاعلية حقيقية — إنت اللي هتستخدم الأدوات بنفسك.'],
    start: 'ابدأ الإعداد', skip: 'تخطي الإعداد', back: 'رجوع', continue: 'متابعة',
    language: 'اختار اللغة', languageSub: 'تقدر تغيّرها بعد كده من رأس المتجر.', english: 'English', arabic: 'العربية',
    account: 'سهّل التسوق الجاي', accountSub: 'الحساب بيجمع طلباتك والمفضلة وتفضيلاتك في مكان واحد. وتقدر تكمل كضيف.',
    signedIn: 'أنت مسجل دخول بالفعل', signedInAs: 'مسجل دخول بـ {email}', signIn: 'تسجيل الدخول', createAccount: 'إنشاء حساب', guest: 'المتابعة كضيف',
    email: 'البريد الإلكتروني', password: 'كلمة المرور', google: 'المتابعة بحساب Google', signedUp: 'اتعمل الحساب. راجع بريدك لو التأكيد مطلوب، وبعدها كمّل.',
    preferences: 'قول لنا بتتسوق إزاي', preferencesSub: 'دي تفضيلات تسوق اختيارية فقط، ومش بيانات شخصية حساسة.',
    categories: 'إيه اللي بتشتريه غالبًا؟', categoriesHint: 'اختار لحد 5', budget: 'ميزانيتك المعتادة', under500: 'أقل من 500 جنيه',
    b500_1500: '500–1,500 جنيه', b1500_3000: '1,500–3,000 جنيه', b3000Plus: '3,000 جنيه أو أكتر',
    goal: 'بتحب تتسوق إزاي؟', specific: 'أنا عارف عايز إيه', specificDesc: 'غالبًا بدور على حاجة معينة.',
    browse: 'بحب أتصفح', browseDesc: 'ورّيني اختيارات وخليّني أستكشف.', compare: 'ساعدني أقارن', compareDesc: 'ساعدني أقارن بين الاختيارات.',
    assistant: 'المساعد يساعدك إزاي؟', assistantSelf: 'لما أطلب منه فقط', assistantAsk: 'يقترح المساعدة لما تكون مفيدة', assistantGuided: 'يوجهني خطوة بخطوة',
    appearance: 'خلّي المتجر مريح ليك', appearanceSub: 'ظبط الشكل دلوقتي، وتقدر تغيّره في أي وقت.', light: 'فاتح', lightDesc: 'مشرق ونظيف وسهل القراءة.',
    dark: 'داكن', darkDesc: 'واجهة أهدى للغرف قليلة الإضاءة.', modern: 'حديث', modernDesc: 'شكل متجر نظيف ومألوف.', easy: 'الوضع السهل', easyDesc: 'أزرار أكبر وترتيب أبسط.',
    tour: 'دلوقتي اتعلم المتجر بجد', tourSub: 'دي مش شرائح كلام. هنحدد لك الأداة اللي تستخدمها بعدها بالظبط.',
    tourSteps: ['البحث', 'افتح منتج', 'أضف للسلة', 'افتح السلة', 'شوف صفحة الشراء', 'تعرّف على المساعد'],
    startTour: 'ابدأ الجولة التفاعلية', skipTour: 'أنا عارف أستخدمه', tourRunning: 'اتبع العلامة',
    ready: 'إنت جاهز للتسوق', readySub: 'اختياراتك اتحفظت. المنتج التجريبي اتشال عشان سلتك الأصلية تفضل زي ما هي.', startShopping: 'ابدأ التسوق',
    reviewLater: 'وتقدر تغيّر الاختيارات دي بعدين من حسابك أو أدوات المتجر.', authError: 'مش قادر أكمل تسجيل الدخول دلوقتي.',
    saved: 'اتحفظت التفضيلات', noCategories: 'الفئات هتظهر هنا لما الكتالوج المباشر يكون متاح.', loading: 'بنجهز الإعداد…',
    searchExample: 'دوّر على منتج حقيقي', originalCart: 'سلتك الأصلية هترجع زي ما كانت بعد التدريب.',
  },
} as const;

function readStage() {
  try {
    const value = localStorage.getItem(PROGRESS_KEY);
    return value && ['welcome','language','account','preferences','appearance','tour','ready'].includes(value) ? value as Stage : null;
  } catch { return null; }
}
function saveStage(stage: Stage) { try { localStorage.setItem(PROGRESS_KEY, stage); } catch {} }
function clearStage() { try { localStorage.removeItem(PROGRESS_KEY); } catch {} }
function cx(...parts: Array<string | false | null | undefined>) { return parts.filter(Boolean).join(' '); }

export default function AIOnboarding() {
  const { userId, userEmail, language, setLanguage, theme, toggleTheme, experience, setExperience, replaceCart, completeOnboarding } = useStore();
  const navigate = useNavigate();
  const [config, setConfig] = useState<Config>({ enabled: true, version: 3, titleEn: copy.en.welcome, titleAr: copy.ar.welcome, introEn: copy.en.welcomeSub, introAr: copy.ar.welcomeSub });
  const [stage, setStage] = useState<Stage>('welcome');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [tourStarted, setTourStarted] = useState(false);
  const [tourProduct, setTourProduct] = useState('');
  const originalCart = useRef(useStore.getState().cart);
  const rtl = language === 'ar';
  const t = copy[language];

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('ai_onboarding_config').select('enabled,published_version,published_content').eq('id', true).maybeSingle();
      const content = data?.published_content && typeof data.published_content === 'object' ? data.published_content as Record<string, unknown> : {};
      setConfig({
        enabled: data?.enabled !== false, version: Math.max(3, Number(data?.published_version || 3)),
        titleEn: String(content.title_en || copy.en.welcome), titleAr: String(content.title_ar || copy.ar.welcome),
        introEn: String(content.intro_en || copy.en.welcomeSub), introAr: String(content.intro_ar || copy.ar.welcomeSub),
      });
      setLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const activeUser = data.session?.user?.id || userId || null;
      if (activeUser) {
        const { data: state } = await supabase.from('ai_user_onboarding').select('completed_version').eq('user_id', activeUser).maybeSingle();
        if (Number(state?.completed_version || 0) >= config.version) { setOpen(false); return; }
      } else {
        try { if (Number(localStorage.getItem(DONE_KEY) || 0) >= config.version) { setOpen(false); return; } } catch {}
      }
      setStage(readStage() || 'welcome');
      setOpen(config.enabled);
    };
    if (!loading) void init();
  }, [loading, config.enabled, config.version, userId]);

  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase.from('products').select('category').eq('is_active', true).not('category', 'is', null).limit(120);
      setCategories(Array.from(new Set((data ?? []).map((row) => String(row.category || '').trim()).filter(Boolean))).slice(0, 18));
    };
    void loadCategories();
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const value = JSON.parse(saved) as Partial<Preferences>;
        setPreferences({
          categories: Array.isArray(value.categories) ? value.categories.slice(0, 5) : [],
          budget: value.budget && ['under_500','500_1500','1500_3000','3000_plus'].includes(value.budget) ? value.budget : defaultPreferences.budget,
          goal: value.goal && ['specific','browse','compare'].includes(value.goal) ? value.goal : defaultPreferences.goal,
          assistant: value.assistant && ['self','ask','guided'].includes(value.assistant) ? value.assistant : defaultPreferences.assistant,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const replay = () => {
      replaceCart(originalCart.current); setTourStarted(false); setStage('tour'); setOpen(true); saveStage('tour'); navigate('/');
    };
    window.addEventListener('eldukkan:replay-onboarding', replay);
    return () => window.removeEventListener('eldukkan:replay-onboarding', replay);
  }, [navigate, replaceCart]);

  useEffect(() => {
    const complete = () => {
      if (!tourStarted) return;
      setTourStarted(false); replaceCart(originalCart.current); window.dispatchEvent(new Event('eldukkan:close-ai'));
      setStage('ready'); setOpen(true); saveStage('ready');
    };
    const stop = () => {
      if (!tourStarted) return;
      setTourStarted(false); replaceCart(originalCart.current); window.dispatchEvent(new Event('eldukkan:close-ai'));
      setStage('tour'); setOpen(true); saveStage('tour');
    };
    window.addEventListener('eldukkan:guided-complete', complete);
    window.addEventListener('eldukkan:guided-stop', stop);
    return () => { window.removeEventListener('eldukkan:guided-complete', complete); window.removeEventListener('eldukkan:guided-stop', stop); };
  }, [tourStarted, replaceCart]);

  const go = (next: Stage) => { setStage(next); saveStage(next); };
  const chooseTheme = (next: 'light' | 'dark') => { if (theme !== next) toggleTheme(); };
  const toggleCategory = (category: string) => setPreferences((current) => current.categories.includes(category)
    ? { ...current, categories: current.categories.filter((item) => item !== category) }
    : current.categories.length < 5 ? { ...current, categories: [...current.categories, category] } : current);

  const persistPreferences = async () => {
    const payload = { preferred_categories: preferences.categories, budget_band: preferences.budget, shopping_goal: preferences.goal, assistant_mode: preferences.assistant, language, experience, theme, onboarding_version: config.version, updated_at: new Date().toISOString() };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(preferences)); } catch {}
    let activeUserId = userId;
    if (!activeUserId) { const { data } = await supabase.auth.getUser(); activeUserId = data.user?.id ?? null; }
    if (activeUserId) {
      const { error } = await supabase.from('customer_preferences').upsert({ user_id: activeUserId, ...payload }, { onConflict: 'user_id' });
      if (error) throw error;
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || password.length < 6) { setAuthMessage(t.authError); return; }
    setAuthLoading(true); setAuthMessage(null);
    const response = authMode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setAuthLoading(false);
    if (response.error) { setAuthMessage(response.error.message || t.authError); return; }
    if (authMode === 'signup' && !response.data.session) { setAuthMessage(t.signedUp); return; }
    setAuthMessage(null); go('preferences');
  };

  const handleGoogle = async () => {
    setAuthMessage(null); saveStage('preferences');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/?onboarding=resume' } });
    if (error) setAuthMessage(error.message || t.authError);
  };

  const startTour = async () => {
    const { data } = await supabase.from('products').select('name').eq('is_active', true).gt('stock', 0).order('created_at', { ascending: true }).limit(1).maybeSingle();
    const productName = String(data?.name || '');
    setTourProduct(productName); originalCart.current = useStore.getState().cart;
    go('tour'); setOpen(false); navigate('/');
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const waitForStore = () => {
      const ready = document.querySelector('[data-ai-target="products"]') || document.querySelector('[data-ai-target="search-trigger"]');
      if (!ready) { window.setTimeout(waitForStore, 250); return; }
      const searchStep = productName ? t.searchExample + ': "' + productName + '"' : t.searchExample;
      const steps = productName
        ? [
            ...(mobile ? [{ label: rtl ? 'افتح البحث من الشريط السفلي' : 'Open search from the bottom bar', target: 'search-trigger' }, { label: searchStep, target: 'search' }] : [{ label: searchStep, target: 'search' }]),
            { label: rtl ? 'افتح منتجًا من النتائج' : 'Open a product from the results', target: 'products' },
            { label: rtl ? 'جرّب زر الإضافة للسلة' : 'Try Add to Cart', target: 'product-add' },
            { label: rtl ? 'افتح السلة' : 'Open your cart', target: 'cart' },
            { label: rtl ? 'شوف مكان إتمام الشراء' : 'See where checkout starts', target: 'checkout' },
            { label: rtl ? 'افتح مساعد ElDukkan' : 'Open the ElDukkan Assistant', target: 'ai' },
          ]
        : [{ label: rtl ? 'افتح منتجًا' : 'Open a product', target: 'products' }, { label: rtl ? 'افتح المساعد' : 'Open the assistant', target: 'ai' }];
      useStore.getState().startGuidedTask({ goal: rtl ? 'تعلم التسوق خطوة بخطوة' : 'Learn ElDukkan step by step', steps });
      setTourStarted(true);
    };
    window.setTimeout(waitForStore, 500);
  };

  const finish = async () => {
    try { await persistPreferences(); } catch (error) { console.error('Could not persist customer preferences:', error); }
    let activeUserId = userId;
    if (!activeUserId) { const { data } = await supabase.auth.getUser(); activeUserId = data.user?.id ?? null; }
    if (activeUserId) await supabase.rpc('ai_onboarding_complete', { p_user_id: activeUserId, p_version: config.version });
    else { try { localStorage.setItem(DONE_KEY, String(config.version)); } catch {} }
    clearStage(); completeOnboarding(); window.dispatchEvent(new Event('eldukkan:close-ai')); setOpen(false);
  };

  const skipTour = () => { replaceCart(originalCart.current); setTourStarted(false); window.dispatchEvent(new Event('eldukkan:close-ai')); go('ready'); };
  const stageList: Stage[] = ['welcome','language','account','preferences','appearance','tour','ready'];
  const stageIndex = stageList.indexOf(stage);
  const progress = Math.round(((stageIndex + 1) / stageList.length) * 100);
  const readySummary = useMemo(() => ({
    categories: preferences.categories.length ? preferences.categories.join(', ') : (rtl ? 'غير محدد' : 'Not set'),
    budget: preferences.budget === 'under_500' ? (rtl ? 'أقل من 500 جنيه' : 'Under EGP 500')
      : preferences.budget === '500_1500' ? (rtl ? '500–1,500 جنيه' : 'EGP 500–1,500')
      : preferences.budget === '1500_3000' ? (rtl ? '1,500–3,000 جنيه' : 'EGP 1,500–3,000')
      : (rtl ? '3,000 جنيه أو أكتر' : 'EGP 3,000+'),
  }), [preferences, rtl]);

  if (loading || !open || !config.enabled || tourStarted) return null;

  const title = stage === 'welcome' ? (rtl ? config.titleAr : config.titleEn) :
    stage === 'language' ? t.language : stage === 'account' ? t.account : stage === 'preferences' ? t.preferences :
    stage === 'appearance' ? t.appearance : stage === 'tour' ? t.tour : t.ready;

  const icon = stage === 'welcome' ? <Sparkles size={20} /> : stage === 'language' ? <Globe2 size={20} /> :
    stage === 'account' ? <CircleUserRound size={20} /> : stage === 'preferences' ? <Heart size={20} /> :
    stage === 'appearance' ? <Eye size={20} /> : stage === 'tour' ? <Zap size={20} /> : <Check size={20} />;

  const goBack = () => {
    const backMap: Record<Stage, Stage> = { welcome: 'welcome', language: 'welcome', account: 'language', preferences: 'account', appearance: 'preferences', tour: 'appearance', ready: 'tour' };
    if (stage === 'welcome') { void finish(); return; }
    go(backMap[stage]);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-md p-3 sm:p-6 flex items-center justify-center" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-5xl max-h-[min(920px,calc(100vh-24px))] overflow-hidden rounded-[2rem] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-2xl flex flex-col">
        <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shrink-0">{icon}</div>
            <div className="min-w-0"><p className="text-[10px] uppercase tracking-[0.14em] font-black text-brand-500">{t.setup}</p><h2 className="font-black text-base sm:text-xl dark:text-white truncate">{title}</h2></div>
          </div>
          <button type="button" onClick={() => void finish()} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500" aria-label={t.skip}><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 sm:px-7 sm:pt-5">
          <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: progress + '%' }} /></div>
          <p className="text-[10px] text-stone-400 font-black mt-2">{progress}%</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {stage === 'welcome' && <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-center min-h-[520px]">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-black"><Sparkles size={13} /> {t.setup}</span>
              <div className="space-y-3"><h1 className="text-4xl sm:text-5xl font-black tracking-tight dark:text-white">{rtl ? config.titleAr : config.titleEn}</h1><p className="text-base sm:text-lg text-stone-500 leading-relaxed max-w-xl">{rtl ? config.introAr : config.introEn}</p></div>
              <div className="space-y-3">{t.welcomeBullets.map((item) => <div key={item} className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0"><Check size={14} /></span><span className="text-sm sm:text-base font-bold text-stone-700 dark:text-stone-200">{item}</span></div>)}</div>
              <button type="button" onClick={() => go('language')} className="min-h-12 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black inline-flex items-center gap-2">{t.start} <ArrowRight size={16} /></button>
            </div>
            <div className="rounded-[1.75rem] bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 p-5 sm:p-7">
              <div className="grid grid-cols-2 gap-3">{[['search', Search], ['wishlist', Heart], ['cart', ShoppingBag], ['assistant', Lightbulb]].map(([label, Icon]) => <div key={String(label)} className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4"><Icon size={20} className="text-brand-500" /><p className="font-black text-sm mt-3 dark:text-white">{label === 'search' ? (rtl ? 'بحث' : 'Search') : label === 'wishlist' ? (rtl ? 'المفضلة' : 'Wishlist') : label === 'cart' ? (rtl ? 'السلة' : 'Cart') : 'AI'}</p></div>)}</div>
            </div>
          </div>}

          {stage === 'language' && <div className="max-w-3xl mx-auto py-4 sm:py-10 space-y-7">
            <div className="text-center space-y-2"><div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Globe2 size={26} /></div><h3 className="text-3xl font-black dark:text-white">{t.language}</h3><p className="text-sm text-stone-500">{t.languageSub}</p></div>
            <div className="grid sm:grid-cols-2 gap-4">{[['en', t.english, 'English storefront and controls.'], ['ar', t.arabic, 'واجهة عربية واتجاه من اليمين لليسار.']].map(([id, label, desc]) => <button key={id} type="button" onClick={() => setLanguage(id as 'en' | 'ar')} className={cx('text-left rtl:text-right p-5 rounded-2xl border-2 transition', language === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700 hover:border-brand-500/40')}><div className="flex items-center justify-between"><span className="font-black text-xl dark:text-white">{label}</span><span className={cx('w-6 h-6 rounded-full border flex items-center justify-center', language === id ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-300 dark:border-stone-600')}>{language === id && <Check size={14} />}</span></div><p className="text-sm text-stone-500 mt-2">{desc}</p></button>)}</div>
          </div>}

          {stage === 'account' && <div className="max-w-xl mx-auto py-3 sm:py-6 space-y-5">
            <div className="text-center space-y-2"><div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><LockKeyhole size={25} /></div><h3 className="text-3xl font-black dark:text-white">{t.account}</h3><p className="text-sm text-stone-500">{t.accountSub}</p></div>
            {userId ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center"><UserRound size={20} /></div><div><p className="font-black text-emerald-700 dark:text-emerald-300">{t.signedIn}</p><p className="text-sm text-stone-600 dark:text-stone-300">{t.signedInAs.replace('{email}', userEmail || '')}</p></div></div> : <><div className="flex gap-2 p-1 rounded-xl bg-stone-100 dark:bg-stone-800"><button type="button" onClick={() => { setAuthMode('signin'); setAuthMessage(null); }} className={cx('flex-1 py-2.5 rounded-lg text-xs font-black', authMode === 'signin' && 'bg-white dark:bg-stone-900 shadow-sm text-brand-600')}>{t.signIn}</button><button type="button" onClick={() => { setAuthMode('signup'); setAuthMessage(null); }} className={cx('flex-1 py-2.5 rounded-lg text-xs font-black', authMode === 'signup' && 'bg-white dark:bg-stone-900 shadow-sm text-brand-600')}>{t.createAccount}</button></div>
              {authMessage && <p role="alert" className="rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300 px-4 py-3 text-xs font-bold">{authMessage}</p>}
              <div className="space-y-3"><label className="block text-xs font-black text-stone-500">{t.email}</label><input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 storefront-field bg-stone-50 dark:bg-stone-950" placeholder="you@example.com" /><label className="block text-xs font-black text-stone-500">{t.password}</label><input autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 storefront-field bg-stone-50 dark:bg-stone-950" placeholder="••••••••" /></div>
              <button type="button" onClick={() => void handleAuth()} disabled={authLoading} className="w-full min-h-12 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">{authLoading ? <Loader2 size={18} className="animate-spin" /> : <LockKeyhole size={18} />} {authMode === 'signin' ? t.signIn : t.createAccount}</button>
              <div className="flex items-center gap-3"><span className="flex-1 h-px bg-stone-200 dark:bg-stone-700" /><span className="text-[10px] font-black text-stone-400">OR</span><span className="flex-1 h-px bg-stone-200 dark:bg-stone-700" /></div>
              <button type="button" onClick={() => void handleGoogle()} className="w-full min-h-12 border border-stone-200 dark:border-stone-700 rounded-xl font-black text-sm dark:text-white">{t.google}</button>
            </>}
            <button type="button" onClick={() => go('preferences')} className="w-full min-h-12 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-sm dark:text-white">{userId ? t.continue : t.guest}</button>
          </div>}

          {stage === 'preferences' && <div className="space-y-7 max-w-4xl mx-auto">
            <div className="text-center space-y-2"><div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Heart size={25} /></div><h3 className="text-3xl font-black dark:text-white">{t.preferences}</h3><p className="text-sm text-stone-500">{t.preferencesSub}</p></div>
            <section className="space-y-3"><div className="flex items-end justify-between"><h4 className="font-black dark:text-white">{t.categories}</h4><span className="text-[10px] font-black text-stone-400">{t.categoriesHint}</span></div>{categories.length ? <div className="flex flex-wrap gap-2">{categories.map((category) => <button key={category} type="button" onClick={() => toggleCategory(category)} className={cx('px-4 py-2.5 rounded-xl border text-xs font-black transition', preferences.categories.includes(category) ? 'border-brand-500 bg-brand-500 text-white' : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300')}>{preferences.categories.includes(category) && <Check size={13} className="inline mr-1.5" />}{category}</button>)}</div> : <div className="rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 p-4 text-xs text-stone-500">{t.noCategories}</div>}</section>
            <section className="space-y-3"><h4 className="font-black dark:text-white">{t.budget}</h4><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[['under_500',t.under500],['500_1500',t.b500_1500],['1500_3000',t.b1500_3000],['3000_plus',t.b3000Plus]].map(([id,label]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, budget: id as Preferences['budget'] }))} className={cx('p-4 rounded-xl border-2 text-xs font-black', preferences.budget === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}>{label}</button>)}</div></section>
            <section className="space-y-3"><h4 className="font-black dark:text-white">{t.goal}</h4><div className="grid md:grid-cols-3 gap-3">{[['specific',t.specific,t.specificDesc],['browse',t.browse,t.browseDesc],['compare',t.compare,t.compareDesc]].map(([id,label,desc]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, goal: id as Preferences['goal'] }))} className={cx('text-left rtl:text-right p-4 rounded-2xl border-2', preferences.goal === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}><p className="font-black text-sm dark:text-white">{label}</p><p className="text-xs text-stone-500 mt-1.5">{desc}</p></button>)}</div></section>
            <section className="space-y-3"><h4 className="font-black dark:text-white">{t.assistant}</h4><div className="grid md:grid-cols-3 gap-3">{[['self',t.assistantSelf],['ask',t.assistantAsk],['guided',t.assistantGuided]].map(([id,label]) => <button key={id} type="button" onClick={() => setPreferences((p) => ({ ...p, assistant: id as Preferences['assistant'] }))} className={cx('p-4 rounded-2xl border-2 text-left rtl:text-right', preferences.assistant === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}><p className="font-black text-sm dark:text-white">{label}</p></button>)}</div></section>
          </div>}

          {stage === 'appearance' && <div className="max-w-3xl mx-auto space-y-7 py-3 sm:py-7">
            <div className="text-center space-y-2"><div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Eye size={26} /></div><h3 className="text-3xl font-black dark:text-white">{t.appearance}</h3><p className="text-sm text-stone-500">{t.appearanceSub}</p></div>
            <div className="grid sm:grid-cols-2 gap-4">{[['light',t.light,t.lightDesc,Sun],['dark',t.dark,t.darkDesc,Moon]].map(([id,label,desc,Icon]) => <button key={String(id)} type="button" onClick={() => chooseTheme(id as 'light' | 'dark')} className={cx('text-left rtl:text-right p-5 rounded-2xl border-2', theme === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}><div className="flex items-center gap-3"><Icon size={20} className="text-brand-500" /><span className="font-black dark:text-white">{label}</span></div><p className="text-xs text-stone-500 mt-2">{desc}</p></button>)}</div>
            <div className="grid sm:grid-cols-2 gap-4">{[['modern',t.modern,t.modernDesc],['easy',t.easy,t.easyDesc]].map(([id,label,desc]) => <button key={String(id)} type="button" onClick={() => setExperience(id as 'modern' | 'easy')} className={cx('text-left rtl:text-right p-5 rounded-2xl border-2', experience === id ? 'border-brand-500 bg-brand-500/10' : 'border-stone-200 dark:border-stone-700')}><div className="flex items-center justify-between"><span className="font-black dark:text-white">{label}</span>{experience === id && <Check size={18} className="text-brand-500" />}</div><p className="text-xs text-stone-500 mt-2">{desc}</p></button>)}</div>
          </div>}

          {stage === 'tour' && <div className="max-w-4xl mx-auto space-y-7 py-3">
            <div className="text-center space-y-2"><div className="mx-auto w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center"><Zap size={28} /></div><h3 className="text-3xl font-black dark:text-white">{t.tour}</h3><p className="text-sm text-stone-500 max-w-2xl mx-auto">{t.tourSub}</p></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{t.tourSteps.map((item, index) => <div key={item} className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 p-4"><div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-xs">{index + 1}</div><p className="font-black text-sm mt-3 dark:text-white">{item}</p></div>)}</div>
            {tourProduct && <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 flex items-center gap-3"><Gift size={18} className="text-brand-500 shrink-0" /><p className="text-xs text-stone-600 dark:text-stone-300">{rtl ? 'هنستخدم "' + tourProduct + '" في التدريب. ' + t.originalCart : 'We’ll use "' + tourProduct + '" for practice. ' + t.originalCart}</p></div>}
            <div className="flex flex-col sm:flex-row gap-3 justify-center"><button type="button" onClick={() => void startTour()} className="min-h-12 px-6 rounded-xl bg-brand-500 text-white font-black inline-flex items-center justify-center gap-2"><Zap size={18} /> {t.startTour}</button><button type="button" onClick={skipTour} className="min-h-12 px-6 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-sm dark:text-white">{t.skipTour}</button></div>
          </div>}

          {stage === 'ready' && <div className="max-w-3xl mx-auto py-8 space-y-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-[1.75rem] bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Check size={36} /></div><h3 className="text-4xl font-black dark:text-white">{t.ready}</h3><p className="text-sm sm:text-base text-stone-500">{t.readySub}</p>
            <div className="grid sm:grid-cols-2 gap-3 text-left rtl:text-right"><div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-4"><p className="text-[10px] uppercase tracking-wide font-black text-stone-400">Categories</p><p className="font-black dark:text-white mt-1">{readySummary.categories}</p></div><div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-4"><p className="text-[10px] uppercase tracking-wide font-black text-stone-400">Budget</p><p className="font-black dark:text-white mt-1">{readySummary.budget}</p></div></div>
            <button type="button" onClick={() => void finish()} className="min-h-12 w-full sm:w-auto px-8 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-black inline-flex items-center justify-center gap-2"><ShoppingBag size={18} /> {t.startShopping}</button><p className="text-[11px] text-stone-400">{t.reviewLater}</p>
          </div>}
        </div>

        <div className="border-t border-stone-200 dark:border-stone-800 px-5 py-4 sm:px-7 flex items-center justify-between gap-3">
          <button type="button" onClick={goBack} className="min-h-11 px-4 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white inline-flex items-center gap-2"><ArrowLeft size={15} /> {stage === 'welcome' ? t.skip : t.back}</button>
          <div className="flex items-center gap-2">
            {stage === 'language' && <button type="button" onClick={() => go('account')} className="min-h-11 px-5 rounded-xl bg-brand-500 text-white font-black text-xs inline-flex items-center gap-2">{t.continue} <ArrowRight size={15} /></button>}
            {stage === 'account' && <button type="button" onClick={() => go('preferences')} className="min-h-11 px-5 rounded-xl bg-brand-500 text-white font-black text-xs inline-flex items-center gap-2">{t.continue} <ArrowRight size={15} /></button>}
            {stage === 'preferences' && <button type="button" onClick={() => { void persistPreferences(); go('appearance'); }} className="min-h-11 px-5 rounded-xl bg-brand-500 text-white font-black text-xs inline-flex items-center gap-2">{t.continue} <ArrowRight size={15} /></button>}
            {stage === 'appearance' && <button type="button" onClick={() => { void persistPreferences(); go('tour'); }} className="min-h-11 px-5 rounded-xl bg-brand-500 text-white font-black text-xs inline-flex items-center gap-2">{t.continue} <ArrowRight size={15} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}