import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import type { Order, Product } from '../types';
import { Package, ShoppingBag, Settings as SettingsIcon, Users, Trash2, Plus, LogOut, Shield, TrendingUp, DollarSign, ClipboardList } from 'lucide-react';

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'team' | 'settings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [siteSettings, setSiteSettings] = useState({ announcement_banner: '', maintenance_mode: false, store_name: '', logo_url: '' });

  const [newProduct, setNewProduct] = useState({ name: '', price: '', image_url: '', description: '', category: '' });
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'owner'>('admin');

  const { adminRole, showToast } = useStore();
  const isOwner = adminRole === 'owner';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setOrders(data);
    } else if (activeTab === 'products') {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    } else if (activeTab === 'team') {
      const { data } = await supabase.from('admin_users').select('id, email, role, created_at').order('created_at', { ascending: true });
      if (data) setAdmins(data);
    } else if (activeTab === 'settings') {
      const { data } = await supabase.from('site_settings').select('*').single();
      if (data) setSiteSettings({
        announcement_banner: data.announcement_banner || '',
        maintenance_mode: data.maintenance_mode,
        store_name: data.store_name || 'Eldukkan',
        logo_url: data.logo_url || '',
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map((o) => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await supabase.from('products').delete().eq('id', id);
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from('admin_users').insert([{ email, role: newAdminRole }]);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    setNewAdminEmail('');
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
    setAdmins(admins.filter((a) => a.id !== id));
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('site_settings')
      .update({
        announcement_banner: siteSettings.announcement_banner || null,
        maintenance_mode: siteSettings.maintenance_mode,
        store_name: siteSettings.store_name || 'Eldukkan',
        logo_url: siteSettings.logo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    if (error) {
      showToast(`Error: ${error.message}`);
      return;
    }
    showToast('Site settings updated — live on the storefront now.');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">Admin Command Center</h1>
          <p className="text-zinc-500 font-medium text-sm">
            Manage live transactions, inventory, and your team.
            {isOwner && <span className="ml-2 text-amber-500 font-bold">Owner access</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-2 flex-1 md:flex-none flex-wrap">
            <button onClick={() => setActiveTab('orders')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
              <Package size={18} /> Orders
            </button>
            <button onClick={() => setActiveTab('products')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
              <ShoppingBag size={18} /> Inventory
            </button>
            <button onClick={() => setActiveTab('team')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'team' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
              <Users size={18} /> Team
            </button>
            <button onClick={() => setActiveTab('settings')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'settings' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
              <SettingsIcon size={18} /> Settings
            </button>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            title="Sign out"
            className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-red-500 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase"><DollarSign size={13} /> Total Revenue</span>
              <p className="text-2xl font-black dark:text-white">EGP {orders.reduce((sum, o) => sum + (o.total || 0), 0).toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase"><ClipboardList size={13} /> Total Orders</span>
              <p className="text-2xl font-black dark:text-white">{orders.length}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase"><TrendingUp size={13} /> Avg Order Value</span>
              <p className="text-2xl font-black dark:text-white">
                EGP {orders.length > 0 ? Math.round(orders.reduce((sum, o) => sum + (o.total || 0), 0) / orders.length).toLocaleString() : 0}
              </p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase"><Package size={13} /> Pending</span>
              <p className="text-2xl font-black dark:text-white">{orders.filter((o) => o.status === 'pending').length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-black dark:text-white mb-4">Customer Transactions</h2>
          {orders.length === 0 ? (
            <p className="text-zinc-500 text-center py-12">No orders recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-xs uppercase font-bold px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg">{order.payment_method}</span>
                      {order.payment_status && (
                        <span className={`text-xs uppercase font-bold px-2.5 py-1 rounded-lg ${
                          order.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          order.payment_status === 'failed' ? 'bg-red-500/10 text-red-500' :
                          'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                        }`}>{order.payment_status}</span>
                      )}
                    </div>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">{order.customer_name} &bull; <span className="text-zinc-500">{order.customer_phone}</span></p>
                    <p className="text-xs text-zinc-500">{order.address}</p>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    <span className="text-xl font-black text-amber-500">EGP {order.total}</span>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-bold text-sm p-3 rounded-xl outline-none dark:text-white cursor-pointer"
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

      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm h-fit">
            <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-amber-500" /> Add New Item
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input required type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <input required type="number" placeholder="Price (EGP)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <input required type="url" placeholder="Image URL" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <input type="text" placeholder="Category (e.g. Streetwear)" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <textarea placeholder="Product Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none min-h-[80px] dark:text-white" />
              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition shadow-lg shadow-amber-500/20">
                Publish Product
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-black dark:text-white mb-4">Current Inventory ({products.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {products.map((product) => (
                <div key={product.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700" />
                    <div>
                      <h4 className="font-bold text-base dark:text-white">{product.name}</h4>
                      <p className="text-amber-500 font-black">EGP {product.price}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(product.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {isOwner && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm h-fit">
              <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
                <Plus size={20} className="text-amber-500" /> Add Admin
              </h2>
              <form onSubmit={handleAddAdmin} className="space-y-4">
                <input required type="email" placeholder="teammate@email.com" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
                <select value={newAdminRole} onChange={e => setNewAdminRole(e.target.value as 'admin' | 'owner')} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white">
                  <option value="admin">Admin</option>
                  <option value="owner">Owner (can manage team)</option>
                </select>
                <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition shadow-lg shadow-amber-500/20">
                  Whitelist Email
                </button>
                <p className="text-xs text-zinc-500">They'll be able to register at the admin login page using this exact email.</p>
              </form>
            </div>
          )}

          <div className={`${isOwner ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3`}>
            <h2 className="text-xl font-black dark:text-white mb-4">Team ({admins.length})</h2>
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="font-bold dark:text-white">{admin.email}</p>
                    <p className="text-xs text-zinc-500 uppercase font-bold">{admin.role}</p>
                  </div>
                </div>
                {isOwner && (
                  <button onClick={() => handleRemoveAdmin(admin.id, admin.email)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black dark:text-white">Site Settings</h2>
              <p className="text-zinc-500 text-sm">Changes here go live on the storefront immediately.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Store Name</label>
                <input
                  type="text"
                  placeholder="Eldukkan"
                  value={siteSettings.store_name}
                  onChange={(e) => setSiteSettings({ ...siteSettings, store_name: e.target.value })}
                  className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Logo URL</label>
                <input
                  type="url"
                  placeholder="https://... (leave empty for default)"
                  value={siteSettings.logo_url}
                  onChange={(e) => setSiteSettings({ ...siteSettings, logo_url: e.target.value })}
                  className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none"
                />
              </div>
            </div>
            {siteSettings.logo_url && (
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 w-fit">
                <img src={siteSettings.logo_url} alt="Logo preview" className="w-10 h-10 rounded-xl object-cover" />
                <span className="text-xs text-zinc-500 font-bold">Logo preview</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Announcement Banner</label>
              <textarea
                placeholder="e.g. Free delivery this weekend on orders over EGP 500"
                value={siteSettings.announcement_banner}
                onChange={(e) => setSiteSettings({ ...siteSettings, announcement_banner: e.target.value })}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none min-h-[80px]"
              />
              <p className="text-xs text-zinc-500">Leave empty to hide the banner.</p>
            </div>

            <label className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer">
              <div>
                <p className="font-bold dark:text-white">Maintenance Mode</p>
                <p className="text-xs text-zinc-500">Shows a maintenance page to everyone except signed-in admins.</p>
              </div>
              <input
                type="checkbox"
                checked={siteSettings.maintenance_mode}
                onChange={(e) => setSiteSettings({ ...siteSettings, maintenance_mode: e.target.checked })}
                className="w-5 h-5 accent-amber-500"
              />
            </label>

            <button onClick={handleSaveSettings} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-xl transition shadow-lg shadow-amber-500/20">
              Save & Publish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}