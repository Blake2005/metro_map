import './Sidebar.css';
import { useCallback } from 'react';
import { isInteger } from './HelperFuncs';
import { ICON_COLORS } from './Constants';

// Route list component that displays the currently tracked routes and allows removing one.
// Input:  routes - object mapping route id -> route name of the tracked routes.
// Output: JSX - list of tracked routes with a delete button each.

export default function RouteList({ routes }: {routes: Object}){

    // Deletes the given route through the backend remove endpoint and refreshes the list on success.
    // Input:  rid - route id (as a string) to remove from tracking.
    // Output: Promise<void> - resolves once the request completes, errors are caught and logged.

    const deleteRoute = useCallback(async (rid:string) => {
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
        }
    }, []);

    return(
        <ul className="route-list">
            {Object.entries(routes).map(([id, name]) => (
                <li key={id}
                style={{
                    border: '2px solid',
                    borderColor: ICON_COLORS[name] || ICON_COLORS['DEFAULT'],
                    margin: '8px 0',
                    padding: '10px',
                }}>
                {name} (ID: {id})
                <button onClick={() => deleteRoute(id)}>Delete</button>
                </li>
            ))}
        </ul>
    )
}