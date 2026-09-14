import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Product, Order } from '../types';
import { Lock, Plus, Trash2 } from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const fetchAdminData = async () => {
    const { data: pData } = await supabase.from('products').select('*');
    if (pData) setProducts(pData);
    const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (oData) setOrders(oData as Order[]);
  };

  useEffect(() => {
    if (authed) fetchAdminData();
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === '123456') {
      setAuthed(true);
    } else {
      alert('Incorrect Security PIN');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      {
        name,
        description,
        price: parseFloat(price),
        category,
        image_url: imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&q=80&w=400',
        stock: 20,
        rating: 4.8,
        is_active: true
      }
    ]);
    if (error) {
      alert(error.message);
    } else {
      alert('Product created!');
      setName('');
      setPrice('');
      setDescription('');
      setImageUrl('');
      fetchAdminData();
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('products').delete().eq('id', id);
    fetchAdminData();
  };

  if (!authed) {
    return (
      <div className="max-w-md mx-auto my-16 bg-zinc-900 border border-zinc-800 p-8 rounded-2xl text-center space-y-4">
        <Lock className="mx-auto text-amber-500" size={36} />
        <h2 className="text-xl font-bold">Eldukkan Admin Portal</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" placeholder="Enter Security PIN (Default: 123456)" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-center text-white" />
          <button type="submit" className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl">Unlock Dashboard</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-amber-500">Store Management Console</h1>

      <div className="grid md:grid-cols-3 gap-8">
        <form onSubmit={handleAddProduct} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-3">
          <h2 className="text-lg font-bold flex items-center gap-2"><Plus size={18} /> Add New Product</h2>
          <input type="text" placeholder="Product Name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
          <input type="number" step="0.01" placeholder="Price ($)" required value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm">
            <option value="Electronics">Electronics</option>
            <option value="Fashion">Fashion</option>
            <option value="Grocery">Grocery</option>
            <option value="Tech">Tech</option>
          </select>
          <input type="url" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm h-20" />
          <button type="submit" className="w-full py-2.5 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-600">Publish Product</button>
        </form>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Current Inventory ({products.length})</h2>
          <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2">
            {products.map((p) => (
              <div key={p.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  <div>
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    <p className="text-xs text-amber-500">${p.price} • {p.category}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-bold pt-4">Recent Customer Orders ({orders.length})</h2>
          <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>{o.customer_name} ({o.customer_phone})</span>
                  <span>${o.total}</span>
                </div>
                <p className="text-zinc-400">Method: <span className="uppercase text-white">{o.payment_method}</span> | Ref: {o.payment_reference || 'N/A'}</p>
                <p className="text-zinc-500">{o.address}, {o.city}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};