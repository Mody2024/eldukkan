import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Order, AdminUser } from '../types';
import { Lock, Plus, Trash2, ShieldCheck, Key, UserPlus } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [currentPin, setCurrentPin] = useState('123456');
  const [newPinInput, setNewPinInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [adminList, setAdminList] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [imageUrl, setImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState('');
  const [description, setDescription] = useState('');

  const fetchAdminData = async () => {
    // Get Security PIN
    const { data: secData } = await supabase.from('store_settings').select('admin_pin').eq('id', 1).single();
    if (secData) setCurrentPin(secData.admin_pin);

    // Get Products
    const { data: pData } = await supabase.from('products').select('*');
    if (pData) setProducts(pData);

    // Get Orders
    const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (oData) setOrders(oData as Order[]);

    // Get Admins
    const { data: aData } = await supabase.from('admin_users').select('*');
    if (aData) setAdminList(aData);
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === currentPin) {
      setAuthed(true);
    } else {
      alert('Incorrect Security PIN');
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPinInput) return;
    const { error } = await supabase.from('store_settings').update({ admin_pin: newPinInput }).eq('id', 1);
    if (!error) {
      setCurrentPin(newPinInput);
      setNewPinInput('');
      alert('Admin Security PIN updated successfully!');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    const { error } = await supabase.from('admin_users').insert([{ email: newAdminEmail.trim().toLowerCase() }]);
    if (error) {
      alert(error.message);
    } else {
      setNewAdminEmail('');
      fetchAdminData();
      alert('New admin email added! They can now access the quick admin button when signed in.');
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    await supabase.from('admin_users').delete().eq('id', id);
    fetchAdminData();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const imageArray = extraImages.split(',').map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase.from('products').insert([
      {
        name,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400',
        images: imageArray,
        stock: 25,
        rating: 5.0,
        is_active: true
      }
    ]);

    if (error) {
      alert(error.message);
    } else {
      alert('Product added to live inventory!');
      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      setExtraImages('');
      fetchAdminData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    fetchAdminData();
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    fetchAdminData();
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto my-16 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center space-y-4">
        <Lock className="mx-auto text-amber-500" size={40} />
        <h2 className="text-xl font-bold">Eldukkan Encrypted Admin Vault</h2>
        <p className="text-xs text-zinc-500">Enter your master PIN code to unlock administration controls.</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" placeholder="Enter Security PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-center text-white text-lg tracking-widest font-mono" />
          <button type="submit" className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-600 transition">Unlock Controls</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
        <h1 className="text-2xl font-black text-amber-500 flex items-center gap-2">
          <ShieldCheck size={28} /> Control Center
        </h1>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-full border border-emerald-500/20">Authenticated Admin Session</span>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Product Creation Form */}
        <form onSubmit={handleAddProduct} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-3 h-fit">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white"><Plus size={18} /> Publish New Product</h2>
          <input type="text" placeholder="Product Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <input type="number" step="0.01" placeholder="Price ($)" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white">
            <option value="Electronics">Electronics</option>
            <option value="Fashion">Fashion</option>
            <option value="Grocery">Grocery</option>
            <option value="Tech">Tech</option>
          </select>
          <input type="url" placeholder="Main Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <input type="text" placeholder="Additional Image URLs (Comma separated)" value={extraImages} onChange={(e) => setExtraImages(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white" />
          <textarea placeholder="Description & Features" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white h-20" />
          <button type="submit" className="w-full py-2.5 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-600 transition">Publish Product</button>
        </form>

        <div className="md:col-span-2 space-y-6">
          {/* Inventory */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Live Inventory ({products.length})</h2>
            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
              {products.map((p) => (
                <div key={p.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-semibold text-sm text-white">{p.name}</h3>
                      <p className="text-xs text-amber-500">${p.price} • {p.category}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Orders Management */}
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Customer Orders ({orders.length})</h2>
            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
              {orders.map((o) => (
                <div key={o.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center text-amber-400 font-bold">
                    <span>{o.customer_name} ({o.customer_phone})</span>
                    <span className="text-sm">${o.total}</span>
                  </div>
                  <p className="text-zinc-400">Method: <span className="uppercase text-white">{o.payment_method}</span> | Ref: {o.payment_reference || 'N/A'}</p>
                  <p className="text-zinc-500">{o.address}, {o.city}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-zinc-400 font-semibold">Status:</span>
                    <select value={o.status} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)} className="bg-zinc-800 border border-zinc-700 text-amber-400 font-bold rounded px-2 py-1">
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manage Admins & Passcode Security */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Manage Admins */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400"><UserPlus size={16} /> Authorized Admins</h3>
              <form onSubmit={handleAddAdmin} className="flex gap-2">
                <input type="email" placeholder="admin@gmail.com" required value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="flex-1 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white" />
                <button type="submit" className="bg-amber-500 text-black font-bold px-3 rounded-lg text-xs">Add</button>
              </form>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {adminList.map((a) => (
                  <div key={a.id} className="flex justify-between items-center bg-zinc-950 p-2 rounded text-xs text-zinc-300">
                    <span>{a.email}</span>
                    <button onClick={() => handleRemoveAdmin(a.id)} className="text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Change PIN Security */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400"><Key size={16} /> Update Security Passcode</h3>
              <form onSubmit={handleUpdatePin} className="space-y-2">
                <input type="password" placeholder="New Secret PIN" value={newPinInput} onChange={(e) => setNewPinInput(e.target.value)} className="w-full p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white font-mono" />
                <button type="submit" className="w-full py-2 bg-zinc-800 border border-amber-500/50 text-amber-400 hover:bg-amber-500 hover:text-black font-bold rounded-lg text-xs transition">Change Passcode</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};