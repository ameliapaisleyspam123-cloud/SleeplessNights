import React, { useState } from 'react';

function CreateShop() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState([{ name: '', price: 0 }]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('/api/shops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, items }),
    })
      .then((response) => response.json())
      .then((data) => console.log('Shop created:', data))
      .catch((error) => console.error('Error creating shop:', error));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create Shop</h1>
      <label>Shop Name:</label>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <label>Description:</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} />
      <h2>Items</h2>
      {items.map((item, index) => (
        <div key={index}>
          <input
            placeholder="Item Name"
            value={item.name}
            onChange={(e) =>
              setItems(items.map((it, i) => (i === index ? { ...it, name: e.target.value } : it)))
            }
          />
          <input
            placeholder="Price"
            type="number"
            value={item.price}
            onChange={(e) =>
              setItems(items.map((it, i) => (i === index ? { ...it, price: +e.target.value } : it)))
            }
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { name: '', price: 0 }])}
      >
        Add Item
      </button>
      <button type="submit">Create Shop</button>
    </form>
  );
}

export default CreateShop;