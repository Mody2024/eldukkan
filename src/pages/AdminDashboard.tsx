import { useEffect, useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import Papa from 'papaparse';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Order, Product, DiscountCode } from '../types';
import {
  Package, ShoppingBag, Settings as SettingsIcon, Users, Trash2, Plus, LogOut, Shield,
  TrendingUp, DollarSign, ClipboardList, Tag, ScrollText, Power, Upload, FileUp, Star,
} from 'lucide-react';

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
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

const ALL_PERMISSIONS: { key: string; label: string }[] = [
  { key: 'manage_products', label: 'Manage Products' },
  { key: 'manage_orders', label: 'Manage Orders' },
  { key: 'manage_discounts', label: 'Manage Discounts' },
  { key: 'view_analytics', label: 'View Analytics' },
  { key: 'manage_settings', label: 'Manage Site Settings' },
  { key: 'manual_payment_override', label: 'Manual Payment Override' },
  { key: 'export_reports', label: 'Export Reports' },
];

const ROLE_DEFAULTS: Record<string, string[]> = {
  admin: ['manage_products', 'manage_orders', 'manage_discounts', 'view_analytics', 'manual_payment_override', 'export_reports'],
  staff: ['manage_orders'],
  owner: [],
};

type Tab = 'orders' | 'products' | 'discounts' | 'team' | 'settings' | 'audit';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    announcement_banner: '', maintenance_mode: false, store_name: '', logo_url: '',
    hero_headline: '', hero_subheadline: '', hero_image_url: '',
  });

  const [newProduct, setNewProduct] = useState({ name: '', price: '', image_url: '', description: '', category: '' });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'staff' | 'owner'>('admin');
  const [newAdminPermissions, setNewAdminPermissions] = useState<string[]>(ROLE_DEFAULTS.admin);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [newDiscount, setNewDiscount] = useState({ code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: '', max_uses: '', expires_at: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);

  const { adminRole, userEmail, hasPermission, showToast } = useStore();
  const isOwner = adminRole === 'owner';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const logAction = async (action: string, details?: Record<string, unknown>) => {
    await supabase.from('admin_activity_log').insert([{ admin_email: userEmail, action, details: details ?? null }]);
  };

  const fetchData = async () => {
    if (activeTab === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setOrders(data);
    } else if (activeTab === 'products') {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    } else if (activeTab === 'discounts') {
      const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
      if (data) setDiscounts(data);
    } else if (activeTab === 'team') {
      const { data } = await supabase.from('admin_users').select('id, email, role, permissions, created_at').order('created_at', { ascending: true });
      if (data) setAdmins(data as AdminUserRow[]);
    } else if (activeTab === 'settings') {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSiteSettings({
        announcement_banner: data.announcement_banner || '',
        maintenance_mode: data.maintenance_mode,
        store_name: data.store_name || 'Eldukkan',
        logo_url: data.logo_url || '',
        hero_headline: data.hero_headline || '',
        hero_subheadline: data.hero_subheadline || '',
        hero_image_url: data.hero_image_url || '',
      });
    } else if (activeTab === 'audit') {
      const { data } = await supabase.from('admin_activity_log').select('*').order('created_at', { ascending: false }).limit(100);
      if (data) setAuditLog(data as AuditLogRow[]);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map((o) => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    if (!confirm('Mark this order as paid? Use this for phone orders, bank transfers, or other manual payment confirmations.')) return;
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map((o) => o.id === orderId ? { ...o, payment_status: 'paid' } : o));
      logAction('manual_payment_override', { order_id: orderId });
      showToast('Order marked as paid.');
    }
  };

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      { name: newProduct.name, price: parseFloat(newProduct.price), image_url: newProduct.image_url, description: newProduct.description, category: newProduct.category || null, is_active: true }
    ]);
    if (!error) {
      setNewProduct({ name: '', price: '', image_url: '', description: '', category: '' });
      fetchData();
      showToast('Product published.');
    } else {
      showToast(`Error: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This can't be undone.`)) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(products.filter((p) => p.id !== id));
    logAction('delete_product', { product_id: id, name });
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      setNewProduct((prev) => ({ ...prev, image_url: data.publicUrl }));
      showToast('Image uploaded.');
    } catch (err) {
      showToast(`Upload failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCsvImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingCsv(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Record<string, string>[];
        const toInsert = rows
          .filter((r) => r.name && r.price)
          .map((r) => ({
            name: r.name,
            price: parseFloat(r.price),
            description: r.description || '',
            category: r.category || null,
            image_url: r.image_url || '',
            stock: r.stock ? parseInt(r.stock, 10) : null,
            is_active: true,
          }));

        if (toInsert.length === 0) {
          showToast('No valid rows found. Expected columns: name, price, description, category, image_url, stock');
          setImportingCsv(false);
          return;
        }

        const { error } = await supabase.from('products').insert(toInsert);
        setImportingCsv(false);
        if (error) {
          showToast(`Import failed: ${error.message}`);
          return;
        }
        logAction('bulk_import_products', { count: toInsert.length });
        showToast(`Imported ${toInsert.length} products.`);
        fetchData();
      },
      error: (err) => {
        setImportingCsv(false);
        showToast(`Could not read CSV: ${err.message}`);
      },
    });
  };

  const handleToggleFeatured = async (product: Product) => {
    const { error } = await supabase.from('products').update({ featured: !product.featured }).eq('id', product.id);
    if (!error) {
      setProducts(products.map((p) => p.id === product.id ? { ...p, featured: !p.featured } : p));
    }
  };

  const handleAddDiscount = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('discount_codes').insert([{
      code: newDiscount.code.trim().toUpperCase(),
      discount_type: newDiscount.discount_type,
      discount_value: parseFloat(newDiscount.discount_value),
      max_uses: newDiscount.max_uses ? parseInt(newDiscount.max_uses, 10) : null,
      expires_at: newDiscount.expires_at || null,
    }]);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    setNewDiscount({ code: '', discount_type: 'percent', discount_value: '', max_uses: '', expires_at: '' });
    fetchData();
    showToast('Discount code created.');
  };

  const handleToggleDiscount = async (id: string, active: boolean) => {
    await supabase.from('discount_codes').update({ active: !active }).eq('id', id);
    setDiscounts(discounts.map((d) => d.id === id ? { ...d, active: !active } : d));
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount code?')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    setDiscounts(discounts.filter((d) => d.id !== id));
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from('admin_users').insert([{ email, role: newAdminRole, permissions: newAdminPermissions }]);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    logAction('add_admin', { email, role: newAdminRole, permissions: newAdminPermissions });
    setNewAdminEmail('');
    setNewAdminRole('admin');
    setNewAdminPermissions(ROLE_DEFAULTS.admin);
    showToast(`${email} whitelisted. They can now register at the admin login with this email.`);
    fetchData();
  };

  const handleRemoveAdmin = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from the admin team?`)) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    logAction('remove_admin', { email });
    setAdmins(admins.filter((a) => a.id !== id));
  };

  const startEditingPermissions = (admin: AdminUserRow) => {
    setEditingAdminId(admin.id);
    setEditingPermissions(admin.permissions ?? []);
  };

  const saveEditedPermissions = async (id: string, email: string) => {
    const { error } = await supabase.from('admin_users').update({ permissions: editingPermissions }).eq('id', id);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    setAdmins(admins.map((a) => a.id === id ? { ...a, permissions: editingPermissions } : a));
    logAction('update_admin_permissions', { email, permissions: editingPermissions });
    setEditingAdminId(null);
    showToast('Permissions updated.');
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('site_settings')
      .update({
        announcement_banner: siteSettings.announcement_banner || null,
        maintenance_mode: siteSettings.maintenance_mode,
        store_name: siteSettings.store_name || 'Eldukkan',
        logo_url: siteSettings.logo_url || null,
        hero_headline: siteSettings.hero_headline || null,
        hero_subheadline: siteSettings.hero_subheadline || null,
        hero_image_url: siteSettings.hero_image_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    logAction('update_site_settings');
    showToast('Site settings updated — live on the storefront now.');
  };

  const exportOrdersCsv = () => {
    const header = 'Order ID,Customer,Phone,Total,Status,Payment Status,Date\n';
    const rows = orders.map((o) =>
      `${o.id},${o.customer_name},${o.customer_phone},${o.total},${o.status},${o.payment_status ?? ''},${o.created_at}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logAction('export_orders_csv', { count: orders.length });
  };

  const TABS: { id: Tab; label: string; icon: typeof Package; visible: boolean }[] = [
    { id: 'orders', label: 'Orders', icon: Package, visible: hasPermission('manage_orders') },
    { id: 'products', label: 'Inventory', icon: ShoppingBag, visible: hasPermission('manage_products') },
    { id: 'discounts', label: 'Discounts', icon: Tag, visible: hasPermission('manage_discounts') },
    { id: 'team', label: 'Team', icon: Users, visible: true }, // read-only view for everyone; edit controls are owner-gated below
    { id: 'settings', label: 'Settings', icon: SettingsIcon, visible: hasPermission('manage_settings') },
    { id: 'audit', label: 'Audit Log', icon: ScrollText, visible: isOwner },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">Admin Command Center</h1>
          <p className="text-stone-500 font-medium text-sm">
            Manage live transactions, inventory, and your team.
            {isOwner && <span className="ml-2 text-brand-500 font-bold">Owner access</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl gap-2 flex-1 md:flex-none flex-wrap">
            {TABS.filter((t) => t.visible).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-md' : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'}`}
              >
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="p-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-red-500 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {activeTab === 'orders' && hasPermission('manage_orders') && (
        <div className="space-y-6">
          {hasPermission('view_analytics') && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase"><DollarSign size={13} /> Total Revenue</span>
                <p className="text-2xl font-black dark:text-white">EGP {orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase"><ClipboardList size={13} /> Total Orders</span>
                <p className="text-2xl font-black dark:text-white">{orders.length}</p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase"><TrendingUp size={13} /> Avg Order Value</span>
                <p className="text-2xl font-black dark:text-white">
                  EGP {orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + (o.total || 0), 0) / orders.length).toLocaleString() : 0}
                </p>
              </div>
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase"><Package size={13} /> Pending</span>
                <p className="text-2xl font-black dark:text-white">{orders.filter((o) => o.status === 'pending').length}</p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black dark:text-white">Customer Transactions</h2>
              {hasPermission('export_reports') && (
                <button onClick={exportOrdersCsv} className="text-xs font-bold px-4 py-2 bg-stone-100 dark:bg-stone-800 rounded-xl dark:text-white hover:bg-stone-200 dark:hover:bg-stone-700 transition">
                  Export CSV
                </button>
              )}
            </div>
            {orders.length === 0 ? (
              <p className="text-stone-500 text-center py-12">No orders recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-stone-50 dark:bg-stone-950 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-black text-lg dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-xs uppercase font-bold px-2.5 py-1 bg-brand-500/10 text-brand-500 rounded-lg">{order.payment_method}</span>
                        {order.payment_status && (
                          <span className={`text-xs uppercase font-bold px-2.5 py-1 rounded-lg ${
                            order.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                            order.payment_status === 'failed' ? 'bg-red-500/10 text-red-500' :
                            'bg-stone-200 dark:bg-stone-800 text-stone-500'
                          }`}>{order.payment_status}</span>
                        )}
                        {order.discount_code && (
                          <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500">{order.discount_code}</span>
                        )}
                      </div>
                      <p className="font-bold text-stone-700 dark:text-stone-300">{order.customer_name} &bull; <span className="text-stone-500">{order.customer_phone}</span></p>
                      <p className="text-xs text-stone-500">{order.address}</p>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
                      <span className="text-xl font-black text-brand-500">EGP {order.total}</span>
                      {hasPermission('manual_payment_override') && order.payment_status !== 'paid' && (
                        <button onClick={() => handleMarkPaid(order.id)} title="Mark as paid manually" className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition">
                          <DollarSign size={16} />
                        </button>
                      )}
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 font-bold text-sm p-3 rounded-xl outline-none dark:text-white cursor-pointer"
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && hasPermission('manage_products') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm h-fit">
            <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-brand-500" /> Add New Item
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input required type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              <input required type="number" placeholder="Price (EGP)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />

              <div className="space-y-2">
                <input required type="url" placeholder="Image URL" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
                <label className="flex items-center justify-center gap-2 p-2.5 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-bold dark:text-white cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition">
                  <Upload size={14} /> {uploadingImage ? 'Uploading...' : 'Or upload an image file'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} className="hidden" />
                </label>
                {newProduct.image_url && (
                  <img src={newProduct.image_url} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-stone-200 dark:border-stone-700" />
                )}
              </div>

              <input type="text" placeholder="Category (e.g. Streetwear)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              <textarea placeholder="Product Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none min-h-[80px] dark:text-white" />
              <button type="submit" className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition shadow-lg shadow-brand-500/20">
                Publish Product
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800">
              <label className="flex items-center justify-center gap-2 p-3 bg-stone-50 dark:bg-stone-950 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 cursor-pointer hover:border-brand-500 transition">
                <FileUp size={14} /> {importingCsv ? 'Importing...' : 'Bulk import from CSV'}
                <input type="file" accept=".csv" onChange={handleCsvImport} disabled={importingCsv} className="hidden" />
              </label>
              <p className="text-[10px] text-stone-400 mt-1.5 text-center">Columns: name, price, description, category, image_url, stock</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-black dark:text-white mb-4">Current Inventory ({products.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-4">
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-stone-200 dark:border-stone-700" />
                    <div>
                      <h4 className="font-bold text-base dark:text-white">{product.name}</h4>
                      <p className="text-brand-500 font-black">EGP {product.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFeatured(product)}
                      title={product.featured ? 'Remove from Featured' : 'Add to Featured'}
                      className={`p-3 rounded-xl transition ${product.featured ? 'bg-brand-500/10 text-brand-500' : 'text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}
                    >
                      <Star size={18} className={product.featured ? 'fill-brand-500' : ''} />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'discounts' && hasPermission('manage_discounts') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm h-fit">
            <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-brand-500" /> New Discount Code
            </h2>
            <form onSubmit={handleAddDiscount} className="space-y-4">
              <input required type="text" placeholder="CODE (e.g. WELCOME10)" value={newDiscount.code} onChange={e => setNewDiscount({...newDiscount, code: e.target.value.toUpperCase()})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white uppercase" />
              <div className="grid grid-cols-2 gap-3">
                <select value={newDiscount.discount_type} onChange={e => setNewDiscount({...newDiscount, discount_type: e.target.value as 'percent' | 'fixed'})} className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white">
                  <option value="percent">Percent Off</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
                <input required type="number" placeholder={newDiscount.discount_type === 'percent' ? '10 (%)' : '50 (EGP)'} value={newDiscount.discount_value} onChange={e => setNewDiscount({...newDiscount, discount_value: e.target.value})} className="p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              </div>
              <input type="number" placeholder="Max uses (optional)" value={newDiscount.max_uses} onChange={e => setNewDiscount({...newDiscount, max_uses: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              <div>
                <label className="text-xs font-bold text-stone-500">Expires (optional)</label>
                <input type="date" value={newDiscount.expires_at} onChange={e => setNewDiscount({...newDiscount, expires_at: e.target.value})} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              </div>
              <button type="submit" className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition shadow-lg shadow-brand-500/20">
                Create Code
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
            <h2 className="text-xl font-black dark:text-white mb-4">Active Codes ({discounts.length})</h2>
            {discounts.length === 0 ? (
              <p className="text-stone-500 text-center py-12">No discount codes yet.</p>
            ) : discounts.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${d.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-stone-200 dark:bg-stone-800 text-stone-400'}`}>
                    <Tag size={18} />
                  </div>
                  <div>
                    <p className="font-black dark:text-white">{d.code}</p>
                    <p className="text-xs text-stone-500">
                      {d.discount_type === 'percent' ? `${d.discount_value}% off` : `EGP ${d.discount_value} off`}
                      {' · '}{d.used_count}{d.max_uses ? `/${d.max_uses}` : ''} used
                      {d.expires_at ? ` · expires ${new Date(d.expires_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleDiscount(d.id, d.active)} title={d.active ? 'Deactivate' : 'Activate'} className={`p-2.5 rounded-xl transition ${d.active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800'}`}>
                    <Power size={16} />
                  </button>
                  <button onClick={() => handleDeleteDiscount(d.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isOwner && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
                <Plus size={20} className="text-brand-500" /> Add Admin
              </h2>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <input required type="email" placeholder="teammate@email.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
                <select
                  value={newAdminRole}
                  onChange={e => {
                    const role = e.target.value as 'admin' | 'staff' | 'owner';
                    setNewAdminRole(role);
                    setNewAdminPermissions(ROLE_DEFAULTS[role] ?? []);
                  }}
                  className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white"
                >
                  <option value="staff">Staff (order handling only)</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner (full access, manages team)</option>
                </select>

                {newAdminRole !== 'owner' && (
                  <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800">
                    <p className="text-xs font-bold text-stone-500 uppercase">Capabilities</p>
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-sm dark:text-stone-300">
                        <input
                          type="checkbox"
                          checked={newAdminPermissions.includes(perm.key)}
                          onChange={(e) => setNewAdminPermissions(
                            e.target.checked ? [...newAdminPermissions, perm.key] : newAdminPermissions.filter((p) => p !== perm.key)
                          )}
                          className="accent-brand-500"
                        />
                        {perm.label}
                      </label>
                    ))}
                  </div>
                )}

                <button type="submit" className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition shadow-lg shadow-brand-500/20">
                  Whitelist Email
                </button>
                <p className="text-xs text-stone-500">They'll be able to register at the admin login page using this exact email.</p>
              </form>
            </div>
          )}

          <div className={`${isOwner ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-3`}>
            <h2 className="text-xl font-black dark:text-white mb-4">Team ({admins.length})</h2>
            {admins.map((admin) => (
              <div key={admin.id} className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="font-bold dark:text-white">{admin.email}</p>
                      <p className="text-xs text-stone-500 uppercase font-bold">{admin.role}</p>
                    </div>
                  </div>
                  {isOwner && admin.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEditingPermissions(admin)} className="text-xs font-bold px-3 py-2 bg-stone-200 dark:bg-stone-800 rounded-lg dark:text-white hover:bg-stone-300 dark:hover:bg-stone-700 transition">
                        Edit access
                      </button>
                      <button onClick={() => handleRemoveAdmin(admin.id, admin.email)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {admin.role !== 'owner' && editingAdminId !== admin.id && (
                  <div className="flex flex-wrap gap-1.5">
                    {(admin.permissions ?? []).length === 0 ? (
                      <span className="text-xs text-stone-400">No capabilities granted</span>
                    ) : (admin.permissions ?? []).map((p) => (
                      <span key={p} className="text-[10px] font-bold px-2 py-1 bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg uppercase">
                        {ALL_PERMISSIONS.find((ap) => ap.key === p)?.label ?? p}
                      </span>
                    ))}
                  </div>
                )}

                {editingAdminId === admin.id && (
                  <div className="space-y-2 p-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 text-sm dark:text-stone-300">
                        <input
                          type="checkbox"
                          checked={editingPermissions.includes(perm.key)}
                          onChange={(e) => setEditingPermissions(
                            e.target.checked ? [...editingPermissions, perm.key] : editingPermissions.filter((p) => p !== perm.key)
                          )}
                          className="accent-brand-500"
                        />
                        {perm.label}
                      </label>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => saveEditedPermissions(admin.id, admin.email)} className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-lg transition">
                        Save
                      </button>
                      <button onClick={() => setEditingAdminId(null)} className="px-4 py-2 bg-stone-200 dark:bg-stone-800 dark:text-white font-bold text-sm rounded-lg transition">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && hasPermission('manage_settings') && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-brand-500/10 text-brand-500 rounded-2xl">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black dark:text-white">Site Settings</h2>
              <p className="text-stone-500 text-sm">Changes here go live on the storefront immediately.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-bold text-sm text-stone-700 dark:text-stone-300">Store Name</label>
                <input
                  type="text"
                  placeholder="Eldukkan"
                  value={siteSettings.store_name}
                  onChange={(e) => setSiteSettings({ ...siteSettings, store_name: e.target.value })}
                  className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm text-stone-700 dark:text-stone-300">Logo URL</label>
                <input
                  type="url"
                  placeholder="https://... (leave empty for default)"
                  value={siteSettings.logo_url}
                  onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                  className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none"
                />
              </div>
            </div>
            {siteSettings.logo_url && (
              <div className="flex items-center gap-3 p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200 dark:border-stone-800 w-fit">
                <img src={siteSettings.logo_url} alt="Logo preview" className="w-10 h-10 rounded-xl object-cover" />
                <span className="text-xs text-stone-500 font-bold">Logo preview</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-bold text-sm text-stone-700 dark:text-stone-300">Announcement Banner</label>
              <textarea
                placeholder="e.g. Free delivery this weekend on orders over EGP 500"
                value={siteSettings.announcement_banner}
                onChange={(e) => setSiteSettings({ ...siteSettings, announcement_banner: e.target.value })}
                className="w-full p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none min-h-[80px]"
              />
              <p className="text-xs text-stone-500">Leave empty to hide the banner.</p>
            </div>

            <label className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl cursor-pointer">
              <div>
                <p className="font-bold dark:text-white">Maintenance Mode</p>
                <p className="text-xs text-stone-500">Shows a maintenance page to everyone except signed-in admins.</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.maintenance_mode}
                onChange={(e) => setSiteSettings({ ...siteSettings, maintenance_mode: e.target.checked })}
                className="w-5 h-5 accent-brand-500"
              />
            </label>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-4">
              <p className="font-bold text-sm dark:text-white">Homepage Hero (leave blank to use defaults)</p>
              <input
                type="text"
                placeholder="Custom headline"
                value={siteSettings.hero_headline}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_headline: e.target.value })}
                className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none"
              />
              <input
                type="text"
                placeholder="Custom subheadline"
                value={siteSettings.hero_subheadline}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_subheadline: e.target.value })}
                className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none"
              />
              <input
                type="url"
                placeholder="Hero image URL (optional)"
                value={siteSettings.hero_image_url}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_image_url: e.target.value })}
                className="w-full p-3.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl font-bold dark:text-white outline-none"
              />
            </div>

            <button onClick={handleSaveSettings} className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-black text-lg rounded-xl transition shadow-lg shadow-brand-500/20">
              Save & Publish
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && isOwner && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
            <ScrollText size={20} className="text-brand-500" /> Admin Activity Log
          </h2>
          {auditLog.length === 0 ? (
            <p className="text-stone-500 text-center py-12">No activity recorded yet.</p>
          ) : auditLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-200 dark:border-stone-800">
              <div>
                <p className="font-bold text-sm dark:text-white">{entry.admin_email} — <span className="text-brand-500">{entry.action.replace(/_/g, ' ')}</span></p>
                {entry.details && <p className="text-xs text-stone-500 mt-0.5">{JSON.stringify(entry.details)}</p>}
              </div>
              <span className="text-xs text-stone-400 shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}