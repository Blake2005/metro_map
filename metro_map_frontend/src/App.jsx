import { useCallback, useRef } from 'react'
import './App.css'
import TrainMap from './TrainMap'
import Navbar from './Navbar'
import Sidebar from './Sidebar'

// Root React component that composes the map, navbar and sidebar for the metro map page.
// Input:  None - renders the main application layout.
// Output: JSX - the app layout containing the map pane and the sidebar.

function App() {

  const mapRef = useRef(null);

  // Refreshes map route shapes and vehicle positions after tracked routes change.
  // Input:  None - uses the TrainMap imperative handle.
  // Output: None - triggers refetches on the map.

  const handleRoutesChanged = useCallback(() => {
    void mapRef.current?.reloadRouteShapes();
    void mapRef.current?.refreshVehicles();
  }, []);

  // Removes a route from the map immediately after a successful backend deletion.
  // Input:  rid - route id that was removed from tracking.
  // Output: None - triggers an optimistic map update and refetch.

  const handleRouteDeleted = useCallback((rid) => {
    void mapRef.current?.removeRoute(rid);
  }, []);

  return (
    <div className='app'>
      <Navbar/>
      <div className="content">
        <div className="map-pane">
          <TrainMap ref={mapRef} />
        </div>
        <div>
          <Sidebar onRoutesChanged={handleRoutesChanged} onRouteDeleted={handleRouteDeleted} />
        </div>
      </div>
    </div>
  );
}

export default App
