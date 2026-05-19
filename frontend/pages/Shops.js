import React from 'react';
import ShopManager from '../components/Shop/ShopManager';
import ShopList from '../components/Shop/ShopList';

function Shops({ isDM }) {
  return (
    <div>
      <h1>Shops</h1>
      {isDM ? <ShopManager /> : <ShopList />} {/* Show ShopManager for DM, ShopList for Players */}
    </div>
  );
}

export default Shops;