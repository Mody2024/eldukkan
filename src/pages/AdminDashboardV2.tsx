import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Papa from 'papaparse';
import {
  Activity, AlertTriangle, BarChart3, Boxes, CheckCircle2, ChevronRight, ClipboardList,
  Clock3, DollarSign, Eye, FileDown, FileUp, LayoutDashboard, LogOut, Menu, Minus,
  Package, Palette, Plus, RefreshCw, Search, Settings, Shield, ShoppingBag, SlidersHorizontal,
  Store, Tag, Trash2, TrendingUp, Upload, UserCog, Users, X, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { DiscountCode, Order, Product } from '../types';
import ProductEditModal from '../components/ProductEditModal';

interface AdminUserRow {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'staff' | string;
  permissions: string[];
  created_at: string;
}

interface AuditLogRow {
  id: string;
  admin_email: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

type Tab = 'overview' | 'orders' | 'products' | 'customers' | 'analytics' | 'discounts' | 'team' | 'settings' | 'system' | 'audit';
type AdminTheme = 'light' | 'dark' | 'paper';
type AdminDensity = 'comfortable' | 'compact';

const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ['manage_products', 'manage_orders', 'manage_discounts', 'view_analytics', 'manual_payment_override', 'export_reports'],
  staff: ['manage_orders'],
  owner: [],
};

const ALL_PERMISSIONS: { key: string; label: string; group: string }[] = [
  { key: 'manage_products', label: 'View & manage products', group: 'Commerce' },
  { key: 'manage_orders', label: 'View & manage orders', group: 'Commerce' },
  { key: 'manage_discounts', label: 'Manage discounts', group: 'Growth' },
  { key: 'view_analytics', label: 'View analytics', group: 'Analytics' },
  { key: 'manual_payment_override', label: 'Manual payment override', group: 'Orders' },
  { key: 'export_reports', label: 'Export reports', group: 'Reports' },
  { key: 'manage_settings', label: 'Manage storefront settings', group: 'Control' },
  { key: 'manage_team', label: 'Manage team', group: 'Control' },
  { key: 'view_audit_log', label: 'View audit log', group: 'System' },
];

export default function AdminDashboardV2() {
  const {
    adminRole,
    userEmail,
    hasPermission,
    showToast,
  } = useStore();
  const isOwner = adminRole === 'owner';

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);

  const [siteSettings, setSiteSettings] = useState({
    announcement_banner: '',
    maintenance_mode: false,
    store_name: '',
    logo_url: '',
    hero_headline: '',
    hero_subheadline: '',
    hero_image_url: '',
    footer_credits_enabled: true,
    footer_credits_text: '',
    sponsors: [] as { name: string; logo_url: string; url?: string }[],
  });

  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'staff' | 'owner'>('admin');
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>(ROLE_DEFAULTS.admin);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingAdminRole, setEditingAdminRole] = useState<'admin' | 'staff' | 'owner'>('admin');
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  const [newDiscount, setNewDiscount] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    max_uses: '',
    expires_at: '',
  });

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [orderSearch, setOrderSearch] = useState('');
  const [commandQuery, setCommandQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [adminTheme, setAdminTheme] = useState<AdminTheme>(() => {
    try { return (localStorage.getItem('eldukkan-admin-theme') as AdminTheme) || 'light'; } catch { return 'light'; }
  });
  const [adminDensity, setAdminDensity] = useState<AdminDensity>(() => {
    try { return (localStorage.getItem('eldukkan-admin-density') as AdminDensity) || 'comfortable'; } catch { return 'comfortable'; }
  });
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const NAV_ITEMS: {
    id: Tab;
    label: string;
    icon: typeof LayoutDashboard;
    visible: boolean;
    group: string;
    description: string;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, visible: true, group: 'Command', description: 'Live store health and quick actions' },
    { id: 'orders', label: 'Orders', icon: ClipboardList, visible: hasPermission('manage_orders'), group: 'Commerce', description: 'Process customer orders' },
    { id: 'products', label: 'Products', icon: ShoppingBag, visible: hasPermission('manage_products'), group: 'Commerce', description: 'Catalog and inventory' },
    { id: 'customers', label: 'Customers', icon: Users, visible: hasPermission('manage_orders') || hasPermission('view_analytics'), group: 'Commerce', description: 'Customer profiles from orders' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, visible: hasPermission('view_analytics'), group: 'Growth', description: 'Sales and order performance' },
    { id: 'discounts', label: 'Discounts', icon: Tag, visible: hasPermission('manage_discounts'), group: 'Growth', description: 'Promotions and codes' },
    { id: 'team', label: 'Team', icon: Users, visible: true, group: 'Control', description: 'Roles and permissions' },
    { id: 'settings', label: 'Storefront', icon: Store, visible: hasPermission('manage_settings'), group: 'Control', description: 'Branding and live site controls' },
    { id: 'system', label: 'System', icon: Settings, visible: isOwner || hasPermission('manage_settings'), group: 'System', description: 'Health, feeds and admin workspace' },
    { id: 'audit', label: 'Audit Log', icon: Activity, visible: isOwner || hasPermission('view_audit_log'), group: 'System', description: 'Admin activity trail' },
  ];

  const visibleNav = NAV_ITEMS.filter((item) => item.visible);
  const filteredNav = commandQuery.trim()
    ? visibleNav.filter((item) => (item.label + ' ' + item.description + ' ' + item.group).toLowerCase().includes(commandQuery.trim().toLowerCase()))
    : visibleNav;

  const totalRevenue = useMemo(() => orders.reduce((sum, order) => sum + Number(order.total || 0), 0), [orders]);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'pending').length, [orders]);
  const processingOrders = useMemo(() => orders.filter((order) => order.status === 'processing').length, [orders]);
  const paidOrders = useMemo(() => orders.filter((order) => order.payment_status === 'paid').length, [orders]);
  const activeProducts = useMemo(() => products.filter((product) => product.is_active !== false), [products]);
  const outOfStockProducts = useMemo(() => products.filter((product) => Number(product.stock ?? 0) <= 0), [products]);
  const lowStockProducts = useMemo(() => products.filter((product) => Number(product.stock ?? 0) > 0 && Number(product.stock ?? 0) <= 5), [products]);
  const activeDiscounts = useMemo(() => discounts.filter((discount) => discount.active && (!discount.expires_at || new Date(discount.expires_at) > new Date())).length, [discounts]);

  const customerRows = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; email: string; orders: number; spend: number; lastOrder: string }>();
    for (const order of orders) {
      const key = order.customer_id || order.customer_email || order.customer_phone || order.customer_name;
      const current = map.get(key) || {
        id: key,
        name: order.customer_name || 'Customer',
        phone: order.customer_phone || '',
        email: order.customer_email || '',
        orders: 0,
        spend: 0,
        lastOrder: order.created_at,
      };
      current.orders += 1;
      current.spend += Number(order.total || 0);
      if (new Date(order.created_at) > new Date(current.lastOrder)) current.lastOrder = order.created_at;
      if (!current.email && order.customer_email) current.email = order.customer_email;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
  }, [orders]);

  const analyticsDays = useMemo(() => {
    const result: { label: string; revenue: number; orders: number }[] = [];
    const now = new Date();
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - offset);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const dayOrders = orders.filter((order) => {
        const time = new Date(order.created_at).getTime();
        return time >= day.getTime() && time < next.getTime();
      });
      result.push({
        label: day.toLocaleDateString('en-EG', { weekday: 'short' }),
        revenue: dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
        orders: dayOrders.length,
      });
    }
    return result;
  }, [orders]);

  const maxDailyRevenue = Math.max(1, ...analyticsDays.map((day) => day.revenue));

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => (p.name + ' ' + (p.category || '') + ' ' + (p.vendor_name || '')).toLowerCase().includes(q));
  }, [products, productSearch]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.customer_name + ' ' + o.customer_phone + ' ' + (o.customer_email || '') + ' ' + o.id).toLowerCase().includes(q)
    );
  }, [orders, orderSearch]);

  const formatCurrency = (value: number) =>
    'EGP ' + Number(value || 0).toLocaleString('en-EG', { maximumFractionDigits: 2 });

  const logAction = async (action: string, details?: Record<string, unknown>) => {
    await supabase.from('admin_activity_log').insert([
      { admin_email: userEmail, action, details: details ?? null },
    ]);
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      const [ordersResult, productsResult, discountsResult, adminsResult, settingsResult, auditResult] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(5000),
        supabase.from('discount_codes').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('admin_users').select('id, email, role, permissions, created_at').order('created_at', { ascending: true }),
        supabase.from('site_settings').select('*').single(),
        supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100),
      ]);
      if (ordersResult.data) setOrders(ordersResult.data);
      if (productsResult.data) setProducts(productsResult.data);
      if (discountsResult.data) setDiscounts(discountsResult.data);
      if (adminsResult.data) setAdmins(adminsResult.data as AdminUserRow[]);
      if (settingsResult.data) {
        const data = settingsResult.data;
        setSiteSettings({
          announcement_banner: data.announcement_banner || '',
          maintenance_mode: !!data.maintenance_mode,
          store_name: data.store_name || 'Eldukkan',
          logo_url: data.logo_url || '',
          hero_headline: data.hero_headline || '',
          hero_subheadline: data.hero_subheadline || '',
          hero_image_url: data.hero_image_url || '',
          footer_credits_enabled: data.footer_credits_enabled ?? true,
          footer_credits_text: data.footer_credits_text || '',
          sponsors: Array.isArray(data.sponsors) ? data.sponsors : [],
        });
      }
      if (auditResult.data) setAuditLog(auditResult.data as AuditLogRow[]);
      setLastRefreshedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('eldukkan-admin-theme', adminTheme);
      localStorage.setItem('eldukkan-admin-density', adminDensity);
    } catch {
      // Optional preference persistence.
    }
  }, [adminTheme, adminDensity]);

  const goTo = (tab: Tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      showToast('Could not update order: ' + error.message);
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status: newStatus } : order));
    await logAction('update_order_status', { order_id: orderId, status: newStatus });
    showToast('Order status updated.');
  };

  const handleMarkPaid = async (orderId: string) => {
    if (!window.confirm('Mark this order as paid?')) return;
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
    if (error) {
      showToast('Could not update payment: ' + error.message);
      return;
    }
    setOrders((current) => current.map((order) => order.id === orderId ? { ...order, payment_status: 'paid' } : order));
    await logAction('manual_payment_override', { order_id: orderId });
    showToast('Order marked as paid.');
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm('Delete "' + product.name + '"? This cannot be undone.')) return;
    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      showToast('Delete failed: ' + error.message);
      return;
    }
    setProducts((current) => current.filter((item) => item.id !== product.id));
    await logAction('delete_product', { product_id: product.id, name: product.name });
    showToast('Product deleted.');
  };

  const handleStock = async (product: Product, delta: number) => {
    const stock = Math.max(0, Number(product.stock || 0) + delta);
    const { error } = await supabase.from('products').update({ stock }).eq('id', product.id);
    if (error) {
      showToast('Stock update failed: ' + error.message);
      return;
    }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, stock } : item));
  };

  const handleFeatured = async (product: Product) => {
    const featured = !product.featured;
    const { error } = await supabase.from('products').update({ featured }).eq('id', product.id);
    if (error) {
      showToast('Could not update featured state.');
      return;
    }
    setProducts((current) => current.map((item) => item.id === product.id ? { ...item, featured } : item));
    await logAction('toggle_featured_product', { product_id: product.id, featured });
  };

  const handleCsvImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Record<string, string>[];
        const payload = rows
          .filter((row) => row.name && row.price && Number.isFinite(Number(row.price)))
          .map((row) => ({
            name: row.name.trim(),
            price: Number(row.price),
            description: row.description || '',
            category: row.category || null,
            image_url: row.image_url || '',
            stock: Number.isFinite(Number(row.stock)) ? Number(row.stock) : 0,
            is_active: true,
          }));
        if (!payload.length) {
          setImportingCsv(false);
          showToast('No valid rows. Expected: name, price, description, category, image_url, stock.');
          return;
        }
        const { error } = await supabase.from('products').insert(payload);
        setImportingCsv(false);
        if (error) {
          showToast('Import failed: ' + error.message);
          return;
        }
        await logAction('bulk_import_products', { count: payload.length });
        showToast('Imported ' + payload.length + ' products.');
        refreshAll();
      },
      error: (error) => {
        setImportingCsv(false);
        showToast('CSV error: ' + error.message);
      },
    });
    event.target.value = '';
  };

  const exportOrdersCsv = () => {
    const header = ['Order ID', 'Customer', 'Phone', 'Email', 'Total', 'Status', 'Payment Status', 'Date'];
    const rows = orders.map((order) => [
      order.id,
      order.customer_name,
      order.customer_phone,
      order.customer_email || '',
      order.total,
      order.status,
      order.payment_status || '',
      order.created_at,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'eldukkan-orders-' + new Date().toISOString().slice(0, 10) + '.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    logAction('export_orders_csv', { count: orders.length });
  };

  const handleAddDiscount = async (event: FormEvent) => {
    event.preventDefault();
    if (!newDiscount.code.trim() || !Number.isFinite(Number(newDiscount.discount_value))) {
      showToast('Enter a valid discount code and value.');
      return;
    }
    const value = Number(newDiscount.discount_value);
    if (value <= 0) {
      showToast('Discount value must be greater than zero.');
      return;
    }
    const { error } = await supabase.from('discount_codes').insert([{
      code: newDiscount.code.trim().toUpperCase(),
      discount_type: newDiscount.discount_type,
      discount_value: value,
      max_uses: newDiscount.max_uses ? Number(newDiscount.max_uses) : null,
      expires_at: newDiscount.expires_at || null,
    }]);
    if (error) {
      showToast('Could not create discount: ' + error.message);
      return;
    }
    setNewDiscount({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' });
    await logAction('create_discount', { code: newDiscount.code.trim().toUpperCase() });
    showToast('Discount created.');
    refreshAll();
  };

  const toggleDiscount = async (discount: DiscountCode) => {
    const { error } = await supabase.from('discount_codes').update({ active: !discount.active }).eq('id', discount.id);
    if (error) {
      showToast('Could not update discount.');
      return;
    }
    setDiscounts((current) => current.map((item) => item.id === discount.id ? { ...item, active: !discount.active } : item));
    await logAction('toggle_discount', { code: discount.code, active: !discount.active });
  };

  const deleteDiscount = async (discount: DiscountCode) => {
    if (!window.confirm('Delete discount "' + discount.code + '"?')) return;
    const { error } = await supabase.from('discount_codes').delete().eq('id', discount.id);
    if (error) {
      showToast('Could not delete discount.');
      return;
    }
    setDiscounts((current) => current.filter((item) => item.id !== discount.id));
    await logAction('delete_discount', { code: discount.code });
  };

  const addAdmin = async (event: FormEvent) => {
    event.preventDefault();
    if (!isOwner) return;
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from('admin_users').insert([{
      email,
      role: newAdminRole,
      permissions: newAdminRole === 'owner' ? [] : newAdminPermissions,
    }]);
    if (error) {
      showToast('Could not add team member: ' + error.message);
      return;
    }
    await logAction('add_admin', { email, role: newAdminRole, permissions: newAdminPermissions });
    setNewAdminEmail('');
    setNewAdminRole('admin');
    setNewAdminPermissions(ROLE_DEFAULTS.admin);
    showToast('Team member added.');
    refreshAll();
  };

  const removeAdmin = async (admin: AdminUserRow) => {
    if (!isOwner || admin.role === 'owner') return;
    if (!window.confirm('Remove ' + admin.email + ' from the team?')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', admin.id);
    if (error) {
      showToast('Could not remove team member: ' + error.message);
      return;
    }
    await logAction('remove_admin', { email: admin.email });
    setAdmins((current) => current.filter((item) => item.id !== admin.id));
    showToast('Team member removed.');
  };

  const saveAdmin = async (admin: AdminUserRow) => {
    if (!isOwner || admin.role === 'owner') return;
    const { error } = await supabase.from('admin_users').update({
      role: editingAdminRole,
      permissions: editingAdminRole === 'owner' ? [] : editingPermissions,
    }).eq('id', admin.id);
    if (error) {
      showToast('Could not update team member: ' + error.message);
      return;
    }
    await logAction('update_admin_access', {
      email: admin.email,
      role: editingAdminRole,
      permissions: editingPermissions,
    });
    setEditingAdminId(null);
    showToast('Team access updated.');
    refreshAll();
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!hasPermission('manage_settings')) return;
    const { error } = await supabase.from('site_settings').update({
      announcement_banner: siteSettings.announcement_banner || null,
      maintenance_mode: siteSettings.maintenance_mode,
      store_name: siteSettings.store_name || 'Eldukkan',
      logo_url: siteSettings.logo_url || null,
      hero_headline: siteSettings.hero_headline || null,
      hero_subheadline: siteSettings.hero_subheadline || null,
      hero_image_url: siteSettings.hero_image_url || null,
      footer_credits_enabled: siteSettings.footer_credits_enabled,
      footer_credits_text: siteSettings.footer_credits_text.trim() || null,
      sponsors: siteSettings.sponsors,
      updated_at: new Date().toISOString(),
    }).eq('id', true);
    if (error) {
      showToast('Could not save storefront settings: ' + error.message);
      return;
    }
    await logAction('update_site_settings');
    showToast('Storefront settings published.');
    refreshAll();
  };

  const addSponsor = () => {
    const name = window.prompt('Sponsor name');
    const logo_url = window.prompt('Sponsor logo URL');
    if (!name || !logo_url) return;
    setSiteSettings((current) => ({
      ...current,
      sponsors: [...current.sponsors, { name: name.trim(), logo_url: logo_url.trim() }],
    }));
  };

  const pageTitle = NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Overview';
  const pageDescription = NAV_ITEMS.find((item) => item.id === activeTab)?.description || 'Control your ElDukkan store.';

  const themeClass = adminTheme === 'dark'
    ? 'dark bg-stone-950 text-stone-100'
    : adminTheme === 'paper'
      ? 'bg-[#f5efe5] text-stone-900'
      : 'bg-stone-50 text-stone-900';

  const cardClass = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-sm';
  const softClass = 'bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800';

  return (
    <div className={'min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 px-3 sm:px-5 lg:px-8 py-3 sm:py-5 ' + themeClass}>
      <div className="mx-auto max-w-[1600px] grid grid-cols-1 md:grid-cols-[250px_minmax(0,1fr)] gap-5 lg:gap-7">
        <aside className={'md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] ' + cardClass + ' overflow-hidden ' + (sidebarOpen ? 'fixed inset-3 z-[80] h-auto' : 'hidden md:block')}>
          <div className="p-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => goTo('overview')} className="flex items-center gap-3 min-w-0 text-left">
                <div className="h-10 w-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-md shadow-brand-500/20"><LayoutDashboard size={20} /></div>
                <div className="min-w-0"><p className="font-black text-lg dark:text-white truncate">ElDukkan</p><p className="text-[11px] font-bold text-stone-500">Command Center</p></div>
              </button>
              <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"><X size={18} /></button>
            </div>
          </div>

          <div className="p-3 border-b border-stone-200 dark:border-stone-800">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder="Search admin sections..."
                className="w-full pl-9 pr-3 py-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl border border-transparent focus:border-brand-500 outline-none text-sm dark:text-white"
              />
            </div>
          </div>

          <nav className="p-3 space-y-4 overflow-y-auto md:max-h-[calc(100vh-13rem)]">
            {[...new Set(filteredNav.map((item) => item.group))].map((group) => (
              <div key={group} className="space-y-1.5">
                <p className="px-3 text-[10px] uppercase tracking-[0.16em] font-black text-stone-400">{group}</p>
                {filteredNav.filter((item) => item.group === group).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => goTo(item.id)}
                    className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition ' + (activeTab === item.id ? 'bg-brand-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800')}
                  >
                    <item.icon size={17} />
                    <span className="truncate">{item.label}</span>
                    {item.id === 'orders' && pendingOrders > 0 && (
                      <span className={'ml-auto min-w-5 h-5 px-1 rounded-full text-[10px] flex items-center justify-center ' + (activeTab === item.id ? 'bg-white/20' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400')}>{pendingOrders}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <a href={window.location.origin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"><Eye size={17} /> View store <ChevronRight size={14} className="ml-auto" /></a>
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-500/10"><LogOut size={17} /> Sign out</button>
          </div>
        </aside>

        <main className={adminDensity === 'compact' ? 'min-w-0 space-y-4' : 'min-w-0 space-y-6'}>
          <div className="md:hidden sticky top-2 z-40 flex items-center justify-between gap-2 bg-white/95 dark:bg-stone-900/95 backdrop-blur border border-stone-200 dark:border-stone-800 p-2.5 rounded-2xl shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800"><Menu size={18} /></button>
            <div className="min-w-0"><p className="font-black dark:text-white truncate">ElDukkan Admin</p><p className="text-[10px] text-stone-500 font-bold">{pageTitle}</p></div>
            <button onClick={refreshAll} disabled={refreshing} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800"><RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} /></button>
          </div>

          <header className={'hidden md:flex items-center justify-between gap-4 ' + cardClass + ' p-5'}>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] font-black text-brand-500">ElDukkan Control</p>
              <h1 className="text-2xl xl:text-3xl font-black dark:text-white tracking-tight">{pageTitle}</h1>
              <p className="text-stone-500 text-sm mt-1">{pageDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-2 px-3 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-bold text-stone-500"><Activity size={14} className="text-emerald-500" /> Live data</div>
              <button onClick={refreshAll} disabled={refreshing} title="Refresh all admin data" className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></button>
              <button onClick={() => setAdminDensity(adminDensity === 'compact' ? 'comfortable' : 'compact')} title="Toggle density" className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700"><SlidersHorizontal size={18} /></button>
              <button onClick={() => setAppearanceOpen((open) => !open)} title="Appearance" className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700"><Palette size={18} /></button>
            </div>
          </header>

          {appearanceOpen && (
            <div className={cardClass + ' p-4 flex flex-wrap items-center gap-3'}>
              <div className="mr-auto"><p className="font-black dark:text-white">Admin appearance</p><p className="text-xs text-stone-500">Saved on this device.</p></div>
              {(['light', 'dark', 'paper'] as AdminTheme[]).map((theme) => (
                <button key={theme} onClick={() => setAdminTheme(theme)} className={'px-4 py-2.5 rounded-xl font-black text-xs capitalize ' + (adminTheme === theme ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800 dark:text-stone-200')}>{theme}</button>
              ))}
            </div>
          )}

          <div className="md:hidden overflow-x-auto flex gap-2">
            {visibleNav.map((item) => (
              <button key={item.id} onClick={() => goTo(item.id)} className={'shrink-0 px-3.5 py-2 rounded-xl text-xs font-black ' + (activeTab === item.id ? 'bg-brand-500 text-white' : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300')}>{item.label}</button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {hasPermission('view_analytics') && <div className={cardClass + ' p-4 sm:p-5'}><div className="flex justify-between"><span className="text-xs font-black uppercase text-stone-400">Revenue</span><DollarSign size={17} className="text-brand-500" /></div><p className="text-xl sm:text-2xl font-black mt-2 dark:text-white">{formatCurrency(totalRevenue)}</p><p className="text-[11px] text-stone-500 mt-1">{paidOrders} paid orders</p></div>}
                {hasPermission('manage_orders') && <div className={cardClass + ' p-4 sm:p-5'}><div className="flex justify-between"><span className="text-xs font-black uppercase text-stone-400">Orders</span><ClipboardList size={17} className="text-brand-500" /></div><p className="text-xl sm:text-2xl font-black mt-2 dark:text-white">{orders.length}</p><p className="text-[11px] text-stone-500 mt-1">{pendingOrders} pending · {processingOrders} processing</p></div>}
                {hasPermission('manage_products') && <div className={cardClass + ' p-4 sm:p-5'}><div className="flex justify-between"><span className="text-xs font-black uppercase text-stone-400">Catalog</span><Boxes size={17} className="text-brand-500" /></div><p className="text-xl sm:text-2xl font-black mt-2 dark:text-white">{activeProducts.length}</p><p className="text-[11px] text-stone-500 mt-1">{outOfStockProducts.length} out · {lowStockProducts.length} low</p></div>}
                {hasPermission('manage_discounts') && <div className={cardClass + ' p-4 sm:p-5'}><div className="flex justify-between"><span className="text-xs font-black uppercase text-stone-400">Promotions</span><Tag size={17} className="text-brand-500" /></div><p className="text-xl sm:text-2xl font-black mt-2 dark:text-white">{activeDiscounts}</p><p className="text-[11px] text-stone-500 mt-1">active codes</p></div>}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-6">
                <section className={cardClass + ' p-5 sm:p-6 space-y-4'}>
                  <div className="flex items-center justify-between"><div><h2 className="text-lg font-black dark:text-white">Needs attention</h2><p className="text-xs text-stone-500 mt-1">Quick view of work that may need action.</p></div><AlertTriangle size={20} className={(pendingOrders + outOfStockProducts.length + lowStockProducts.length) ? 'text-amber-500' : 'text-emerald-500'} /></div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {hasPermission('manage_orders') && <button onClick={() => goTo('orders')} className={softClass + ' p-4 rounded-2xl text-left hover:border-brand-500/50 transition'}><Package size={18} className="text-brand-500" /><p className="mt-3 text-xl font-black dark:text-white">{pendingOrders}</p><p className="text-xs text-stone-500">Pending orders</p></button>}
                    {hasPermission('manage_products') && <button onClick={() => goTo('products')} className={softClass + ' p-4 rounded-2xl text-left hover:border-brand-500/50 transition'}><AlertTriangle size={18} className="text-amber-500" /><p className="mt-3 text-xl font-black dark:text-white">{outOfStockProducts.length + lowStockProducts.length}</p><p className="text-xs text-stone-500">Stock alerts</p></button>}
                    {(isOwner || hasPermission('view_audit_log')) && <button onClick={() => goTo('audit')} className={softClass + ' p-4 rounded-2xl text-left hover:border-brand-500/50 transition'}><Activity size={18} className="text-brand-500" /><p className="mt-3 text-xl font-black dark:text-white">{auditLog.length}</p><p className="text-xs text-stone-500">Recent audit entries</p></button>}
                  </div>
                </section>

                <section className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center justify-between"><div><h2 className="text-lg font-black dark:text-white">Quick actions</h2><p className="text-xs text-stone-500 mt-1">Common admin tasks.</p></div><Zap size={19} className="text-brand-500" /></div>
                  <div className="grid grid-cols-2 gap-2.5 mt-4">
                    {hasPermission('manage_products') && <button onClick={() => { setCreatingProduct(true); setEditingProduct(null); }} className="p-3 rounded-xl bg-brand-500 text-white font-black text-xs">Add product</button>}
                    {hasPermission('manage_products') && <button onClick={() => goTo('products')} className={softClass + ' p-3 rounded-xl font-black text-xs dark:text-white'}>Inventory</button>}
                    {hasPermission('manage_orders') && <button onClick={() => goTo('orders')} className={softClass + ' p-3 rounded-xl font-black text-xs dark:text-white'}>Orders</button>}
                    {hasPermission('manage_discounts') && <button onClick={() => goTo('discounts')} className={softClass + ' p-3 rounded-xl font-black text-xs dark:text-white'}>Discounts</button>}
                    {hasPermission('manage_settings') && <button onClick={() => goTo('settings')} className={softClass + ' p-3 rounded-xl font-black text-xs dark:text-white'}>Storefront</button>}
                    {isOwner && <button onClick={() => goTo('team')} className={softClass + ' p-3 rounded-xl font-black text-xs dark:text-white'}>Team</button>}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center justify-between"><div><h2 className="text-lg font-black dark:text-white">Recent orders</h2><p className="text-xs text-stone-500 mt-1">Latest customer activity.</p></div><button onClick={() => goTo('orders')} className="text-xs font-black text-brand-500">View all</button></div>
                  <div className="mt-4 space-y-2.5">
                    {orders.slice(0, 6).map((order) => <button key={order.id} onClick={() => goTo('orders')} className={'w-full flex items-center gap-3 p-3 rounded-xl ' + softClass + ' text-left hover:border-brand-500/50'}><div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Package size={16} /></div><div className="min-w-0 flex-1"><p className="font-black text-sm dark:text-white truncate">{order.customer_name || 'Customer'}</p><p className="text-[11px] text-stone-500">#{order.id.slice(0, 8).toUpperCase()}</p></div><div className="text-right"><p className="font-black text-sm dark:text-white">{formatCurrency(order.total)}</p><p className="text-[10px] uppercase font-black text-stone-400">{order.status}</p></div></button>)}
                    {orders.length === 0 && <p className="text-sm text-stone-500 text-center py-8">No orders yet.</p>}
                  </div>
                </section>

                <section className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center justify-between"><div><h2 className="text-lg font-black dark:text-white">Inventory watch</h2><p className="text-xs text-stone-500 mt-1">Low and unavailable products.</p></div><button onClick={() => goTo('products')} className="text-xs font-black text-brand-500">Manage</button></div>
                  <div className="mt-4 space-y-2.5">
                    {[...outOfStockProducts, ...lowStockProducts].slice(0, 6).map((product) => <button key={product.id} onClick={() => goTo('products')} className={'w-full flex items-center gap-3 p-3 rounded-xl ' + softClass + ' text-left hover:border-brand-500/50'}><img src={product.image_url} alt="" loading="lazy" className="w-9 h-9 rounded-lg object-cover bg-stone-200 dark:bg-stone-800" /><div className="min-w-0 flex-1"><p className="font-bold text-sm dark:text-white truncate">{product.name}</p><p className="text-[11px] text-stone-500">{Number(product.stock ?? 0) <= 0 ? 'Out of stock' : 'Only ' + product.stock + ' left'}</p></div><ChevronRight size={15} className="text-stone-400" /></button>)}
                    {!outOfStockProducts.length && !lowStockProducts.length && <div className="py-8 text-center text-sm text-emerald-600 dark:text-emerald-400 font-bold"><CheckCircle2 size={24} className="mx-auto mb-2" />Everything is stocked.</div>}
                  </div>
                </section>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                <span className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">Active products: <b className="text-stone-900 dark:text-white">{activeProducts.length}</b></span>
                <span className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">Discounts: <b className="text-stone-900 dark:text-white">{discounts.length}</b></span>
                <span className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">Team: <b className="text-stone-900 dark:text-white">{admins.length}</b></span>
                <span className="ml-auto flex items-center gap-1.5 px-3 py-2"><Clock3 size={13} /> {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString() : 'Loading'}</span>
              </div>
            </div>
          )}

          {activeTab === 'orders' && hasPermission('manage_orders') && (
            <section className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Pending</p><p className="text-2xl font-black mt-1 dark:text-white">{pendingOrders}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Processing</p><p className="text-2xl font-black mt-1 dark:text-white">{processingOrders}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Paid</p><p className="text-2xl font-black mt-1 dark:text-white">{paidOrders}</p></div>
                {hasPermission('view_analytics') && <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Revenue</p><p className="text-xl font-black mt-1 dark:text-white">{formatCurrency(totalRevenue)}</p></div>}
              </div>

              <div className={cardClass + ' p-5 sm:p-6'}>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search customer, phone, email or order ID" className="w-full pl-9 pr-3 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-brand-500 outline-none text-sm dark:text-white" /></div>
                  {hasPermission('export_reports') && <button onClick={exportOrdersCsv} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-sm dark:text-white"><FileDown size={16} /> Export CSV</button>}
                </div>

                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <article key={order.id} className={softClass + ' p-4 sm:p-5 rounded-2xl'}>
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="font-black dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span><span className="text-[10px] uppercase font-black px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500">{order.payment_method}</span><span className="text-[10px] uppercase font-black px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300">{order.payment_status || 'unpaid'}</span></div><p className="font-bold mt-2 dark:text-white">{order.customer_name}</p><p className="text-xs text-stone-500">{order.customer_phone}{order.customer_email ? ' · ' + order.customer_email : ''}</p></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])} className="px-3 py-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-bold text-sm dark:text-white">
                            <option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
                          </select>
                          {hasPermission('manual_payment_override') && order.payment_status !== 'paid' && <button onClick={() => handleMarkPaid(order.id)} className="px-3 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black">Mark paid</button>}
                          <span className="font-black text-lg dark:text-white">{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                  {!filteredOrders.length && <p className="text-center text-stone-500 py-12">No matching orders.</p>}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'products' && hasPermission('manage_products') && (
            <section className="space-y-5">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch">
                <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products or categories" className="w-full pl-9 pr-3 py-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-brand-500 dark:text-white" /></div>
                <div className="flex gap-2">
                  <label className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-black text-sm cursor-pointer dark:text-white"><Upload size={16} /> {importingCsv ? 'Importing...' : 'Import CSV'}<input type="file" accept=".csv,text/csv" onChange={handleCsvImport} disabled={importingCsv} className="hidden" /></label>
                  <button onClick={() => { setCreatingProduct(true); setEditingProduct(null); }} className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-brand-500 text-white font-black text-sm"><Plus size={17} /> Add product</button>
                </div>
              </div>

              <div className={cardClass + ' overflow-hidden'}>
                <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between"><div><h2 className="font-black text-lg dark:text-white">Catalog</h2><p className="text-xs text-stone-500 mt-1">{filteredProducts.length} shown · {outOfStockProducts.length} out of stock</p></div><button onClick={refreshAll} className="text-xs font-black text-brand-500">Refresh</button></div>
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="p-4 sm:p-5 flex flex-col xl:flex-row gap-4 xl:items-center">
                      <img src={product.image_url} alt="" loading="lazy" className="w-16 h-16 rounded-2xl object-cover bg-stone-100 dark:bg-stone-800 shrink-0" />
                      <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><p className="font-black dark:text-white truncate">{product.name}</p>{product.featured && <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-brand-500/10 text-brand-500">Featured</span>}{product.is_active === false && <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg bg-red-500/10 text-red-500">Inactive</span>}</div><p className="text-xs text-stone-500 mt-1">{product.category || 'Uncategorized'} · ID {product.id.slice(0, 8)}</p><p className="text-sm font-black text-brand-500 mt-1">{formatCurrency(product.sale_price || product.price)}</p></div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl bg-stone-100 dark:bg-stone-800 p-1"><button onClick={() => handleStock(product, -1)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-stone-700"><Minus size={14} /></button><span className="min-w-12 text-center text-sm font-black dark:text-white">{product.stock ?? 0}</span><button onClick={() => handleStock(product, 1)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-stone-700"><Plus size={14} /></button></div>
                        <button onClick={() => handleFeatured(product)} title="Toggle featured" className={'p-2.5 rounded-xl ' + (product.featured ? 'bg-brand-500 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500')}><TrendingUp size={15} /></button>
                        <button onClick={() => { setEditingProduct(product); setCreatingProduct(false); }} className="px-3 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white">Edit</button>
                        <button onClick={() => handleDeleteProduct(product)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  ))}
                  {!filteredProducts.length && <p className="text-center py-12 text-stone-500">No products found.</p>}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'customers' && (
            <section className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Customers</p><p className="text-2xl font-black mt-1 dark:text-white">{customerRows.length}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Orders</p><p className="text-2xl font-black mt-1 dark:text-white">{orders.length}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Avg spend</p><p className="text-xl font-black mt-1 dark:text-white">{formatCurrency(customerRows.length ? totalRevenue / customerRows.length : 0)}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] font-black uppercase text-stone-400">Repeat</p><p className="text-2xl font-black mt-1 dark:text-white">{customerRows.filter((customer) => customer.orders > 1).length}</p></div>
              </div>
              <div className={cardClass + ' overflow-hidden'}>
                <div className="p-5 border-b border-stone-200 dark:border-stone-800"><h2 className="text-lg font-black dark:text-white">Customer directory</h2><p className="text-xs text-stone-500 mt-1">Derived from real store orders.</p></div>
                <div className="divide-y divide-stone-200 dark:divide-stone-800">
                  {customerRows.map((customer) => (
                    <article key={customer.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Users size={18} /></div>
                      <div className="min-w-0 flex-1"><p className="font-black dark:text-white truncate">{customer.name}</p><p className="text-xs text-stone-500 truncate">{customer.phone}{customer.email ? ' · ' + customer.email : ''}</p></div>
                      <div className="flex items-center gap-5 text-right"><div><p className="text-[10px] uppercase font-black text-stone-400">Orders</p><p className="font-black dark:text-white">{customer.orders}</p></div><div><p className="text-[10px] uppercase font-black text-stone-400">Spend</p><p className="font-black text-brand-500">{formatCurrency(customer.spend)}</p></div><div className="hidden lg:block"><p className="text-[10px] uppercase font-black text-stone-400">Last order</p><p className="text-xs font-bold dark:text-stone-300">{new Date(customer.lastOrder).toLocaleDateString()}</p></div></div>
                    </article>
                  ))}
                  {!customerRows.length && <p className="text-center py-12 text-stone-500">Customers appear here after the first order.</p>}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'analytics' && hasPermission('view_analytics') && (
            <section className="space-y-6">
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cardClass + ' p-4'}><p className="text-[11px] uppercase font-black text-stone-400">Revenue</p><p className="mt-2 text-xl font-black dark:text-white">{formatCurrency(totalRevenue)}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] uppercase font-black text-stone-400">Avg order</p><p className="mt-2 text-xl font-black dark:text-white">{formatCurrency(orders.length ? totalRevenue / orders.length : 0)}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] uppercase font-black text-stone-400">Paid orders</p><p className="mt-2 text-xl font-black dark:text-white">{paidOrders}</p></div>
                <div className={cardClass + ' p-4'}><p className="text-[11px] uppercase font-black text-stone-400">Customers</p><p className="mt-2 text-xl font-black dark:text-white">{customerRows.length}</p></div>
              </div>
              <div className={cardClass + ' p-5 sm:p-6'}>
                <div><h2 className="text-lg font-black dark:text-white">Last 7 days</h2><p className="text-xs text-stone-500 mt-1">Revenue from recorded store orders.</p></div>
                <div className="mt-6 grid grid-cols-7 gap-2 sm:gap-4 items-end h-56">
                  {analyticsDays.map((day) => (
                    <div key={day.label} className="h-full flex flex-col justify-end gap-2 text-center">
                      <span className="text-[10px] font-black text-stone-500">{formatCurrency(day.revenue).replace('EGP ', '')}</span>
                      <div className="h-40 w-full rounded-xl bg-brand-500/10 flex items-end overflow-hidden"><div className="w-full rounded-xl bg-brand-500" style={{ height: Math.max(day.revenue ? 8 : 2, (day.revenue / maxDailyRevenue) * 160) + 'px' }} /></div>
                      <span className="text-[10px] font-black text-stone-400">{day.label}</span>
                      <span className="text-[10px] text-stone-500">{day.orders} orders</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'system' && (isOwner || hasPermission('manage_settings')) && (
            <section className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <a href={window.location.origin + '/sitemap.xml'} target="_blank" rel="noopener noreferrer" className={cardClass + ' p-5 hover:border-brand-500/50 transition'}><CheckCircle2 size={20} className="text-emerald-500" /><p className="mt-3 font-black dark:text-white">Sitemap</p><p className="text-xs text-stone-500 mt-1">Open live sitemap.</p></a>
                <a href={window.location.origin + '/google-products.xml'} target="_blank" rel="noopener noreferrer" className={cardClass + ' p-5 hover:border-brand-500/50 transition'}><CheckCircle2 size={20} className="text-emerald-500" /><p className="mt-3 font-black dark:text-white">Merchant feed</p><p className="text-xs text-stone-500 mt-1">Open product feed.</p></a>
                <a href={window.location.origin + '/feed.xml'} target="_blank" rel="noopener noreferrer" className={cardClass + ' p-5 hover:border-brand-500/50 transition'}><CheckCircle2 size={20} className="text-emerald-500" /><p className="mt-3 font-black dark:text-white">Product RSS</p><p className="text-xs text-stone-500 mt-1">Open recent product feed.</p></a>
                <a href={window.location.origin} target="_blank" rel="noopener noreferrer" className={cardClass + ' p-5 hover:border-brand-500/50 transition'}><Eye size={20} className="text-brand-500" /><p className="mt-3 font-black dark:text-white">Live store</p><p className="text-xs text-stone-500 mt-1">Open storefront.</p></a>
              </div>
              <div className={cardClass + ' p-5 sm:p-6'}>
                <div className="flex items-center gap-3"><Palette size={19} className="text-brand-500" /><div><h2 className="text-lg font-black dark:text-white">Admin workspace</h2><p className="text-xs text-stone-500">Personal appearance and density controls.</p></div></div>
                <div className="grid sm:grid-cols-3 gap-3 mt-5">
                  {(['light', 'dark', 'paper'] as AdminTheme[]).map((theme) => <button key={theme} onClick={() => setAdminTheme(theme)} className={'p-4 rounded-2xl text-left font-black border ' + (adminTheme === theme ? 'bg-brand-500 text-white border-brand-500' : 'bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800 dark:text-white')}>{theme.charAt(0).toUpperCase() + theme.slice(1)}<span className="block text-[11px] mt-1 opacity-75">{theme === 'paper' ? 'Warm paper workspace' : theme === 'dark' ? 'Low-light workspace' : 'Clean default workspace'}</span></button>)}
                </div>
                <button onClick={() => setAdminDensity(adminDensity === 'compact' ? 'comfortable' : 'compact')} className="mt-4 px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white"><SlidersHorizontal size={14} className="inline mr-1" /> {adminDensity === 'compact' ? 'Compact density' : 'Comfortable density'}</button>
              </div>
              <div className={cardClass + ' p-5 sm:p-6'}>
                <div className="flex items-center gap-3"><Activity size={19} className="text-emerald-500" /><div><h2 className="text-lg font-black dark:text-white">Operational summary</h2><p className="text-xs text-stone-500">Current live data loaded into this workspace.</p></div></div>
                <div className="grid sm:grid-cols-3 gap-3 mt-5"><div className={softClass + ' p-4 rounded-2xl'}><p className="font-black dark:text-white">Products</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{products.length} loaded</p></div><div className={softClass + ' p-4 rounded-2xl'}><p className="font-black dark:text-white">Orders</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{orders.length} loaded</p></div><div className={softClass + ' p-4 rounded-2xl'}><p className="font-black dark:text-white">Team</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{admins.length} loaded</p></div></div>
              </div>
            </section>
          )}

          {activeTab === 'discounts' && hasPermission('manage_discounts') && (
            <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
              <form onSubmit={handleAddDiscount} className={cardClass + ' p-5 sm:p-6 h-fit space-y-4'}>
                <div><h2 className="text-lg font-black dark:text-white">Create discount</h2><p className="text-xs text-stone-500 mt-1">Publish a new code without touching the database.</p></div>
                <input required value={newDiscount.code} onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value })} placeholder="WELCOME10" className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-brand-500 outline-none font-bold dark:text-white" />
                <div className="grid grid-cols-2 gap-2"><select value={newDiscount.discount_type} onChange={(e) => setNewDiscount({ ...newDiscount, discount_type: e.target.value as 'percent' | 'fixed' })} className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white"><option value="percent">Percent</option><option value="fixed">Fixed EGP</option></select><input required type="number" min="0.01" value={newDiscount.discount_value} onChange={(e) => setNewDiscount({ ...newDiscount, discount_value: e.target.value })} placeholder="10" className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /></div>
                <input type="number" min="1" value={newDiscount.max_uses} onChange={(e) => setNewDiscount({ ...newDiscount, max_uses: e.target.value })} placeholder="Max uses (optional)" className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" />
                <input type="date" value={newDiscount.expires_at} onChange={(e) => setNewDiscount({ ...newDiscount, expires_at: e.target.value })} className="w-full p-3 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" />
                <button type="submit" className="w-full p-3.5 rounded-xl bg-brand-500 text-white font-black">Create discount</button>
              </form>

              <div className={cardClass + ' p-5 sm:p-6'}>
                <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-black dark:text-white">Discount library</h2><p className="text-xs text-stone-500 mt-1">{discounts.length} total codes</p></div><Tag size={19} className="text-brand-500" /></div>
                <div className="space-y-2.5">
                  {discounts.map((discount) => <div key={discount.id} className={softClass + ' p-4 rounded-2xl flex flex-col sm:flex-row gap-3 sm:items-center'}><div className="min-w-0 flex-1"><p className="font-black dark:text-white">{discount.code}</p><p className="text-xs text-stone-500 mt-1">{discount.discount_type === 'percent' ? discount.discount_value + '%' : formatCurrency(discount.discount_value)} · used {discount.used_count || 0}{discount.max_uses ? ' / ' + discount.max_uses : ''}</p></div><button onClick={() => toggleDiscount(discount)} className={'px-3 py-2 rounded-xl text-xs font-black ' + (discount.active ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500')}>{discount.active ? 'Active' : 'Paused'}</button><button onClick={() => deleteDiscount(discount)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div>)}
                  {!discounts.length && <p className="text-center py-12 text-stone-500">No discount codes yet.</p>}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'team' && (
            <section className="space-y-6">
              <div className={cardClass + ' p-5 sm:p-6'}>
                <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-black dark:text-white">Team & access</h2><p className="text-xs text-stone-500 mt-1">Roles, capabilities and owner-controlled access.</p></div><UserCog size={20} className="text-brand-500" /></div>
                {isOwner && (
                  <form onSubmit={addAdmin} className="grid grid-cols-1 lg:grid-cols-[1fr_180px_1fr_auto] gap-3 items-start p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 mb-5">
                    <input required type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} placeholder="teammate@email.com" className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none dark:text-white" />
                    <select value={newAdminRole} onChange={(e) => { const role = e.target.value as 'admin' | 'staff' | 'owner'; setNewAdminRole(role); setNewAdminPermissions(ROLE_DEFAULTS[role] || []); }} className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-bold outline-none dark:text-white"><option value="staff">Staff</option><option value="admin">Admin</option><option value="owner">Owner</option></select>
                    <div className="flex flex-wrap gap-2">
                      {newAdminRole !== 'owner' && ALL_PERMISSIONS.filter((p) => p.key !== 'manage_team' && p.key !== 'view_audit_log').map((perm) => <label key={perm.key} className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 dark:text-stone-300"><input type="checkbox" checked={newAdminPermissions.includes(perm.key)} onChange={(e) => setNewAdminPermissions((current) => e.target.checked ? [...current, perm.key] : current.filter((p) => p !== perm.key))} className="accent-brand-500" />{perm.label}</label>)}
                    </div>
                    <button type="submit" className="px-4 py-3 rounded-xl bg-brand-500 text-white font-black text-sm">Add</button>
                  </form>
                )}

                <div className="space-y-3">
                  {admins.map((admin) => (
                    <div key={admin.id} className={softClass + ' rounded-2xl p-4'}>
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1"><div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0"><Shield size={18} /></div><div className="min-w-0"><p className="font-black truncate dark:text-white">{admin.email}</p><p className="text-xs text-stone-500 uppercase font-black mt-0.5">{admin.role}</p></div></div>
                        <div className="flex items-center gap-2">{isOwner && admin.role !== 'owner' && <><button onClick={() => { setEditingAdminId(admin.id); setEditingAdminRole((admin.role as 'admin' | 'staff') || 'staff'); setEditingPermissions(admin.permissions || []); }} className="px-3 py-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-xs font-black dark:text-white">Edit access</button><button onClick={() => removeAdmin(admin)} className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></>}</div>
                      </div>
                      {admin.role !== 'owner' && editingAdminId !== admin.id && <div className="flex flex-wrap gap-1.5 mt-3">{(admin.permissions || []).map((perm) => <span key={perm} className="px-2 py-1 rounded-lg bg-stone-200 dark:bg-stone-800 text-[10px] uppercase font-black text-stone-600 dark:text-stone-300">{ALL_PERMISSIONS.find((item) => item.key === perm)?.label || perm}</span>)}{!(admin.permissions || []).length && <span className="text-xs text-stone-400">No extra capabilities</span>}</div>}
                      {editingAdminId === admin.id && (
                        <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-3">
                          <div className="flex gap-2"><select value={editingAdminRole} onChange={(e) => { const role = e.target.value as 'admin' | 'staff' | 'owner'; setEditingAdminRole(role); if (role === 'owner') setEditingPermissions([]); }} className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-bold dark:text-white"><option value="staff">Staff</option><option value="admin">Admin</option><option value="owner">Owner</option></select></div>
                          {editingAdminRole !== 'owner' && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{ALL_PERMISSIONS.map((perm) => <label key={perm.key} className="flex items-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300"><input type="checkbox" checked={editingPermissions.includes(perm.key)} onChange={(e) => setEditingPermissions((current) => e.target.checked ? [...current, perm.key] : current.filter((p) => p !== perm.key))} className="accent-brand-500" />{perm.label}</label>)}</div>}
                          <div className="flex gap-2"><button onClick={() => { const member = admins.find((item) => item.id === admin.id); if (member) saveAdmin(member); }} className="px-4 py-2.5 rounded-xl bg-brand-500 text-white font-black text-xs">Save</button><button onClick={() => setEditingAdminId(null)} className="px-4 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 font-black text-xs dark:text-white">Cancel</button></div>
                        </div>
                      )}
                    </div>
                  ))}
                  {!admins.length && <p className="text-center text-stone-500 py-10">No team records found.</p>}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'settings' && hasPermission('manage_settings') && (
            <section className="space-y-6">
              <form onSubmit={saveSettings} className="space-y-6">
                <div className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Store size={20} /></div><div><h2 className="text-lg font-black dark:text-white">Storefront identity</h2><p className="text-xs text-stone-500">Branding and browser-facing information.</p></div></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><label className="text-xs font-black text-stone-500">Store name</label><input value={siteSettings.store_name} onChange={(e) => setSiteSettings({ ...siteSettings, store_name: e.target.value })} className="w-full mt-2 p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /></div>
                    <div><label className="text-xs font-black text-stone-500">Logo URL</label><input type="url" value={siteSettings.logo_url} onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })} className="w-full mt-2 p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /></div>
                  </div>
                  {siteSettings.logo_url && <img src={siteSettings.logo_url} alt="Store logo preview" className="mt-4 w-14 h-14 rounded-2xl object-cover bg-stone-100" />}
                </div>

                <div className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center gap-3 mb-5"><div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center"><Settings size={20} /></div><div><h2 className="text-lg font-black dark:text-white">Live storefront controls</h2><p className="text-xs text-stone-500">Changes publish to customers after saving.</p></div></div>
                  <textarea value={siteSettings.announcement_banner} onChange={(e) => setSiteSettings({ ...siteSettings, announcement_banner: e.target.value })} placeholder="Announcement banner (empty = hidden)" className="w-full min-h-24 p-4 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none dark:text-white font-bold" />
                  <label className="mt-4 flex items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800"><div><p className="font-black dark:text-white">Maintenance mode</p><p className="text-xs text-stone-500 mt-1">Hide the storefront behind the maintenance screen.</p></div><input type="checkbox" checked={siteSettings.maintenance_mode} onChange={(e) => setSiteSettings({ ...siteSettings, maintenance_mode: e.target.checked })} className="w-5 h-5 accent-brand-500" /></label>
                </div>

                <div className={cardClass + ' p-5 sm:p-6'}>
                  <div className="mb-5"><h2 className="text-lg font-black dark:text-white">Homepage hero</h2><p className="text-xs text-stone-500">Control the first message visitors see.</p></div>
                  <div className="space-y-3"><input value={siteSettings.hero_headline} onChange={(e) => setSiteSettings({ ...siteSettings, hero_headline: e.target.value })} placeholder="Headline" className="w-full p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /><input value={siteSettings.hero_subheadline} onChange={(e) => setSiteSettings({ ...siteSettings, hero_subheadline: e.target.value })} placeholder="Subheadline" className="w-full p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /><input value={siteSettings.hero_image_url} onChange={(e) => setSiteSettings({ ...siteSettings, hero_image_url: e.target.value })} placeholder="Hero image URL" className="w-full p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" /></div>
                  {siteSettings.hero_image_url && <img src={siteSettings.hero_image_url} alt="Hero preview" className="mt-4 w-full max-h-52 rounded-2xl object-cover border border-stone-200 dark:border-stone-800" />}
                </div>

                <div className={cardClass + ' p-5 sm:p-6'}>
                  <div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-black dark:text-white">Footer & partners</h2><p className="text-xs text-stone-500">Manage the footer credit and sponsor list.</p></div><button type="button" onClick={addSponsor} className="px-3.5 py-2.5 rounded-xl bg-brand-500 text-white text-xs font-black"><Plus size={15} className="inline mr-1" /> Sponsor</button></div>
                  <label className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800"><div><p className="font-black dark:text-white">Show footer credit</p><p className="text-xs text-stone-500 mt-1">Toggle the developer credit.</p></div><input type="checkbox" checked={siteSettings.footer_credits_enabled} onChange={(e) => setSiteSettings({ ...siteSettings, footer_credits_enabled: e.target.checked })} className="w-5 h-5 accent-brand-500" /></label>
                  <input value={siteSettings.footer_credits_text} onChange={(e) => setSiteSettings({ ...siteSettings, footer_credits_text: e.target.value })} placeholder="Footer credit text" className="w-full mt-3 p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 outline-none font-bold dark:text-white" />
                  <div className="mt-4 space-y-2">{siteSettings.sponsors.map((sponsor, index) => <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800"><img src={sponsor.logo_url} alt="" className="w-14 h-9 object-contain rounded-lg bg-white" /><div className="min-w-0 flex-1"><p className="font-bold dark:text-white truncate">{sponsor.name}</p><p className="text-[11px] text-stone-500 truncate">{sponsor.url || 'No website link'}</p></div><button type="button" onClick={() => setSiteSettings((current) => ({ ...current, sponsors: current.sponsors.filter((_, i) => i !== index) }))} className="p-2.5 rounded-xl text-red-500 hover:bg-red-500/10"><Trash2 size={15} /></button></div>)}{!siteSettings.sponsors.length && <p className="text-sm text-stone-500 text-center py-6">No sponsors configured.</p>}</div>
                </div>

                <button type="submit" className="w-full py-4 rounded-2xl bg-brand-500 text-white font-black shadow-lg shadow-brand-500/20">Save & publish storefront</button>
              </form>
            </section>
          )}

          {activeTab === 'audit' && (isOwner || hasPermission('view_audit_log')) && (
            <section className={cardClass + ' p-5 sm:p-6'}>
              <div className="flex items-center justify-between mb-5"><div><h2 className="text-lg font-black dark:text-white">Admin activity</h2><p className="text-xs text-stone-500">Recent administrative actions.</p></div><button onClick={refreshAll} className="text-xs font-black text-brand-500">Refresh</button></div>
              <div className="space-y-2.5">{auditLog.map((entry) => <div key={entry.id} className={softClass + ' p-4 rounded-2xl flex flex-col sm:flex-row sm:items-start gap-3'}><div className="min-w-0 flex-1"><p className="font-black text-sm dark:text-white">{entry.admin_email} <span className="text-brand-500">· {entry.action.replaceAll('_', ' ')}</span></p>{entry.details && <p className="text-xs text-stone-500 mt-1 break-words">{JSON.stringify(entry.details)}</p>}</div><span className="text-[11px] text-stone-400 shrink-0">{new Date(entry.created_at).toLocaleString()}</span></div>)}{!auditLog.length && <p className="text-center text-stone-500 py-12">No audit entries yet.</p>}</div>
            </section>
          )}

          {!['overview', 'orders', 'products', 'customers', 'analytics', 'discounts', 'team', 'settings', 'system', 'audit'].includes(activeTab) && (
            <div className={cardClass + ' p-10 text-center text-stone-500'}>This section is not available.</div>
          )}

          {(creatingProduct || editingProduct) && (
            <ProductEditModal
              product={editingProduct}
              onClose={() => { setCreatingProduct(false); setEditingProduct(null); }}
              onSaved={() => { setCreatingProduct(false); setEditingProduct(null); refreshAll(); }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
