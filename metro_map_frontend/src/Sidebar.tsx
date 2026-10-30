import {useState, useEffect, useCallback} from "react";
import './Sidebar.css';
import RouteInput from './RouteInput';
import RouteList from './RouteList';

// Sidebar component that loads the tracked routes and renders the add input and the route list.
// Input:  None - fetches the tracked routes from the backend.
// Output: JSX - aside containing the route input and the tracked route list.

export default function Sidebar()  {
    const [routes, setRoutes] = useState({});

    // Fetches the currently tracked routes from the backend and stores them in state.
    // Input:  None - no arguments, uses the backend API.
    // Output: Promise<void> - resolves once the fetch finished and the state was updated.

    const fetchRoutes = useCallback(async () => {
        const res = await fetch("/api/tracked_routes");
        const data = await res.json();
        setRoutes(data);
    }, []);

    // Loads the tracked routes from the backend when the component mounts.
    // Initial load
    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    return(
         <aside className="sidebar">
          <RouteInput onRouteInput={fetchRoutes} />

          <h2 className="sidebar-heading">Routes</h2>
          <RouteList routes={routes} />
        </aside>
    )

    // State var 'routes'

    // Function 1 (update state) useCallback 
    // so that it doesn't rerender everytime
    // sets routes

    // useEffect calls Function1 on load
    // (and whenever Function1 changes
    // but it wont)

    // Ele1 (state modifying input) takes in 
    // function 1 and calls it on form 
    // submission

    // Ele2 (displays state)
    // takes in state and displays it


}