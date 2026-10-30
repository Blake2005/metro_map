import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'
import TrainMap from './TrainMap'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

// Root React component that composes the map, navbar and sidebar for the metro map page.
// Input:  None - renders the main application layout.
// Output: JSX - the app layout containing the map pane and the sidebar.

function App() {
  return (
    <div className='app'>
      <Navbar/>
      <div className="content">
        <div className="map-pane">
          <TrainMap />
        </div>
        <div>
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

export default App
