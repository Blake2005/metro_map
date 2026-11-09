import {useState, useEffect, useCallback} from "react";
import { isInteger } from './HelperFuncs';
import './Sidebar.css';
import RouteInput from './RouteInput';
import RouteList from './RouteList';

// Sidebar component that loads the tracked routes and renders the add input and the route list.
// Input:  onRoutesChanged - callback invoked after a route is added so the map can refresh.
//        onRouteDeleted - callback invoked after a route is deleted so the map can remove it immediately.
// Output: JSX - aside containing the route input and the tracked route list.

type SidebarProps = {
    onRoutesChanged?: () => void;
    onRouteDeleted?: (rid: string) => void;
};

export default function Sidebar({ onRoutesChanged, onRouteDeleted }: SidebarProps)  {
    const [routes, setRoutes] = useState({});

    // Fetches the currently tracked routes from the backend and stores them in state.
    // Input:  None - no arguments, uses the backend API.
    // Output: Promise<void> - resolves once the fetch finished and the state was updated.

    const fetchRoutes = useCallback(async () => {
        const res = await fetch("/api/tracked_routes");
        const data = await res.json();
        setRoutes(data);
    }, []);

    // Refreshes the tracked routes list and notifies the parent after a route is added.
    // Input:  None - uses the RouteInput success callback.
    // Output: None - triggers a route list refresh and the optional map refresh callback.

    const handleRouteAdded = useCallback(() => {
        void fetchRoutes();
        onRoutesChanged?.();
    }, [fetchRoutes, onRoutesChanged]);

    // Removes a tracked route through the backend and notifies the parent so the map can update.
    // Input:  rid - route id (as a string) to remove from tracking.
    // Output: Promise<void> - resolves after the request is handled; errors are caught and logged.

    const deleteRoute = useCallback(async (rid: string) => {
        if(!isInteger(rid)){
            console.log("Invalid Input");
            return;
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Signals the server what data format to expect
            },
            body: JSON.stringify({
                route: rid,
            })
        };

        try {
            await fetch('/api/remove_tracked_route', requestOptions);
        } catch (err) {
            console.error("Failed to remove route", err);
            return;
        }

        void fetchRoutes();
        onRouteDeleted?.(rid);
    }, [fetchRoutes, onRouteDeleted]);

    // Loads the tracked routes from the backend when the component mounts.
    // Initial load
    useEffect(() => {
        fetchRoutes();
    }, [fetchRoutes]);

    return(
         <aside className="sidebar">
          <RouteInput onRouteInput={handleRouteAdded} />

          <h2 className="sidebar-heading">Routes</h2>
          <RouteList routes={routes} onRouteDeletion={deleteRoute}/>
        </aside>
    )
}