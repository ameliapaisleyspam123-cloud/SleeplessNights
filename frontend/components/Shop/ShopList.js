import React, { useState, useEffect } from 'react';

function ShopList() {
  const [shops, setShops] = useState([]);

  useEffect(() => {
    fetch('/api/shops')
      .then((response) => response.json())
      .then((data) => setShops(data))
      .catch((error) => console.error('Error fetching shops:', error));
  }, []);

  return (
    <div>
      <h1>Shops</h1>
      <ul>
        {shops.map((shop) => (
          <li key={shop._id}>
            <h2>{shop.name}</h2>
            <p>{shop.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ShopList;